import type { CatalogProduct } from "@/types/catalog";
import type { BlingProductSummary } from "@/services/api/bling.types";
import { listActiveProductsPage } from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";

/** Tamanho de página na importação inicial — alinhado à API Bling. */
export const IMPORT_PAGE_SIZE = 100;

/**
 * Mapeia produtos da listagem sem buscar variações na API.
 * Variações e estoque detalhado são enriquecidos depois via webhooks.
 * Evita N+1 chamadas (/produtos/{id}/variacoes) que estouram o timeout serverless.
 */
function mapBlingRowsForInitialImport(
  rows: BlingProductSummary[],
): CatalogProduct[] {
  const catalogRows = rows.filter((r) => !isVariationChild(r));
  const products: CatalogProduct[] = [];

  for (const row of catalogRows) {
    const mapped = mapBlingProductToCatalog(row, [], undefined, undefined);
    if (mapped) products.push(mapped);
  }

  return products;
}

/** Uma página da API Bling mapeada para upsert no cache. */
export async function fetchCatalogProductsPageFromBling(
  page: number,
): Promise<{ rawCount: number; products: CatalogProduct[] }> {
  const rows = await listActiveProductsPage(page, IMPORT_PAGE_SIZE);
  const products = mapBlingRowsForInitialImport(rows);
  return { rawCount: rows.length, products };
}
