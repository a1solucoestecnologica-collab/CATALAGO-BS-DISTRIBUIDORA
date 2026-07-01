"use client";

import Link from "next/link";
import { Menu, Package2, Search, ShoppingCart, User, X } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useCatalogFilters } from "@/contexts/catalog-filters-context";
import { useClient } from "@/contexts/client-context";
import { useState } from "react";
import { STORE_BLUE } from "@/lib/store-theme";

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const { cliente, openIdentification } = useClient();
  const { query, setQuery, category, setCategory, categories } =
    useCatalogFilters();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navButton = (slug: string, label: string) => {
    const active = category === slug;
    return (
      <button
        key={slug}
        type="button"
        onClick={() => {
          setCategory(slug);
          setMobileOpen(false);
        }}
        className={`shrink-0 border-b-[3px] px-1 py-3 text-[11px] font-bold uppercase tracking-wide transition sm:text-xs ${
          active
            ? "border-[#0066CC] text-[#0066CC]"
            : "border-transparent text-slate-800 hover:text-[#0066CC]"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div
        className="text-[11px] font-medium text-white sm:text-xs"
        style={{ backgroundColor: STORE_BLUE }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6 lg:px-8">
          <span className="font-semibold">Catálogo integrado ao Bling</span>
          {cliente ? (
            <span className="text-white/90">
              Olá, {cliente.nome.split(" ")[0]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:gap-6">
            <button
              type="button"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-md text-white shadow-sm"
                style={{ backgroundColor: STORE_BLUE }}
              >
                <Package2 className="h-7 w-7" aria-hidden />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-base font-black uppercase tracking-tight text-slate-900">
                  Catálogo
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Online
                </span>
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 px-2 lg:block">
              <label className="relative block">
                <span className="sr-only">Buscar produtos</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, código, SKU, marca…"
                  className="w-full rounded-sm border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]"
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={openIdentification}
                className="hidden rounded-full p-2.5 text-slate-700 hover:bg-slate-100 lg:inline-flex"
                aria-label="Identificação"
                title={cliente?.nome ?? "Identificar-se"}
              >
                <User className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex items-center gap-1 rounded-md px-2 py-2 text-slate-800 hover:bg-slate-100 sm:px-3"
              >
                <ShoppingCart className="h-6 w-6" aria-hidden />
                <span className="hidden text-[11px] font-bold uppercase sm:inline">
                  Carrinho
                </span>
                {itemCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00a651] px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="mt-3 pb-2 lg:hidden">
            <label className="relative block">
              <span className="sr-only">Buscar produtos</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produtos"
                className="w-full rounded-sm border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]"
              />
            </label>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="border-t border-slate-200 bg-[#f8fafc]">
            <nav
              className={`mx-auto flex max-w-7xl flex-wrap gap-x-3 gap-y-0 overflow-x-auto px-3 sm:gap-x-5 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] ${
                mobileOpen ? "flex" : "hidden lg:flex"
              }`}
            >
              {navButton("all", "Todos")}
              {categories.map((c) => navButton(c.id, c.name.toUpperCase()))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
