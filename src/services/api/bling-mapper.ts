import type {
  BlingProductSummary,
  BlingProductVariation,
} from "@/services/api/bling.types";
import { parseBlingMoney } from "@/services/api/bling-client";
import type {
  BlingTechnicalIds,
  CatalogCategory,
  CatalogProduct,
  CatalogVariantOption,
  VariantVisual,
} from "@/types/catalog";

const PLACEHOLDER_IMAGE = "";

function slugFromId(id: string): string {
  return id;
}

function isValidImageUrl(url: string | undefined): url is string {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function extractImages(
  row: BlingProductSummary | BlingProductVariation,
): string[] {
  const fromMedia =
    row.midia?.imagens?.internas ?? row.midia?.imagens?.imagensURL ?? [];
  const urls = fromMedia
    .map((im) => im.link)
    .filter((x): x is string => isValidImageUrl(x));

  if (urls.length > 0) return urls;

  const imagemURL =
    "imagemURL" in row ? (row as BlingProductSummary).imagemURL : undefined;
  if (isValidImageUrl(imagemURL)) return [imagemURL];

  return [];
}

function resolveStock(
  row: BlingProductSummary | BlingProductVariation,
  stockOverride?: number,
): number {
  if (stockOverride != null && Number.isFinite(stockOverride)) {
    return stockOverride;
  }
  const s = row.estoque?.saldoVirtualTotal;
  return s != null && Number.isFinite(Number(s)) ? Number(s) : 0;
}

function resolveBrand(row: BlingProductSummary): {
  name?: string;
  id?: string;
} {
  const m = row.marca;
  if (!m) return {};
  if (typeof m === "string") return { name: m };
  return {
    id: m.id != null ? String(m.id) : undefined,
    name: m.descricao?.trim() || m.nome?.trim(),
  };
}

export function resolveCategory(
  row: BlingProductSummary,
  categoryMap?: Map<string, string>,
): CatalogCategory {
  const cat = row.categoria;
  if (cat?.id == null) {
    return { bling_category_id: "sem-categoria", name: "Sem categoria" };
  }
  const id = String(cat.id);
  const name =
    cat.descricao?.trim() ||
    cat.nome?.trim() ||
    categoryMap?.get(id) ||
    `Categoria ${id}`;
  return { bling_category_id: id, name };
}

function parseVariationName(nome?: string): VariantVisual {
  const visual: VariantVisual = {};
  if (!nome) return visual;
  const parts = nome
    .split(/[|;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const [key, ...rest] = part.split(":");
    if (!key || rest.length === 0) continue;
    const k = key.trim().toLowerCase();
    const v = rest.join(":").trim();
    if (k.includes("cor")) visual.color = v;
    else if (k.includes("tamanho") || k === "tam") visual.size = v;
    else if (k.includes("modelo")) visual.model = v;
    else visual[k] = v;
  }
  return visual;
}

function buildAttributeIds(
  attrs: BlingProductVariation["atributos"],
): Record<string, string> | undefined {
  if (!attrs?.length) return undefined;
  const out: Record<string, string> = {};
  for (const a of attrs) {
    const key = a.nome?.trim();
    const id = a.id != null ? String(a.id) : undefined;
    if (key && id) out[key] = id;
  }
  return Object.keys(out).length ? out : undefined;
}

function mapAttributeIdsToTechnical(
  attrIds: Record<string, string> | undefined,
  visual: VariantVisual,
): Pick<
  BlingTechnicalIds,
  "bling_color_id" | "bling_size_id" | "bling_model_id" | "bling_attribute_ids"
> {
  if (!attrIds) return { bling_attribute_ids: undefined };
  let bling_color_id: string | undefined;
  let bling_size_id: string | undefined;
  let bling_model_id: string | undefined;
  for (const [name, id] of Object.entries(attrIds)) {
    const n = name.toLowerCase();
    if (n.includes("cor")) bling_color_id = id;
    else if (n.includes("tamanho") || n === "tam") bling_size_id = id;
    else if (n.includes("modelo")) bling_model_id = id;
  }
  if (!bling_color_id && visual.color) {
    const key = Object.keys(attrIds).find((k) =>
      k.toLowerCase().includes("cor"),
    );
    if (key) bling_color_id = attrIds[key];
  }
  if (!bling_size_id && visual.size) {
    const key = Object.keys(attrIds).find((k) =>
      k.toLowerCase().includes("tamanho"),
    );
    if (key) bling_size_id = attrIds[key];
  }
  if (!bling_model_id && visual.model) {
    const key = Object.keys(attrIds).find((k) =>
      k.toLowerCase().includes("modelo"),
    );
    if (key) bling_model_id = attrIds[key];
  }
  return {
    bling_attribute_ids: attrIds,
    bling_color_id,
    bling_size_id,
    bling_model_id,
  };
}

function buildTechnicalForParent(row: BlingProductSummary): BlingTechnicalIds {
  const id = String(row.id ?? "");
  const codigo = row.codigo?.trim() || id;
  return {
    bling_product_id: id,
    sku: codigo,
    codigo,
    barcode: row.gtin?.trim() || undefined,
  };
}

function buildTechnicalForVariant(
  parentId: string,
  row: BlingProductVariation,
): BlingTechnicalIds {
  const variantId = String(row.id ?? "");
  const codigo = row.codigo?.trim() || variantId;
  const visual = parseVariationName(row.variacao?.nome ?? row.nome);
  const attrIds = buildAttributeIds(row.atributos);
  const attrTechnical = mapAttributeIdsToTechnical(attrIds, visual);
  return {
    bling_product_id: parentId,
    bling_variant_id: variantId,
    sku: codigo,
    codigo,
    barcode: row.gtin?.trim() || undefined,
    ...attrTechnical,
  };
}

function buildVariantLabel(
  v: BlingProductVariation,
  visual: VariantVisual,
): string {
  const fromName = v.variacao?.nome?.trim() || v.nome?.trim();
  if (fromName) return fromName;
  const bits: string[] = [];
  if (visual.color) bits.push(`Cor: ${visual.color}`);
  if (visual.size) bits.push(`Tamanho: ${visual.size}`);
  if (visual.model) bits.push(`Modelo: ${visual.model}`);
  if (bits.length) return bits.join(" · ");
  return v.codigo?.trim() || String(v.id ?? "");
}

/** Uma opção por SKU Bling — sem grupos combináveis. */
export function buildVariantOptions(
  parent: BlingProductSummary,
  variations: BlingProductVariation[],
  stockMap?: Map<string, number>,
): CatalogVariantOption[] {
  const parentId = String(parent.id);
  const options: CatalogVariantOption[] = [];

  for (const v of variations) {
    const vid = String(v.id ?? "");
    if (!vid) continue;
    const visual = parseVariationName(v.variacao?.nome ?? v.nome);
    if (v.atributos?.length) {
      for (const a of v.atributos) {
        if (a.valor) {
          const n = (a.nome ?? "").toLowerCase();
          if (n.includes("cor")) visual.color = a.valor;
          else if (n.includes("tamanho") || n === "tam") visual.size = a.valor;
          else if (n.includes("modelo")) visual.model = a.valor;
          else if (a.nome) visual[a.nome] = a.valor;
        }
      }
    }
    const imgs = extractImages(v);
    const stock = resolveStock(v, stockMap?.get(vid));
    options.push({
      id: vid,
      label: buildVariantLabel(v, visual),
      price:
        parseBlingMoney(v.preco) ||
        parseBlingMoney(parent.precoPromocional) ||
        parseBlingMoney(parent.preco),
      stock,
      imageUrl: imgs[0],
      visual,
      technical: buildTechnicalForVariant(parentId, v),
    });
  }

  return options;
}

export function isVariationChild(row: BlingProductSummary): boolean {
  return Boolean(row.variacao?.produtoPai?.id);
}

export function mapBlingProductToCatalog(
  row: BlingProductSummary,
  variations: BlingProductVariation[] = [],
  stockOverride?: number,
  variationStockMap?: Map<string, number>,
  categoryMap?: Map<string, string>,
): CatalogProduct | null {
  const name = row.nome?.trim();
  if (!name) return null;
  if (row.situacao && row.situacao !== "A") return null;

  const id = String(row.id);
  const imgs = extractImages(row);
  const price =
    parseBlingMoney(row.precoPromocional) || parseBlingMoney(row.preco);
  const compareAt =
    row.precoPromocional && row.preco
      ? parseBlingMoney(row.preco)
      : undefined;
  const brand = resolveBrand(row);
  const variants = buildVariantOptions(
    row,
    variations,
    variationStockMap,
  );
  const desc =
    row.descricaoCurta?.trim() || row.descricao?.trim() || "";

  return {
    technical: buildTechnicalForParent(row),
    name,
    slug: slugFromId(id),
    price,
    compareAtPrice:
      compareAt && compareAt > price ? compareAt : undefined,
    category: resolveCategory(row, categoryMap),
    brand: brand.name,
    brandId: brand.id,
    imageUrl: imgs[0] ?? PLACEHOLDER_IMAGE,
    galleryUrls: imgs.slice(1, 8),
    description: desc,
    unit: row.unidade?.trim() || undefined,
    weight:
      row.pesoLiquido != null
        ? Number(row.pesoLiquido)
        : row.pesoBruto != null
          ? Number(row.pesoBruto)
          : undefined,
    situation: row.situacao,
    stock: resolveStock(row, stockOverride),
    formato: row.formato,
    variants: variants.length ? variants : undefined,
  };
}
