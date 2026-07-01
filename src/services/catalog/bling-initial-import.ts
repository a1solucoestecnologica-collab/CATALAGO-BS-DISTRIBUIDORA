import {
  enrichParentBatchFromBling,
  listParentIdsPage,
  PARENT_BATCH_SIZE,
} from "@/services/catalog/bling-catalog-loader";
import { fetchAllBlingCategoryMap } from "@/services/catalog/bling-category-map";
import {
  upsertCatalogProduct,
} from "@/services/sync/catalog-product-repository";
import {
  completeInitialImport,
  createWebhookLog,
  getInitialImportProgress,
  hasInitialImportCompleted,
  saveInitialImportProgress,
} from "@/services/webhook/webhook-log-repository";
import {
  CURRENT_IMPORT_VERSION,
  INITIAL_IMPORT_EVENT,
  type InitialImportProgressPayload,
} from "@/services/webhook/types";

export function shouldRunInitialImport(importAlreadyCompleted: boolean): boolean {
  return !importAlreadyCompleted;
}

export type InitialImportStats = {
  importVersion: number;
  productsFetched: number;
  productsCreated: number;
  productsUpdated: number;
  productsUnchanged: number;
  durationMs: number;
};

export type InitialImportStepResult =
  | { status: "skipped" }
  | {
      status: "in_progress";
      nextPage: number;
      batchOffset: number;
      productsInBatch: number;
    }
  | { status: "complete"; stats: InitialImportStats }
  | { status: "error"; message: string };

function categoryMapFromProgress(
  record?: Record<string, string>,
): Map<string, string> {
  return record ? new Map(Object.entries(record)) : new Map();
}

function categoryMapToRecord(map: Map<string, string>): Record<string, string> {
  return Object.fromEntries(map);
}

function normalizeImportProgress(
  progress: InitialImportProgressPayload | null,
): InitialImportProgressPayload | null {
  if (!progress) return null;
  if (progress.importVersion !== CURRENT_IMPORT_VERSION) return null;
  return progress;
}

/**
 * Processa um lote de produtos pai por invocação (adequado para serverless).
 * A importação completa ocorre em múltiplas chamadas até registrar initial_import v2.
 */
export async function runInitialImportStep(): Promise<InitialImportStepResult> {
  if (await hasInitialImportCompleted()) {
    return { status: "skipped" };
  }

  const progress = normalizeImportProgress(await getInitialImportProgress());
  const startedAt = progress?.startedAt ?? Date.now();
  const page = progress?.nextPage ?? 1;
  let batchOffset = progress?.batchOffset ?? 0;
  let parentIds = progress?.pageParentIds;
  let categoryMap = categoryMapFromProgress(progress?.categoryMap);

  try {
    if (!parentIds) {
      if (categoryMap.size === 0) {
        categoryMap = await fetchAllBlingCategoryMap();
      }

      const { rawCount, parentIds: ids } = await listParentIdsPage(page);

      if (rawCount === 0) {
        const stats: InitialImportStats = {
          importVersion: CURRENT_IMPORT_VERSION,
          productsFetched: progress?.productsMapped ?? 0,
          productsCreated: progress?.productsCreated ?? 0,
          productsUpdated: progress?.productsUpdated ?? 0,
          productsUnchanged: progress?.productsUnchanged ?? 0,
          durationMs: Date.now() - startedAt,
        };

        await completeInitialImport(
          stats as unknown as Record<string, unknown>,
        );

        console.log("[bling/initial-import] concluída", stats);
        return { status: "complete", stats };
      }

      parentIds = ids;
      batchOffset = 0;
    }

    const batch = parentIds.slice(batchOffset, batchOffset + PARENT_BATCH_SIZE);
    const products = await enrichParentBatchFromBling(batch, categoryMap);

    let productsCreated = progress?.productsCreated ?? 0;
    let productsUpdated = progress?.productsUpdated ?? 0;
    let productsUnchanged = progress?.productsUnchanged ?? 0;
    let productsMapped = progress?.productsMapped ?? 0;

    for (const product of products) {
      const outcome = await upsertCatalogProduct(product);
      if (outcome === "created") productsCreated += 1;
      else if (outcome === "updated") productsUpdated += 1;
      else productsUnchanged += 1;
    }
    productsMapped += products.length;

    const newOffset = batchOffset + batch.length;
    const pageDone = newOffset >= parentIds.length;

    if (pageDone) {
      await saveInitialImportProgress({
        importVersion: CURRENT_IMPORT_VERSION,
        nextPage: page + 1,
        batchOffset: 0,
        categoryMap: categoryMapToRecord(categoryMap),
        pagesCompleted: page,
        productsCreated,
        productsUpdated,
        productsUnchanged,
        productsMapped,
        startedAt,
      });

      console.log(
        `[bling/initial-import] página ${page} ok batch=${products.length} total=${productsMapped}`,
      );

      return {
        status: "in_progress",
        nextPage: page + 1,
        batchOffset: 0,
        productsInBatch: products.length,
      };
    }

    await saveInitialImportProgress({
      importVersion: CURRENT_IMPORT_VERSION,
      nextPage: page,
      batchOffset: newOffset,
      pageParentIds: parentIds,
      categoryMap: categoryMapToRecord(categoryMap),
      pagesCompleted: progress?.pagesCompleted ?? 0,
      productsCreated,
      productsUpdated,
      productsUnchanged,
      productsMapped,
      startedAt,
    });

    console.log(
      `[bling/initial-import] página ${page} lote offset=${newOffset} mapped=${products.length} total=${productsMapped}`,
    );

    return {
      status: "in_progress",
      nextPage: page,
      batchOffset: newOffset,
      productsInBatch: products.length,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro na importação inicial do Bling.";
    console.error(`[bling/initial-import] erro página ${page}:`, message);

    if (!(await hasInitialImportCompleted())) {
      try {
        await createWebhookLog({
          evento: INITIAL_IMPORT_EVENT,
          payload: {
            page,
            batchOffset,
            importVersion: CURRENT_IMPORT_VERSION,
            durationMs: Date.now() - startedAt,
          },
          status: "error",
          erro: message,
        });
      } catch (logErr) {
        console.error("[bling/initial-import] falha ao registrar log:", logErr);
      }
    }

    return { status: "error", message };
  }
}

/** Dispara o primeiro passo da importação (OAuth callback). */
export async function runInitialImportIfNeeded(): Promise<InitialImportStepResult> {
  const importDone = await hasInitialImportCompleted();

  if (!shouldRunInitialImport(importDone)) {
    return { status: "skipped" };
  }

  return runInitialImportStep();
}
