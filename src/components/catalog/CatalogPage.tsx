"use client";

import { useEffect, useMemo } from "react";
import type { CatalogProduct } from "@/types/catalog";
import { useCatalogFilters } from "@/contexts/catalog-filters-context";
import { ProductGrid } from "@/components/product/ProductGrid";

type Props = {
  products: CatalogProduct[];
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CatalogPage({ products }: Props) {
  const { query, category, setCategories } = useCatalogFilters();

  useEffect(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      map.set(p.category.bling_category_id, p.category.name);
    }
    setCategories(
      [...map.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    );
  }, [products, setCategories]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return products.filter((p) => {
      const catOk =
        category === "all" || p.category.bling_category_id === category;
      if (!catOk) return false;
      if (!q) return true;
      const blob = normalize(
        `${p.name} ${p.technical.sku} ${p.technical.codigo} ${p.technical.barcode ?? ""} ${p.description} ${p.brand ?? ""} ${p.category.name}`,
      );
      return blob.includes(q);
    });
  }, [products, category, query]);

  return (
    <div id="catalogo" className="scroll-mt-4 bg-white py-6">
      <ProductGrid
        title="Catálogo"
        subtitle="Produtos sincronizados com o Bling"
        products={filtered}
        variant="grid"
      />
    </div>
  );
}
