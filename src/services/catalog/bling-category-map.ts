import {
  getProductCategoryById,
  listAllProductCategories,
  type BlingProductCategoryRow,
} from "@/services/api/bling-client";
import type { BlingProductSummary } from "@/services/api/bling.types";
import type { CatalogCategory } from "@/types/catalog";

export type BlingCategoryMap = Map<string, string>;

function categoryLabel(row: BlingProductCategoryRow): string | null {
  const name = row.descricao?.trim() || row.nome?.trim();
  return name || null;
}

/** Mapa id → nome de todas as categorias de produtos no Bling. */
export async function fetchAllBlingCategoryMap(): Promise<BlingCategoryMap> {
  const rows = await listAllProductCategories();
  const map: BlingCategoryMap = new Map();
  for (const row of rows) {
    if (row.id == null) continue;
    const label = categoryLabel(row);
    if (label) map.set(String(row.id), label);
  }
  return map;
}

const SEM_CATEGORIA: CatalogCategory = {
  bling_category_id: "sem-categoria",
  name: "Sem categoria",
};

/** Resolve categoria com mapa global + busca individual para IDs órfãos. */
export async function resolveBlingCategory(
  row: BlingProductSummary,
  categoryMap: BlingCategoryMap,
  orphanCache: BlingCategoryMap = new Map(),
): Promise<CatalogCategory> {
  const cat = row.categoria;
  const rawId = cat?.id;
  if (rawId == null || String(rawId) === "0") {
    return SEM_CATEGORIA;
  }

  const id = String(rawId);
  const inline = cat?.descricao?.trim() || cat?.nome?.trim();
  if (inline) return { bling_category_id: id, name: inline };

  const cached = categoryMap.get(id) ?? orphanCache.get(id);
  if (cached) return { bling_category_id: id, name: cached };

  const remote = await getProductCategoryById(id);
  const remoteName = remote ? categoryLabel(remote) : null;
  if (remoteName) {
    orphanCache.set(id, remoteName);
    return { bling_category_id: id, name: remoteName };
  }

  return SEM_CATEGORIA;
}
