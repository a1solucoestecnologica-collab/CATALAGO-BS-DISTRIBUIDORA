import {
  getProductById,
  getProductVariations,
  getStockBalances,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";
import type { CatalogProduct } from "@/types/catalog";
import type { BlingCategoryMap } from "@/services/catalog/bling-category-map";

/**
 * Carrega produto pai completo: detalhe, variações, estoque e categorias resolvidas.
 * Usado na importação incremental e nos webhooks.
 */
export async function enrichParentProductFromBling(
  blingProductId: string,
  categoryMap: BlingCategoryMap,
): Promise<CatalogProduct | null> {
  const detail = await getProductById(blingProductId);

  if (!detail) return null;

  if (isVariationChild(detail)) {
    const parentId = detail.variacao?.produtoPai?.id;
    if (parentId != null) {
      return enrichParentProductFromBling(String(parentId), categoryMap);
    }
    return null;
  }

  if (detail.situacao && detail.situacao !== "A") return null;

  const variations = await getProductVariations(blingProductId);
  const stockIds = [
    blingProductId,
    ...variations.map((v) => String(v.id ?? "")).filter(Boolean),
  ];
  const stockMap = await getStockBalances(stockIds);

  return mapBlingProductToCatalog(
    detail,
    variations,
    stockMap.get(blingProductId),
    stockMap,
    categoryMap,
  );
}
