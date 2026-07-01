import { describe, expect, it } from "vitest";
import { CURRENT_IMPORT_VERSION } from "@/services/webhook/types";

/** Espelha a lógica de hasInitialImportCompleted para testes unitários. */
function isImportCompletedPayload(payload: Record<string, unknown>): boolean {
  const version = (payload.importVersion as number | undefined) ?? 1;
  return version >= CURRENT_IMPORT_VERSION;
}

describe("finalização da importação inicial", () => {
  it("considera concluída quando importVersion >= CURRENT_IMPORT_VERSION", () => {
    expect(isImportCompletedPayload({ importVersion: 2 })).toBe(true);
    expect(isImportCompletedPayload({ importVersion: 1 })).toBe(false);
    expect(isImportCompletedPayload({})).toBe(false);
  });
});
