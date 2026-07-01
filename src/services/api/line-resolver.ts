import type { CartLineStored, CartLineSubmit } from "@/types/catalog";
import type { SolicitacaoItem } from "@/types/solicitacao";
import {
  getProductById,
  getProductVariations,
  getStockBalances,
} from "@/services/api/bling-client";
import { mapBlingProductToCatalog } from "@/services/api/bling-mapper";

export type LineResolveResult =
  | { ok: true; item: SolicitacaoItem }
  | { ok: false; error: string };

async function loadProductContext(blingProductId: string) {
  const row = await getProductById(blingProductId);
  if (!row) return null;
  if (row.situacao && row.situacao !== "A") return null;

  const variations = await getProductVariations(blingProductId);
  const stockIds = [
    blingProductId,
    ...variations.map((v) => String(v.id ?? "")).filter(Boolean),
  ];
  const stockMap = await getStockBalances(stockIds);
  const product = mapBlingProductToCatalog(
    row,
    variations,
    stockMap.get(blingProductId),
    stockMap,
  );
  return product;
}

export async function resolveLineFromBling(
  line: CartLineSubmit,
): Promise<LineResolveResult> {
  const qty = line.quantidade;
  if (!Number.isFinite(qty) || qty <= 0 || qty > 99_999) {
    return { ok: false, error: "Quantidade inválida." };
  }

  const product = await loadProductContext(line.bling_product_id);
  if (!product) {
    return {
      ok: false,
      error: `Produto ${line.bling_product_id} indisponível.`,
    };
  }

  if (product.variants?.length) {
    if (!line.bling_variant_id) {
      return {
        ok: false,
        error: `Variação obrigatória para ${product.name}.`,
      };
    }
    const variant = product.variants.find(
      (v) => v.id === line.bling_variant_id,
    );
    if (!variant) {
      return {
        ok: false,
        error: `Variação ${line.bling_variant_id} inválida para ${product.name}.`,
      };
    }
    if (
      line.bling_attribute_ids &&
      variant.technical.bling_attribute_ids &&
      JSON.stringify(line.bling_attribute_ids) !==
        JSON.stringify(variant.technical.bling_attribute_ids)
    ) {
      return {
        ok: false,
        error: `Atributos inconsistentes para ${product.name}.`,
      };
    }

    const variacoes =
      Object.keys(variant.visual).length > 0 ? variant.visual : undefined;

    return {
      ok: true,
      item: {
        visual: {
          nome: product.name,
          codigo: variant.technical.codigo,
          sku: variant.technical.sku,
          categoria: product.category.name,
          quantidade: qty,
          preco_exibido: variant.price,
          variacoes,
        },
        tecnico: {
          ...variant.technical,
          bling_category_id: product.category.bling_category_id,
          quantidade: qty,
          preco_exibido: variant.price,
        },
      },
    };
  }

  if (line.bling_variant_id) {
    return {
      ok: false,
      error: `Produto ${product.name} não possui variações.`,
    };
  }

  return {
    ok: true,
    item: {
      visual: {
        nome: product.name,
        codigo: product.technical.codigo,
        sku: product.technical.sku,
        categoria: product.category.name,
        quantidade: qty,
        preco_exibido: product.price,
      },
      tecnico: {
        ...product.technical,
        bling_category_id: product.category.bling_category_id,
        quantidade: qty,
        preco_exibido: product.price,
      },
    },
  };
}

export async function resolveCartDisplayLine(
  line: CartLineStored,
): Promise<{
  name: string;
  slug: string;
  imageUrl: string;
  sku: string;
  unitPrice: number;
  variantLabel?: string;
} | null> {
  const product = await loadProductContext(line.bling_product_id);
  if (!product) return null;

  if (product.variants?.length) {
    const variant = line.bling_variant_id
      ? product.variants.find((v) => v.id === line.bling_variant_id)
      : undefined;
    if (!variant) return null;
    return {
      name: product.name,
      slug: product.slug,
      imageUrl: variant.imageUrl || product.imageUrl,
      sku: variant.technical.sku,
      unitPrice: variant.price,
      variantLabel: variant.label,
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    imageUrl: product.imageUrl,
    sku: product.technical.sku,
    unitPrice: product.price,
  };
}

export async function buildSolicitacaoItemsFromBling(
  lines: CartLineSubmit[],
): Promise<
  { ok: true; itens: SolicitacaoItem[] } | { ok: false; error: string }
> {
  const itens: SolicitacaoItem[] = [];
  for (const line of lines) {
    const result = await resolveLineFromBling(line);
    if (!result.ok) return { ok: false, error: result.error };
    itens.push(result.item);
  }
  return { ok: true, itens };
}
