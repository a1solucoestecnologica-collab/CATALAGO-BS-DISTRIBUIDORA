import {
  listAllProductCategories,
  type BlingProductCategoryRow,
} from "@/services/api/bling-client";

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
