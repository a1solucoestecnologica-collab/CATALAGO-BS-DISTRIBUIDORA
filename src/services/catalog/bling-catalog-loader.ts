import type { CatalogProduct } from "@/types/catalog";
import type { BlingProductSummary } from "@/services/api/bling.types";
import {
  getProductVariationsBatch,
  getStockBalances,
  listActiveProductsPage,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";

async function mapBlingRowsToCatalogProducts(
  rows: BlingProductSummary[],
): Promise<CatalogProduct[]> {
  const catalogRows = rows.filter((r) => !isVariationChild(r));
  if (catalogRows.length === 0) return [];

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

/** Uma página da API Bling (até 100 produtos) mapeada para o catálogo. */
export async function fetchCatalogProductsPageFromBling(
  page: number,
): Promise<{ rawCount: number; products: CatalogProduct[] }> {
  const rows = await listActiveProductsPage(page);
  const products = await mapBlingRowsToCatalogProducts(rows);
  return { rawCount: rows.length, products };
}
