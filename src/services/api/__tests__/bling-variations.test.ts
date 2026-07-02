import { describe, expect, it } from "vitest";
import { extractVariationsFromDetail } from "@/services/api/bling-client";
import type { BlingProductSummary } from "@/services/api/bling.types";

describe("extractVariationsFromDetail", () => {
  it("retorna variações embutidas no detalhe", () => {
    const detail = {
      id: 1,
      variacoes: [{ id: 10, nome: "Var A" }, { id: 11, nome: "Var B" }],
    } as BlingProductSummary;

    expect(extractVariationsFromDetail(detail)).toHaveLength(2);
  });

  it("retorna vazio quando não há variações", () => {
    expect(extractVariationsFromDetail({ id: 1 } as BlingProductSummary)).toEqual(
      [],
    );
  });
});
