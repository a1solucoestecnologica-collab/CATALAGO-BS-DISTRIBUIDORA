import {
  getProductById,
  getProductVariations,
  getStockBalances,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";
import {
  inactivateCatalogProduct,
  upsertCatalogProduct,
} from "@/services/sync/catalog-product-repository";

export type ProductSyncOutcome =
  | "created"
  | "updated"
  | "unchanged"
  | "inactivated"
  | "ignored";

function isDeleteEvent(eventName: string): boolean {
  const e = eventName.toLowerCase();
  return (
    e.includes("delete") ||
    e.includes("deleted") ||
    e.includes("exclu") ||
    e.includes("inativ")
  );
}

export function extractWebhookEvent(payload: Record<string, unknown>): string {
  return String(
    payload.event ?? payload.topic ?? payload.evento ?? "unknown",
  );
}

export function extractWebhookProductId(
  payload: Record<string, unknown>,
): string | null {
  const data = payload.data;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.id != null) return String(row.id);
  if (row.produto != null && typeof row.produto === "object") {
    const prod = row.produto as Record<string, unknown>;
    if (prod.id != null) return String(prod.id);
  }
  return null;
}

export async function syncProductFromBling(
  blingProductId: string,
): Promise<ProductSyncOutcome> {
  const detail = await getProductById(blingProductId);

  if (!detail) {
    await inactivateCatalogProduct(blingProductId);
    return "inactivated";
  }

  if (isVariationChild(detail)) {
    const parentId = detail.variacao?.produtoPai?.id;
    if (parentId != null) {
      return syncProductFromBling(String(parentId));
    }
    return "ignored";
  }

  if (detail.situacao && detail.situacao !== "A") {
    await inactivateCatalogProduct(blingProductId);
    return "inactivated";
  }

  const variations = await getProductVariations(blingProductId);
  const stockIds = [
    blingProductId,
    ...variations.map((v) => String(v.id ?? "")).filter(Boolean),
  ];
  const stockMap = await getStockBalances(stockIds);

  const mapped = mapBlingProductToCatalog(
    detail,
    variations,
    stockMap.get(blingProductId),
    stockMap,
  );

  if (!mapped) {
    await inactivateCatalogProduct(blingProductId);
    return "inactivated";
  }

  return upsertCatalogProduct(mapped);
}

export async function processBlingWebhookPayload(
  payload: Record<string, unknown>,
): Promise<{
  evento: string;
  produto: string | null;
  outcome: ProductSyncOutcome | "skipped";
}> {
  const evento = extractWebhookEvent(payload);

  if (isDeleteEvent(evento)) {
    const productId = extractWebhookProductId(payload);
    if (productId) {
      await inactivateCatalogProduct(productId);
      return { evento, produto: productId, outcome: "inactivated" };
    }
    return { evento, produto: null, outcome: "skipped" };
  }

  const productId = extractWebhookProductId(payload);
  if (!productId) {
    return { evento, produto: null, outcome: "skipped" };
  }

  const outcome = await syncProductFromBling(productId);
  return { evento, produto: productId, outcome };
}
