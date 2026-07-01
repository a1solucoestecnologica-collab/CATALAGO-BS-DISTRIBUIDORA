"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

export type CatalogCategoryFilter = {
  id: string;
  name: string;
};

type CatalogFiltersValue = {
  query: string;
  setQuery: (q: string) => void;
  category: string;
  setCategory: (c: string) => void;
  categories: CatalogCategoryFilter[];
  setCategories: (cats: CatalogCategoryFilter[]) => void;
};

const CatalogFiltersContext = createContext<CatalogFiltersValue | null>(null);

export function CatalogFiltersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<CatalogCategoryFilter[]>([]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      category,
      setCategory,
      categories,
      setCategories,
    }),
    [query, category, categories],
  );

  return (
    <CatalogFiltersContext.Provider value={value}>
      {children}
    </CatalogFiltersContext.Provider>
  );
}

export function useCatalogFilters() {
  const ctx = useContext(CatalogFiltersContext);
  if (!ctx) {
    throw new Error("useCatalogFilters exige CatalogFiltersProvider");
  }
  return ctx;
}
