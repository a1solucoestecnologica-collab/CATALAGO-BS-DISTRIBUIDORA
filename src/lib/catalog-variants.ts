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
