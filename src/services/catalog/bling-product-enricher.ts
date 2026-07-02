import {
  getProductById,
  getStockBalances,
  resolveProductVariations,
} from "@/services/api/bling-client";
import {
  isVariationChild,
  mapBlingProductToCatalog,
} from "@/services/api/bling-mapper";
import type { CatalogProduct } from "@/types/catalog";
import type { BlingCategoryMap } from "@/services/catalog/bling-category-map";
import { resolveBlingCategory } from "@/services/catalog/bling-category-map";

/**
 * Carrega produto pai completo: detalhe, variações, estoque e categorias resolvidas.
 * Usado na importação incremental e nos webhooks.
 */
export async function enrichParentProductFromBling(
  blingProductId: string,
  categoryMap: BlingCategoryMap,
  orphanCategoryCache: BlingCategoryMap = new Map(),
): Promise<CatalogProduct | null> {
  const detail = await getProductById(blingProductId);

  if (!detail) return null;

  if (isVariationChild(detail)) {
    const parentId = detail.variacao?.produtoPai?.id;
    if (parentId != null) {
      return enrichParentProductFromBling(
        String(parentId),
        categoryMap,
        orphanCategoryCache,
      );
    }
    return null;
  }

  if (detail.situacao && detail.situacao !== "A") return null;

  const variations = await resolveProductVariations(blingProductId, detail);
  const stockIds = [
    blingProductId,
    ...variations.map((v) => String(v.id ?? "")).filter(Boolean),
  ];
  const stockMap = await getStockBalances(stockIds);
  const category = await resolveBlingCategory(
    detail,
    categoryMap,
    orphanCategoryCache,
  );

  return mapBlingProductToCatalog(
    detail,
    variations,
    stockMap.get(blingProductId),
    stockMap,
    categoryMap,
    category,
  );
}
