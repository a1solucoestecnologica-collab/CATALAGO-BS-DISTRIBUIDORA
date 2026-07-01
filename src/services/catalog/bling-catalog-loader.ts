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
import {
  isInitialImportLogging,
  logInitialImport,
  logInitialImportError,
} from "@/services/catalog/initial-import-log";

async function mapBlingRowsToCatalogProducts(
  rows: BlingProductSummary[],
): Promise<CatalogProduct[]> {
  const catalogRows = rows.filter((r) => !isVariationChild(r));
  if (catalogRows.length === 0) return [];

  const ids = catalogRows.map((r) => String(r.id));

  if (isInitialImportLogging()) {
    logInitialImport("mapeamento: buscando estoque e variações", {
      parentCount: catalogRows.length,
    });
  }

  let stockMap: Map<string, number>;
  let variationsMap: Map<string, import("@/services/api/bling.types").BlingProductVariation[]>;

  try {
    [stockMap, variationsMap] = await Promise.all([
      getStockBalances(ids),
      getProductVariationsBatch(ids, 10),
    ]);
  } catch (e) {
    logInitialImportError("getStockBalances/getProductVariationsBatch", e);
    throw e;
  }

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
  if (isInitialImportLogging()) {
    logInitialImport("3. primeira chamada GET /produtos", { page });
  }

  let rows: BlingProductSummary[];
  try {
    rows = await listActiveProductsPage(page);
  } catch (e) {
    logInitialImportError("listActiveProductsPage", e);
    throw e;
  }

  if (isInitialImportLogging()) {
    logInitialImport("produtos brutos recebidos da API", {
      page,
      rawCount: rows.length,
    });
  }

  let products: CatalogProduct[];
  try {
    products = await mapBlingRowsToCatalogProducts(rows);
  } catch (e) {
    logInitialImportError("mapBlingRowsToCatalogProducts", e);
    throw e;
  }

  return { rawCount: rows.length, products };
}
