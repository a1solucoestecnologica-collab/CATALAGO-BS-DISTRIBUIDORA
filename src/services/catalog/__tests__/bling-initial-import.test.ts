import { describe, expect, it } from "vitest";
import { shouldRunInitialImport } from "@/services/catalog/bling-initial-import";

describe("shouldRunInitialImport", () => {
  it("não executa se a importação inicial já foi concluída", () => {
    expect(shouldRunInitialImport(true, 0)).toBe(false);
    expect(shouldRunInitialImport(true, 10)).toBe(false);
  });

  it("não executa se catalog_products já tem registros", () => {
    expect(shouldRunInitialImport(false, 1)).toBe(false);
    expect(shouldRunInitialImport(false, 50)).toBe(false);
  });

  it("executa apenas quando não houve importação e a tabela está vazia", () => {
    expect(shouldRunInitialImport(false, 0)).toBe(true);
  });
});
