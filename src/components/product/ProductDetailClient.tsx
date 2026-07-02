"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogProduct } from "@/types/catalog";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/contexts/cart-context";
import {
  buildVariantAxes,
  findVariantBySelections,
  getAvailableValuesForAxis,
  initialVariantSelections,
  orderVariantAxisKeys,
  productHasVariants,
  resolveLineFromProduct,
  variantAxisLabel,
} from "@/lib/catalog-variants";
import { STORE_BTN_GREEN, STORE_PRICE_GREEN } from "@/lib/store-theme";
import { ChevronLeft } from "lucide-react";

type Props = {
  product: CatalogProduct;
};

export function ProductDetailClient({ product }: Props) {
  const { addProduct } = useCart();
  const hasV = productHasVariants(product);
  const allowOrder = product.display?.allowOrder !== false;

  const axes = useMemo(
    () => (product.variants ? buildVariantAxes(product.variants) : {}),
    [product.variants],
  );
  const axisKeys = useMemo(() => orderVariantAxisKeys(axes), [axes]);

  const [selections, setSelections] = useState<Record<string, string>>(() =>
    initialVariantSelections(product),
  );

  const matchedVariant = useMemo(() => {
    if (!product.variants?.length) return undefined;
    return findVariantBySelections(product.variants, selections);
  }, [product.variants, selections]);

  const variantId = matchedVariant?.id;

  const images = useMemo(() => {
    const resolved = resolveLineFromProduct(product, variantId);
    const variantImg = resolved.visual
      ? product.variants?.find((v) => v.id === variantId)?.imageUrl
      : undefined;
    const extra = product.galleryUrls ?? [];
    const list = variantImg
      ? [variantImg, product.imageUrl, ...extra]
      : product.imageUrl
        ? [product.imageUrl, ...extra]
        : [...extra];
    return [...new Set(list.filter(Boolean))];
  }, [product, variantId]);

  const [galleryPick, setGalleryPick] = useState<string | null>(null);

  const heroImage =
    galleryPick && images.includes(galleryPick)
      ? galleryPick
      : (images[0] ?? "");

  const resolved = resolveLineFromProduct(product, variantId);
  const canAdd = allowOrder && resolved.stock > 0 && (!hasV || Boolean(variantId));

  function selectAxis(axis: string, value: string) {
    setSelections((prev) => {
      const next = { ...prev, [axis]: value };
      if (!product.variants) return next;
      const match = findVariantBySelections(product.variants, next);
      if (match) return next;
      const partial = { ...next };
      delete partial[axis];
      const fallback = findVariantBySelections(product.variants, {
        ...partial,
        [axis]: value,
      });
      if (fallback) {
        const synced: Record<string, string> = { [axis]: value };
        for (const key of axisKeys) {
          const val = fallback.visual[key];
          if (val) synced[key] = val;
        }
        return synced;
      }
      return next;
    });
  }

  return (
    <div className="bg-white pb-16 pt-4">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <nav className="mb-4 text-[11px] text-slate-500">
          <Link
            href="/#catalogo"
            className="inline-flex items-center gap-1 font-semibold text-[#0066CC] hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Voltar ao catálogo
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-600">{product.category.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-slate-200 bg-white">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={product.name}
                  fill
                  sizes="(max-width:1024px) 100vw,  50vw"
                  className="object-contain p-4"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Sem imagem
                </div>
              )}
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setGalleryPick(url)}
                    className={`relative h-16 w-16 overflow-hidden rounded border bg-white p-1 ${
                      heroImage === url
                        ? "border-[#0066CC] ring-1 ring-[#0066CC]"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    aria-label="Ver imagem"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <h1 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Código {resolved.technical.codigo} · SKU {resolved.technical.sku}
            </p>
            {resolved.technical.barcode ? (
              <p className="text-xs text-slate-500">
                Cód. barras {resolved.technical.barcode}
              </p>
            ) : null}
            {product.brand ? (
              <p className="mt-1 text-sm text-slate-600">Marca: {product.brand}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-4">
              <span
                className="text-3xl font-black"
                style={{ color: STORE_PRICE_GREEN }}
              >
                {formatBRL(resolved.unitPrice)}
              </span>
              {product.compareAtPrice &&
              product.compareAtPrice > product.price &&
              !hasV ? (
                <span className="text-base font-medium text-slate-400 line-through">
                  {formatBRL(product.compareAtPrice)}
                </span>
              ) : null}
            </div>

            <p
              className={`mt-2 text-sm font-semibold ${resolved.stock > 0 ? "text-emerald-700" : "text-rose-600"}`}
            >
              Estoque: {resolved.stock}
            </p>
            {product.unit ? (
              <p className="text-xs text-slate-500">Unidade: {product.unit}</p>
            ) : null}
            {product.weight != null ? (
              <p className="text-xs text-slate-500">
                Peso: {product.weight} kg
              </p>
            ) : null}

            {hasV && product.variants ? (
              <div className="mt-6 space-y-5">
                {axisKeys.map((axis) => {
                  const options = getAvailableValuesForAxis(
                    product.variants!,
                    axis,
                    selections,
                  );
                  if (!options.length) return null;
                  return (
                    <fieldset key={axis} className="min-w-0">
                      <legend className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        {variantAxisLabel(axis)}
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {options.map((value) => {
                          const sel = selections[axis] === value;
                          return (
                            <button
                              key={`${axis}-${value}`}
                              type="button"
                              onClick={() => selectAxis(axis, value)}
                              className={`rounded-sm border px-3 py-2 text-xs font-semibold transition ${
                                sel
                                  ? "border-[#0066CC] bg-[#0066CC]/5 text-[#0066CC]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
                {resolved.variantLabel ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Sua seleção:
                    </span>{" "}
                    {resolved.variantLabel}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6">
              <button
                type="button"
                disabled={!canAdd}
                onClick={() => addProduct(product, 1, variantId)}
                className="w-full rounded-sm py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                style={{
                  backgroundColor: canAdd ? STORE_BTN_GREEN : undefined,
                }}
              >
                {!allowOrder
                  ? "Indisponível para pedido"
                  : canAdd
                    ? "Adicionar ao carrinho"
                    : "Sem estoque"}
              </button>
            </div>

            <div className="mt-10 border-t border-slate-100 pt-8">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
                Descrição
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {product.description || "Sem descrição cadastrada no Bling."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
