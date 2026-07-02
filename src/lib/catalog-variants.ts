import type {
  BlingTechnicalIds,
  CartLineStored,
  CatalogProduct,
  CatalogVariantOption,
  VariantVisual,
} from "@/types/catalog";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const AXIS_ORDER = ["color", "size", "sabor", "voltagem", "model"] as const;

const AXIS_LABELS: Record<string, string> = {
  color: "Cor",
  size: "Tamanho",
  sabor: "Sabor",
  voltagem: "Voltagem",
  model: "Modelo",
};

export function variantAxisLabel(axis: string): string {
  return AXIS_LABELS[axis] ?? axis.charAt(0).toUpperCase() + axis.slice(1);
}

export function productHasVariants(p: CatalogProduct): boolean {
  return Boolean(p.variants && p.variants.length > 0);
}

export function findVariantById(
  product: CatalogProduct,
  variantId: string | undefined,
): CatalogVariantOption | undefined {
  if (!variantId || !product.variants) return undefined;
  return product.variants.find((v) => v.id === variantId);
}

export function defaultVariantId(product: CatalogProduct): string | undefined {
  return product.variants?.[0]?.id;
}

export function buildVariantAxes(
  variants: CatalogVariantOption[],
): Record<string, string[]> {
  const sets: Record<string, Set<string>> = {};

  for (const v of variants) {
    for (const [key, value] of Object.entries(v.visual)) {
      if (!value) continue;
      if (!sets[key]) sets[key] = new Set();
      sets[key].add(value);
    }
  }

  const axes: Record<string, string[]> = {};
  for (const [key, set] of Object.entries(sets)) {
    axes[key] = [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  return axes;
}

export function orderVariantAxisKeys(axes: Record<string, string[]>): string[] {
  const keys = Object.keys(axes);
  const ordered: string[] = [];
  for (const k of AXIS_ORDER) {
    if (keys.includes(k)) ordered.push(k);
  }
  for (const k of keys.sort((a, b) => a.localeCompare(b, "pt-BR"))) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  return ordered;
}

export function getAvailableValuesForAxis(
  variants: CatalogVariantOption[],
  axis: string,
  selections: Record<string, string>,
): string[] {
  const others = Object.entries(selections).filter(
    ([key, value]) => key !== axis && value,
  );
  const filtered = variants.filter((v) =>
    others.every(([ax, val]) => v.visual[ax] === val),
  );
  const values = new Set<string>();
  for (const v of filtered) {
    const val = v.visual[axis];
    if (val) values.add(val);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function findVariantBySelections(
  variants: CatalogVariantOption[],
  selections: Record<string, string>,
): CatalogVariantOption | undefined {
  const active = Object.entries(selections).filter(([, value]) => value);
  if (!active.length) return variants[0];

  return variants.find((v) =>
    active.every(([axis, val]) => v.visual[axis] === val),
  );
}

export function initialVariantSelections(
  product: CatalogProduct,
): Record<string, string> {
  const first = product.variants?.[0];
  if (!first) return {};
  const axes = orderVariantAxisKeys(
    buildVariantAxes(product.variants ?? []),
  );
  const selections: Record<string, string> = {};
  for (const axis of axes) {
    const val = first.visual[axis];
    if (val) selections[axis] = val;
  }
  return selections;
}

export function resolveLineFromProduct(
  product: CatalogProduct,
  variantId: string | undefined,
): {
  unitPrice: number;
  stock: number;
  technical: BlingTechnicalIds;
  visual: VariantVisual;
  variantLabel?: string;
} {
  const variant = findVariantById(product, variantId);
  if (variant) {
    return {
      unitPrice: round2(variant.price),
      stock: variant.stock,
      technical: { ...variant.technical },
      visual: { ...variant.visual },
      variantLabel: variant.label,
    };
  }
  return {
    unitPrice: round2(product.price),
    stock: product.stock,
    technical: { ...product.technical },
    visual: {},
  };
}

export function minUnitPrice(product: CatalogProduct): number {
  if (!product.variants?.length) return product.price;
  let min = Infinity;
  for (const v of product.variants) {
    min = Math.min(min, v.price);
  }
  return min === Infinity ? product.price : round2(min);
}

export function getCartLineKey(line: CartLineStored): string {
  const variantId = line.bling_variant_id ?? "";
  const attrs = line.bling_attribute_ids
    ? Object.entries(line.bling_attribute_ids)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("__")
    : "";
  return `${line.bling_product_id}__${variantId}__${attrs}`;
}

export function storedLineFromProduct(
  product: CatalogProduct,
  quantity: number,
  variantId?: string,
): CartLineStored {
  const resolved = resolveLineFromProduct(product, variantId);
  return {
    bling_product_id: resolved.technical.bling_product_id,
    bling_variant_id: resolved.technical.bling_variant_id,
    bling_attribute_ids: resolved.technical.bling_attribute_ids,
    quantity,
  };
}
