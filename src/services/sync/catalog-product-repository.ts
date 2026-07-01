import { getSupabaseAdmin } from "@/services/storage/supabase-admin";
import type { CatalogProduct } from "@/types/catalog";
import { BLING_INTEGRATION_ID } from "@/services/sync/integration";
import { hashCatalogProduct } from "@/services/sync/product-hash";

export type StoredCatalogProduct = {
  id: string;
  integration_id: string;
  bling_product_id: string;
  slug: string;
  data: CatalogProduct;
  content_hash: string;
  active: boolean;
};

export async function listActiveCatalogProducts(
  integrationId = BLING_INTEGRATION_ID,
): Promise<CatalogProduct[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("catalog_products")
    .select("data")
    .eq("integration_id", integrationId)
    .eq("active", true);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.data as CatalogProduct);
}

export async function getCatalogProductBySlug(
  slug: string,
  integrationId = BLING_INTEGRATION_ID,
): Promise<CatalogProduct | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("catalog_products")
    .select("data")
    .eq("integration_id", integrationId)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data.data as CatalogProduct) : null;
}

export async function upsertCatalogProduct(
  product: CatalogProduct,
  integrationId = BLING_INTEGRATION_ID,
): Promise<"created" | "updated" | "unchanged"> {
  const hash = hashCatalogProduct(product);
  const blingId = product.technical.bling_product_id;

  const { data: existing, error: readErr } = await getSupabaseAdmin()
    .from("catalog_products")
    .select("id, content_hash, active")
    .eq("integration_id", integrationId)
    .eq("bling_product_id", blingId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);

  if (existing) {
    if (existing.content_hash === hash && existing.active) {
      return "unchanged";
    }
    const { error } = await getSupabaseAdmin()
      .from("catalog_products")
      .update({
        slug: product.slug,
        data: product,
        content_hash: hash,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return !existing.active || existing.content_hash !== hash
      ? "updated"
      : "unchanged";
  }

  const { error } = await getSupabaseAdmin().from("catalog_products").insert({
    integration_id: integrationId,
    bling_product_id: blingId,
    slug: product.slug,
    data: product,
    content_hash: hash,
    active: true,
  });
  if (error) throw new Error(error.message);
  return "created";
}

export async function inactivateCatalogProduct(
  blingProductId: string,
  integrationId = BLING_INTEGRATION_ID,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("catalog_products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("integration_id", integrationId)
    .eq("bling_product_id", blingProductId);

  if (error) throw new Error(error.message);
}

export async function countActiveProducts(
  integrationId = BLING_INTEGRATION_ID,
): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("catalog_products")
    .select("id", { count: "exact", head: true })
    .eq("integration_id", integrationId)
    .eq("active", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countAllCatalogProducts(
  integrationId = BLING_INTEGRATION_ID,
): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("catalog_products")
    .select("id", { count: "exact", head: true })
    .eq("integration_id", integrationId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
