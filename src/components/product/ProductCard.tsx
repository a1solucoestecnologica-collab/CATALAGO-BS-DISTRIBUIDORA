"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/types/catalog";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/contexts/cart-context";
import { STORE_BTN_GREEN, STORE_PRICE_GREEN } from "@/lib/store-theme";
import { minUnitPrice, productHasVariants } from "@/lib/catalog-variants";

type Props = {
  product: CatalogProduct;
};

export function ProductCard({ product }: Props) {
  const { addProduct } = useCart();
  const hasV = productHasVariants(product);
  const displayPrice = hasV ? minUnitPrice(product) : product.price;
  const outOfStock = product.stock <= 0 && !hasV;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:shadow-md">
      <Link
        href={`/produto/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-white outline-none ring-inset ring-[#0066CC] focus-visible:ring-2"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width:640px) 45vw, 240px"
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Sem imagem
          </div>
        )}
        {product.compareAtPrice && product.compareAtPrice > product.price ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-sm bg-rose-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
            Oferta
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col border-t border-slate-100 p-3 sm:p-3.5">
        <h3 className="min-h-[2.35rem] text-[12px] font-semibold leading-snug text-slate-800 sm:text-[13px]">
          <Link
            href={`/produto/${product.slug}`}
            className="line-clamp-2 hover:text-[#0066CC] hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-[10px] text-slate-400">
          ref. {product.technical.sku}
        </p>
        {product.brand ? (
          <p className="text-[10px] text-slate-500">{product.brand}</p>
        ) : null}
        <p className="mt-1 text-[10px] font-medium text-slate-600">
          {product.category.name}
          {!hasV ? (
            <span className={product.stock > 0 ? " text-emerald-700" : " text-rose-600"}>
              {" "}
              · Estoque: {product.stock}
            </span>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          {hasV ? (
            <span className="text-[10px] font-bold uppercase text-slate-500">
              A partir de
            </span>
          ) : null}
          <span
            className="text-lg font-black sm:text-xl"
            style={{ color: STORE_PRICE_GREEN }}
          >
            {formatBRL(displayPrice)}
          </span>
          {product.compareAtPrice &&
          product.compareAtPrice > product.price &&
          !hasV ? (
            <span className="text-xs font-medium text-slate-400 line-through">
              {formatBRL(product.compareAtPrice)}
            </span>
          ) : null}
        </div>
        {hasV ? (
          <Link
            href={`/produto/${product.slug}`}
            className="mt-2 w-full rounded-sm py-2.5 text-center text-[11px] font-black uppercase tracking-wide text-white shadow-sm sm:text-xs"
            style={{ backgroundColor: STORE_BTN_GREEN }}
          >
            Escolher opções
          </Link>
        ) : (
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addProduct(product, 1)}
            className="mt-2 w-full rounded-sm py-2.5 text-[11px] font-black uppercase tracking-wide text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-xs"
            style={{
              backgroundColor: outOfStock ? undefined : STORE_BTN_GREEN,
            }}
          >
            {outOfStock ? "Sem estoque" : "Adicionar ao carrinho"}
          </button>
        )}
        <Link
          href={`/produto/${product.slug}`}
          className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-[#0066CC] underline-offset-2 hover:underline"
        >
          Ver página do produto
        </Link>
      </div>
    </article>
  );
}
