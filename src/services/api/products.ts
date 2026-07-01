import type { CatalogProduct } from "@/types/catalog";
import {
  getCatalogProductBySlug,
  listActiveCatalogProducts,
} from "@/services/sync/catalog-product-repository";
import { isBlingConfigured } from "@/services/api/bling-client";
import { hasInitialImportCompleted } from "@/services/webhook/webhook-log-repository";

export type CatalogLoadResult =
  | { ok: true; products: CatalogProduct[] }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "importing" }
  | { ok: false; reason: "cache_error"; message: string };

export async function getCatalogConfigurationStatus(): Promise<
  "configured" | "not_configured"
> {
  return (await isBlingConfigured()) ? "configured" : "not_configured";
}

export async function getProducts(): Promise<CatalogLoadResult> {
  if (!(await isBlingConfigured())) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const importDone = await hasInitialImportCompleted();
    if (!importDone) {
      return { ok: false, reason: "importing" };
    }

    const products = await listActiveCatalogProducts();
    return { ok: true, products };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao ler cache do catálogo.";
    return { ok: false, reason: "cache_error", message };
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  if (!(await isBlingConfigured())) return null;

  try {
    return await getCatalogProductBySlug(slug);
  } catch {
    return null;
  }
}
