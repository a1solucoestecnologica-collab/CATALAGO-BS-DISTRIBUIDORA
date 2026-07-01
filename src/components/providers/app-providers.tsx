"use client";

import { CartProvider } from "@/contexts/cart-context";
import { CatalogFiltersProvider } from "@/contexts/catalog-filters-context";
import { ClientProvider } from "@/contexts/client-context";
import { ClientIdentificationModal } from "@/components/client/ClientIdentificationModal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      <CartProvider>
        <CatalogFiltersProvider>
          {children}
          <ClientIdentificationModal />
        </CatalogFiltersProvider>
      </CartProvider>
    </ClientProvider>
  );
}
