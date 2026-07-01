"use client";

import type { CatalogProduct } from "@/types/catalog";
import { ProductCard } from "@/components/product/ProductCard";

type Props = {
  title: string;
  subtitle?: string;
  products: CatalogProduct[];
  variant?: "grid" | "scroll";
};

export function ProductGrid({
  title,
  subtitle,
  products,
  variant = "grid",
}: Props) {
  const isScroll = variant === "scroll";

  return (
    <section className="border-b border-slate-100 bg-white py-9 last:border-b-0">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-[0.12em] text-slate-900 sm:text-lg md:text-xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              {subtitle}
            </p>
          ) : null}
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#0066CC]" />
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          {products.length} produtos nesta vitrine
        </p>

        {isScroll ? (
          <div className="mt-7 -mx-3 flex gap-3 overflow-x-auto px-3 pb-2 pt-1 [scrollbar-width:thin] sm:mx-0 sm:px-0">
            {products.map((p) => (
              <div
                key={p.technical.bling_product_id}
                className="w-[48%] shrink-0 sm:w-[220px] md:w-[235px]"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
            {products.map((p) => (
              <ProductCard key={p.technical.bling_product_id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
