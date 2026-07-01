import { describe, expect, it } from "vitest";
import { shouldRunInitialImport } from "@/services/catalog/bling-initial-import";

describe("shouldRunInitialImport", () => {
  it("não executa se a importação v2 já foi concluída", () => {
    expect(shouldRunInitialImport(true)).toBe(false);
  });

  it("executa quando a importação v2 ainda não foi concluída", () => {
    expect(shouldRunInitialImport(false)).toBe(true);
  });
});
