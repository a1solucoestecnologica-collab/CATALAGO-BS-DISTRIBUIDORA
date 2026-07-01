import {
  getProductVariationsBatch,
  getStockBalances,
  isBlingConfigured,
  listAllActiveParentProductIds,
  listAllActiveProducts,
  listProductsChangedSince,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";
import type { CatalogProduct } from "@/types/catalog";
import {
  countActiveProducts,
  inactivateProductsNotInSet,
  listStoredProductIds,
  upsertCatalogProduct,
} from "@/services/sync/catalog-product-repository";
import {
  computeNextSyncAt,
  createSyncLog,
  finishSyncLog,
  getSyncState,
  releaseSyncLock,
  tryAcquireSyncLock,
} from "@/services/sync/sync-repository";
import type { SyncRunResult, SyncTriggerSource } from "@/services/sync/types";
import { BLING_INTEGRATION_ID } from "@/services/sync/types";

async function mapBlingRowsToCatalog(
  catalogRows: Awaited<ReturnType<typeof listAllActiveProducts>>,
): Promise<CatalogProduct[]> {
  const parents = catalogRows.filter((r) => !isVariationChild(r));
  const ids = parents.map((r) => String(r.id));

  const [stockMap, variationsMap] = await Promise.all([
    getStockBalances(ids),
    getProductVariationsBatch(ids, 10),
  ]);

  const allVariationIds: string[] = [];
  for (const vars of variationsMap.values()) {
    for (const v of vars) {
      const vid = String(v.id ?? "");
      if (vid) allVariationIds.push(vid);
    }
  }
  const variationStockMap = await getStockBalances([
    ...new Set(allVariationIds),
  ]);

  const products: CatalogProduct[] = [];
  for (const row of parents) {
    const id = String(row.id);
    const variations = variationsMap.get(id) ?? [];
    const mapped = mapBlingProductToCatalog(
      row,
      variations,
      stockMap.get(id),
      variationStockMap,
    );
    if (mapped) products.push(mapped);
  }
  return products;
}

async function resolveProductsToSync(
  lastSuccessAt: string | null,
): Promise<{ products: CatalogProduct[]; mode: "incremental" | "full" }> {
  const allRows = await listAllActiveProducts();
  const parents = allRows.filter((r) => !isVariationChild(r));

  if (!lastSuccessAt) {
    const products = await mapBlingRowsToCatalog(allRows);
    return { products, mode: "full" };
  }

  const since = new Date(lastSuccessAt);
  const changed = await listProductsChangedSince(since);

  if (changed === null) {
    console.log("[bling-sync] incremental não suportado — sync completa");
    const products = await mapBlingRowsToCatalog(allRows);
    return { products, mode: "full" };
  }

  const changedParentIds = new Set(
    changed
      .filter((r) => !isVariationChild(r))
      .map((r) => String(r.id)),
  );

  const stored = await listStoredProductIds();
  const newIds = parents
    .map((r) => String(r.id))
    .filter((id) => !stored.has(id));

  const idsToRefresh = new Set([...changedParentIds, ...newIds]);

  if (idsToRefresh.size === 0) {
    return { products: [], mode: "incremental" };
  }

  const rowsToMap = parents.filter((r) => idsToRefresh.has(String(r.id)));
  const products = await mapBlingRowsToCatalog(rowsToMap);
  return { products, mode: "incremental" };
}

export async function runBlingCatalogSync(
  trigger: SyncTriggerSource,
): Promise<SyncRunResult> {
  const started = Date.now();
  console.log(`[bling-sync] início trigger=${trigger}`);

  if (!(await isBlingConfigured())) {
    return { ok: false, error: "Bling não configurado." };
  }

  const acquired = await tryAcquireSyncLock();
  if (!acquired) {
    console.log("[bling-sync] ignorado — sincronização já em andamento");
    return {
      ok: true,
      skipped: true,
      logId: "skipped",
      productsFetched: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsInactivated: 0,
      durationMs: 0,
    };
  }

  const logId = await createSyncLog(trigger);
  let productsFetched = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let productsInactivated = 0;

  try {
    const state = await getSyncState();
    const { products, mode } = await resolveProductsToSync(
      state?.last_success_at ?? null,
    );
    productsFetched = products.length;

    for (const product of products) {
      const result = await upsertCatalogProduct(product);
      if (result === "created") productsCreated += 1;
      else if (result === "updated") productsUpdated += 1;
    }

    const activeIds = await listAllActiveParentProductIds();
    productsInactivated = await inactivateProductsNotInSet(
      new Set(activeIds),
    );

    const productCount = await countActiveProducts();
    const finished = Date.now();
    const durationMs = finished - started;

    await finishSyncLog(logId, {
      status: "success",
      duration_ms: durationMs,
      products_fetched: productsFetched,
      products_created: productsCreated,
      products_updated: productsUpdated,
      products_inactivated: productsInactivated,
      metadata: { mode },
    });

    await releaseSyncLock(BLING_INTEGRATION_ID, {
      last_success_at: new Date().toISOString(),
      next_sync_at: computeNextSyncAt(),
      last_error: null,
      product_count: productCount,
    });

    console.log(
      `[bling-sync] fim ok duration=${durationMs}ms fetched=${productsFetched} created=${productsCreated} updated=${productsUpdated} inactivated=${productsInactivated}`,
    );

    return {
      ok: true,
      logId,
      productsFetched,
      productsCreated,
      productsUpdated,
      productsInactivated,
      durationMs,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro na sincronização.";
    const durationMs = Date.now() - started;
    console.error("[bling-sync] erro:", message);

    await finishSyncLog(logId, {
      status: "error",
      duration_ms: durationMs,
      products_fetched: productsFetched,
      products_created: productsCreated,
      products_updated: productsUpdated,
      products_inactivated: productsInactivated,
      error_message: message,
    });

    await releaseSyncLock(BLING_INTEGRATION_ID, {
      next_sync_at: computeNextSyncAt(),
      last_error: message,
    });

    return { ok: false, error: message, logId };
  }
}
