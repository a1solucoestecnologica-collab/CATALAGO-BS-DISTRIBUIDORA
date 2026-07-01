import { fetchCatalogProductsPageFromBling } from "@/services/catalog/bling-catalog-loader";
import {
  logInitialImport,
  logInitialImportError,
  runWithInitialImportLog,
} from "@/services/catalog/initial-import-log";
import {
  countAllCatalogProducts,
  upsertCatalogProduct,
} from "@/services/sync/catalog-product-repository";
import {
  createWebhookLog,
  getInitialImportProgress,
  hasInitialImportCompleted,
  saveInitialImportProgress,
} from "@/services/webhook/webhook-log-repository";
import { INITIAL_IMPORT_EVENT } from "@/services/webhook/types";
import {
  getBlingStoredTokens,
  isBlingTokenExpired,
} from "@/services/api/bling-token-store";

export function shouldRunInitialImport(
  importAlreadyCompleted: boolean,
  catalogProductCount: number,
): boolean {
  if (importAlreadyCompleted) return false;
  if (catalogProductCount > 0) return false;
  return true;
}

export type InitialImportStats = {
  productsFetched: number;
  productsCreated: number;
  productsUpdated: number;
  productsUnchanged: number;
  durationMs: number;
};

export type InitialImportStepResult =
  | { status: "skipped" }
  | { status: "in_progress"; nextPage: number; productsInPage: number }
  | { status: "complete"; stats: InitialImportStats }
  | { status: "error"; message: string };

async function logTokenLoaded(): Promise<void> {
  const envToken = process.env.BLING_API_ACCESS_TOKEN?.trim();
  if (envToken) {
    logInitialImport("2. token carregado", {
      source: "BLING_API_ACCESS_TOKEN",
      access_token_len: envToken.length,
    });
    return;
  }

  const stored = await getBlingStoredTokens();
  logInitialImport("2. token carregado", {
    source: "bling_tokens",
    found: Boolean(stored),
    has_access_token: Boolean(stored?.access_token),
    has_refresh_token: Boolean(stored?.refresh_token),
    expires_at: stored?.expires_at ?? null,
    expired: stored ? isBlingTokenExpired(stored) : null,
    access_token_len: stored?.access_token?.length ?? 0,
    updated_at: stored?.updated_at ?? null,
  });
}

/**
 * Processa uma página da API Bling por invocação (adequado para serverless).
 * A importação completa ocorre em múltiplas chamadas até registrar initial_import.
 */
export async function runInitialImportStep(): Promise<InitialImportStepResult> {
  if (await hasInitialImportCompleted()) {
    return { status: "skipped" };
  }

  const catalogCount = await countAllCatalogProducts();
  const progress = await getInitialImportProgress();
  const startedAt = progress?.startedAt ?? Date.now();

  if (!progress && catalogCount > 0) {
    return { status: "skipped" };
  }

  const page = progress?.nextPage ?? 1;
  const totalImported = progress?.productsMapped ?? 0;

  return runWithInitialImportLog({ page, totalImported }, async () => {
    logInitialImport("1. importação iniciada", {
      page,
      catalogCount,
      hasProgress: Boolean(progress),
      startedAt,
    });

    await logTokenLoaded();
    logInitialImport("6. início da paginação");
    logInitialImport("7. página atual", { page });

    try {
      const { rawCount, products } = await fetchCatalogProductsPageFromBling(page);

      logInitialImport("5. quantidade de produtos retornados na página", {
        page,
        rawCount,
        mappedCount: products.length,
      });

      if (rawCount === 0) {
        const stats: InitialImportStats = {
          productsFetched: progress?.productsMapped ?? 0,
          productsCreated: progress?.productsCreated ?? 0,
          productsUpdated: progress?.productsUpdated ?? 0,
          productsUnchanged: progress?.productsUnchanged ?? 0,
          durationMs: Date.now() - startedAt,
        };

        await createWebhookLog({
          evento: INITIAL_IMPORT_EVENT,
          payload: stats,
          status: "success",
        });

        logInitialImport("8. total importado", {
          productsMapped: stats.productsFetched,
          productsCreated: stats.productsCreated,
          productsUpdated: stats.productsUpdated,
          durationMs: stats.durationMs,
        });

        return { status: "complete", stats };
      }

      let productsCreated = progress?.productsCreated ?? 0;
      let productsUpdated = progress?.productsUpdated ?? 0;
      let productsUnchanged = progress?.productsUnchanged ?? 0;
      let productsMapped = progress?.productsMapped ?? 0;

      for (const product of products) {
        const outcome = await upsertCatalogProduct(product);
        if (outcome === "created") productsCreated += 1;
        else if (outcome === "updated") productsUpdated += 1;
        else productsUnchanged += 1;
      }
      productsMapped += products.length;

      const nextPage = page + 1;
      await saveInitialImportProgress({
        nextPage,
        pagesCompleted: page,
        productsCreated,
        productsUpdated,
        productsUnchanged,
        productsMapped,
        startedAt,
      });

      logInitialImport("8. total importado", {
        productsMapped,
        productsCreated,
        productsUpdated,
        productsUnchanged,
        nextPage,
      });

      return {
        status: "in_progress",
        nextPage,
        productsInPage: products.length,
      };
    } catch (e) {
      logInitialImportError(`página ${page}`, e);
      const message =
        e instanceof Error ? e.message : "Erro na importação inicial do Bling.";

      if (!(await hasInitialImportCompleted())) {
        try {
          await createWebhookLog({
            evento: INITIAL_IMPORT_EVENT,
            payload: {
              page,
              durationMs: Date.now() - startedAt,
            },
            status: "error",
            erro: message,
          });
        } catch (logErr) {
          logInitialImportError("createWebhookLog", logErr);
        }
      }

      return { status: "error", message };
    }
  });
}

/** Dispara o primeiro passo da importação (OAuth callback). */
export async function runInitialImportIfNeeded(): Promise<InitialImportStepResult> {
  const [importDone, catalogCount] = await Promise.all([
    hasInitialImportCompleted(),
    countAllCatalogProducts(),
  ]);

  if (!shouldRunInitialImport(importDone, catalogCount)) {
    logInitialImport("importação ignorada", { importDone, catalogCount });
    return { status: "skipped" };
  }

  return runInitialImportStep();
}
