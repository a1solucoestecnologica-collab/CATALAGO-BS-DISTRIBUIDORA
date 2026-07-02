import { describe, expect, it } from "vitest";
import {
  buildVariantAxes,
  findVariantBySelections,
  orderVariantAxisKeys,
} from "@/lib/catalog-variants";
import type { CatalogVariantOption } from "@/types/catalog";

const variants: CatalogVariantOption[] = [
  {
    id: "1",
    label: "Preto · Morango",
    price: 10,
    stock: 5,
    visual: { color: "Preto", sabor: "Morango" },
    technical: {
      bling_product_id: "p1",
      bling_variant_id: "1",
      sku: "A",
      codigo: "A",
    },
  },
  {
    id: "2",
    label: "Azul · Morango",
    price: 11,
    stock: 3,
    visual: { color: "Azul", sabor: "Morango" },
    technical: {
      bling_product_id: "p1",
      bling_variant_id: "2",
      sku: "B",
      codigo: "B",
    },
  },
];

describe("catalog-variants eixos", () => {
  it("agrupa eixos cor e sabor", () => {
    const axes = buildVariantAxes(variants);
    expect(axes.color).toEqual(["Azul", "Preto"]);
    expect(axes.sabor).toEqual(["Morango"]);
    expect(orderVariantAxisKeys(axes)[0]).toBe("color");
  });

  it("resolve variante por seleções", () => {
    const found = findVariantBySelections(variants, {
      color: "Azul",
      sabor: "Morango",
    });
    expect(found?.id).toBe("2");
  });
});
