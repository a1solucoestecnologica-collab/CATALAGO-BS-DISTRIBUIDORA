import { AsyncLocalStorage } from "node:async_hooks";

export type InitialImportLogContext = {
  page: number;
  totalImported: number;
};

const storage = new AsyncLocalStorage<InitialImportLogContext>();

export function runWithInitialImportLog<T>(
  ctx: InitialImportLogContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn);
}

export function getInitialImportLogContext(): InitialImportLogContext | undefined {
  return storage.getStore();
}

export function isInitialImportLogging(): boolean {
  return storage.getStore() !== undefined;
}

export function logInitialImport(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (detail) {
    console.log("[initial-import]", step, JSON.stringify(detail));
  } else {
    console.log("[initial-import]", step);
  }
}

export function logInitialImportError(phase: string, error: unknown): void {
  console.error("[initial-import] 9. primeiro erro encontrado:", phase);
  if (error instanceof Error) {
    console.error("[initial-import] mensagem:", error.message);
    console.error("[initial-import] 10. stack trace completo:", error.stack);
  } else {
    console.error("[initial-import] erro:", error);
  }
}

export function logInitialImportApiError(input: {
  url: string;
  status: number;
  body: string;
}): void {
  console.error(
    "[initial-import] API Bling erro HTTP",
    JSON.stringify({
      url: input.url,
      status: input.status,
      body: input.body,
    }),
  );
}
