import type { CatalogProduct } from "@/types/catalog";
import {
  getCatalogProductBySlug,
  listActiveCatalogProducts,
} from "@/services/sync/catalog-product-repository";
import {
  getProductById,
  getProductVariations,
  getProductVariationsBatch,
  getStockBalances,
  isBlingConfigured,
  listAllActiveProducts,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";

export type CatalogLoadResult =
  | { ok: true; products: CatalogProduct[] }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "bling_error"; message: string };

export async function getCatalogConfigurationStatus(): Promise<
  "configured" | "not_configured"
> {
  return (await isBlingConfigured()) ? "configured" : "not_configured";
}

async function loadCatalogProductsFromBling(): Promise<CatalogProduct[]> {
  const rows = await listAllActiveProducts();
  const catalogRows = rows.filter((r) => !isVariationChild(r));
  const ids = catalogRows.map((r) => String(r.id));

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
  for (const row of catalogRows) {
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

async function loadCatalogProducts(): Promise<CatalogProduct[]> {
  try {
    const cached = await listActiveCatalogProducts();
    if (cached.length > 0) return cached;
  } catch (e) {
    console.warn(
      "[products] cache indisponível, usando Bling:",
      e instanceof Error ? e.message : e,
    );
  }
  return loadCatalogProductsFromBling();
}

export async function getProducts(): Promise<CatalogLoadResult> {
  if (!(await isBlingConfigured())) {
    return { ok: false, reason: "not_configured" };
  }
  try {
    const products = await loadCatalogProducts();
    return { ok: true, products };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao carregar produtos do Bling.";
    return { ok: false, reason: "bling_error", message };
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  if (!(await isBlingConfigured())) return null;

  try {
    const cached = await getCatalogProductBySlug(slug);
    if (cached) return cached;
  } catch {
    // fallback Bling
  }

  const detail = await getProductById(slug);
  if (!detail) return null;

  const variations = await getProductVariations(slug);
  const stockIds = [
    slug,
    ...variations.map((v) => String(v.id ?? "")).filter(Boolean),
  ];
  const stockMap = await getStockBalances(stockIds);
  return mapBlingProductToCatalog(
    detail,
    variations,
    stockMap.get(slug),
    stockMap,
  );
}
