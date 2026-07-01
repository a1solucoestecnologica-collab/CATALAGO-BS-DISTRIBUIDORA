import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/types/catalog";
import {
  hashCatalogProduct,
  productsContentEqual,
} from "@/services/sync/product-hash";

const baseProduct = (): CatalogProduct => ({
  technical: {
    bling_product_id: "123",
    sku: "SKU1",
    codigo: "C1",
  },
  name: "Produto Teste",
  slug: "123",
  price: 10,
  category: { bling_category_id: "1", name: "Cat" },
  imageUrl: "",
  description: "Desc",
  stock: 5,
});

describe("product-hash", () => {
  it("gera hash estável para o mesmo produto", () => {
    const a = baseProduct();
    const b = baseProduct();
    expect(hashCatalogProduct(a)).toBe(hashCatalogProduct(b));
    expect(productsContentEqual(a, b)).toBe(true);
  });

  it("detecta alteração de preço", () => {
    const a = baseProduct();
    const b = { ...baseProduct(), price: 20 };
    expect(productsContentEqual(a, b)).toBe(false);
  });

  it("detecta alteração de estoque", () => {
    const a = baseProduct();
    const b = { ...baseProduct(), stock: 0 };
    expect(productsContentEqual(a, b)).toBe(false);
  });
});

describe("BLING_INTEGRATION_ID", () => {
  it("usa UUID fixo para integração singleton", async () => {
    const { BLING_INTEGRATION_ID } = await import(
      "@/services/sync/integration"
    );
    expect(BLING_INTEGRATION_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
