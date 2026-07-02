import { describe, expect, it } from "vitest";
import {
  extractImages,
  mapBlingProductToCatalog,
  resolveCategory,
} from "@/services/api/bling-mapper";
import type { BlingProductSummary } from "@/services/api/bling.types";

describe("bling-mapper imagens", () => {
  it("usa imagemURL da listagem quando midia não existe", () => {
    const row = {
      id: 1,
      nome: "Produto",
      situacao: "A",
      imagemURL: "https://cdn.example.com/foto.jpg",
    } as BlingProductSummary;

    expect(extractImages(row)).toEqual(["https://cdn.example.com/foto.jpg"]);

    const mapped = mapBlingProductToCatalog(row);
    expect(mapped?.imageUrl).toBe("https://cdn.example.com/foto.jpg");
  });

  it("prioriza midia.imagens sobre imagemURL", () => {
    const row = {
      id: 2,
      nome: "Produto",
      situacao: "A",
      imagemURL: "https://cdn.example.com/lista.jpg",
      midia: {
        imagens: {
          internas: [{ link: "https://cdn.example.com/detalhe.jpg" }],
        },
      },
    } as BlingProductSummary;

    expect(extractImages(row)).toEqual(["https://cdn.example.com/detalhe.jpg"]);
  });
});

describe("bling-mapper categorias", () => {
  it("resolve nome via mapa quando detalhe só traz id", () => {
    const row = {
      id: 3,
      nome: "Produto",
      situacao: "A",
      categoria: { id: 7580899 },
    } as BlingProductSummary;

    const map = new Map([["7580899", "Bebidas"]]);
    expect(resolveCategory(row, map)).toEqual({
      bling_category_id: "7580899",
      name: "Bebidas",
    });
  });

  it("usa Sem categoria quando não há categoria no Bling", () => {
    const row = {
      id: 4,
      nome: "Produto",
      situacao: "A",
    } as BlingProductSummary;

    expect(resolveCategory(row)).toEqual({
      bling_category_id: "sem-categoria",
      name: "Sem categoria",
    });
  });

  it("mapeia variações embutidas no detalhe", () => {
    const row = {
      id: 100,
      nome: "Pai",
      situacao: "A",
      preco: "10",
      variacoes: [
        {
          id: 201,
          nome: "Pai Cor:Azul",
          codigo: "V1",
          preco: "12",
          variacao: { nome: "Cor:Azul" },
          estoque: { saldoVirtualTotal: 4 },
        },
      ],
    } as BlingProductSummary;

    const mapped = mapBlingProductToCatalog(row, row.variacoes ?? []);
    expect(mapped?.variants).toHaveLength(1);
    expect(mapped?.variants?.[0]?.visual.color).toBe("Azul");
    expect(mapped?.variants?.[0]?.technical.bling_variant_id).toBe("201");
  });
});
