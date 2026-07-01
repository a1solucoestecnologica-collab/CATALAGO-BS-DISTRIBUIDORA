import type { CatalogProduct } from "@/types/catalog";
import type { BlingProductSummary } from "@/services/api/bling.types";
import { listActiveProductsPage } from "@/services/api/bling-client";
import { isVariationChild } from "@/services/api/bling-mapper";
import { enrichParentProductFromBling } from "@/services/catalog/bling-product-enricher";
import type { BlingCategoryMap } from "@/services/catalog/bling-category-map";

/** Tamanho de página na importação inicial — alinhado à API Bling. */
export const IMPORT_PAGE_SIZE = 100;

/** Pais enriquecidos por invocação serverless (detalhe + variações + estoque). */
export const PARENT_BATCH_SIZE = 4;

export function getParentIdsFromListPage(
  rows: BlingProductSummary[],
): string[] {
  return rows
    .filter((r) => !isVariationChild(r))
    .map((r) => String(r.id));
}

/** Lista IDs de produtos pai em uma página da API Bling. */
export async function listParentIdsPage(
  page: number,
): Promise<{ rawCount: number; parentIds: string[] }> {
  const rows = await listActiveProductsPage(page, IMPORT_PAGE_SIZE);
  return { rawCount: rows.length, parentIds: getParentIdsFromListPage(rows) };
}

/** Enriquece um lote de produtos pai (detalhe, variações, estoque, categorias). */
export async function enrichParentBatchFromBling(
  parentIds: string[],
  categoryMap: BlingCategoryMap,
): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];
  for (const id of parentIds) {
    const mapped = await enrichParentProductFromBling(id, categoryMap);
    if (mapped) products.push(mapped);
  }
  return products;
}
