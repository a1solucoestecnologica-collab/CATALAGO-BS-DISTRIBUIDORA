import { fetchAllBlingCategoryMap } from "@/services/catalog/bling-category-map";
import { enrichParentProductFromBling } from "@/services/catalog/bling-product-enricher";
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
  const categoryMap = await fetchAllBlingCategoryMap();
  const mapped = await enrichParentProductFromBling(blingProductId, categoryMap);

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
