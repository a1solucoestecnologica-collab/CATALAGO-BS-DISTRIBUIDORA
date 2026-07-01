import { fetchCatalogProductsPageFromBling } from "@/services/catalog/bling-catalog-loader";
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

  try {
    const { rawCount, products } = await fetchCatalogProductsPageFromBling(page);

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

      console.log("[bling/initial-import] concluída", stats);
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

    console.log(
      `[bling/initial-import] página ${page} ok mapped=${products.length} total=${productsMapped}`,
    );

    return {
      status: "in_progress",
      nextPage,
      productsInPage: products.length,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro na importação inicial do Bling.";
    console.error(`[bling/initial-import] erro página ${page}:`, message);

    if (!(await hasInitialImportCompleted())) {
      try {
        await createWebhookLog({
          evento: INITIAL_IMPORT_EVENT,
          payload: { page, durationMs: Date.now() - startedAt },
          status: "error",
          erro: message,
        });
      } catch (logErr) {
        console.error("[bling/initial-import] falha ao registrar log:", logErr);
      }
    }

    return { status: "error", message };
  }
}

/** Dispara o primeiro passo da importação (OAuth callback). */
export async function runInitialImportIfNeeded(): Promise<InitialImportStepResult> {
  const [importDone, catalogCount] = await Promise.all([
    hasInitialImportCompleted(),
    countAllCatalogProducts(),
  ]);

  if (!shouldRunInitialImport(importDone, catalogCount)) {
    return { status: "skipped" };
  }

  return runInitialImportStep();
}
