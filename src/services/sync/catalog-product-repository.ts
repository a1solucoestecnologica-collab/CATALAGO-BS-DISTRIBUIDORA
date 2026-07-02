import { getSupabaseAdmin } from "@/services/storage/supabase-admin";
import type { CatalogDisplaySettings, CatalogProduct } from "@/types/catalog";
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

type CatalogProductDbRow = {
  id: string;
  bling_product_id: string;
  slug: string;
  data: CatalogProduct;
  catalog_visible: boolean | null;
  catalog_featured: boolean | null;
  catalog_promotion: boolean | null;
  catalog_new: boolean | null;
  catalog_sort_order: number | null;
  catalog_allow_order: boolean | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_slug: string | null;
};

const PAGE_SIZE = 1000;

const LIST_SELECT =
  "id,bling_product_id,slug,data,catalog_visible,catalog_featured,catalog_promotion,catalog_new,catalog_sort_order,catalog_allow_order,seo_title,seo_description,custom_slug";

function blingDataOnly(product: CatalogProduct): CatalogProduct {
  const copy = { ...product };
  delete copy.display;
  return copy;
}

function mergeRowToProduct(row: CatalogProductDbRow): CatalogProduct {
  const base = row.data as CatalogProduct;
  const effectiveSlug = row.custom_slug?.trim() || row.slug;
  return {
    ...base,
    slug: effectiveSlug,
    display: {
      visible: row.catalog_visible ?? true,
      featured: row.catalog_featured ?? false,
      promotion: row.catalog_promotion ?? false,
      isNew: row.catalog_new ?? false,
      sortOrder: row.catalog_sort_order ?? 0,
      allowOrder: row.catalog_allow_order ?? true,
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
      customSlug: row.custom_slug ?? undefined,
    },
  };
}

async function fetchAllProductRows(
  integrationId: string,
  options: { visibleOnly?: boolean } = {},
): Promise<CatalogProductDbRow[]> {
  const rows: CatalogProductDbRow[] = [];
  let from = 0;

  for (;;) {
    let query = getSupabaseAdmin()
      .from("catalog_products")
      .select(LIST_SELECT)
      .eq("integration_id", integrationId)
      .eq("active", true);

    if (options.visibleOnly) {
      query = query.eq("catalog_visible", true);
    }

    const { data, error } = await query
      .order("catalog_sort_order", { ascending: true })
      .order("slug", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as CatalogProductDbRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function listActiveCatalogProducts(
  integrationId = BLING_INTEGRATION_ID,
): Promise<CatalogProduct[]> {
  const rows = await fetchAllProductRows(integrationId, { visibleOnly: true });
  return rows.map(mergeRowToProduct);
}

export type AdminCatalogProductRow = CatalogProduct & {
  rowId: string;
  blingProductId: string;
  blingSlug: string;
};

export async function listCatalogProductsForAdmin(
  integrationId = BLING_INTEGRATION_ID,
): Promise<AdminCatalogProductRow[]> {
  const rows = await fetchAllProductRows(integrationId, { visibleOnly: false });
  return rows.map((row) => {
    const product = mergeRowToProduct(row);
    return {
      ...product,
      rowId: row.id,
      blingProductId: row.bling_product_id,
      blingSlug: row.slug,
    };
  });
}

export async function getCatalogProductBySlug(
  slug: string,
  integrationId = BLING_INTEGRATION_ID,
): Promise<CatalogProduct | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("catalog_products")
    .select(LIST_SELECT)
    .eq("integration_id", integrationId)
    .eq("active", true)
    .eq("catalog_visible", true)
    .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mergeRowToProduct(data as CatalogProductDbRow);
}

export async function upsertCatalogProduct(
  product: CatalogProduct,
  integrationId = BLING_INTEGRATION_ID,
): Promise<"created" | "updated" | "unchanged"> {
  const blingData = blingDataOnly(product);
  const hash = hashCatalogProduct(blingData);
  const blingId = blingData.technical.bling_product_id;

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
        slug: blingData.slug,
        data: blingData,
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
    slug: blingData.slug,
    data: blingData,
    content_hash: hash,
    active: true,
  });
  if (error) throw new Error(error.message);
  return "created";
}

export async function updateCatalogDisplaySettings(
  blingProductId: string,
  settings: Partial<CatalogDisplaySettings>,
  integrationId = BLING_INTEGRATION_ID,
): Promise<void> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (settings.visible !== undefined) patch.catalog_visible = settings.visible;
  if (settings.featured !== undefined) patch.catalog_featured = settings.featured;
  if (settings.promotion !== undefined) {
    patch.catalog_promotion = settings.promotion;
  }
  if (settings.isNew !== undefined) patch.catalog_new = settings.isNew;
  if (settings.sortOrder !== undefined) {
    patch.catalog_sort_order = settings.sortOrder;
  }
  if (settings.allowOrder !== undefined) {
    patch.catalog_allow_order = settings.allowOrder;
  }
  if (settings.seoTitle !== undefined) {
    patch.seo_title = settings.seoTitle || null;
  }
  if (settings.seoDescription !== undefined) {
    patch.seo_description = settings.seoDescription || null;
  }
  if (settings.customSlug !== undefined) {
    patch.custom_slug = settings.customSlug?.trim() || null;
  }

  const { error } = await getSupabaseAdmin()
    .from("catalog_products")
    .update(patch)
    .eq("integration_id", integrationId)
    .eq("bling_product_id", blingProductId);

  if (error) throw new Error(error.message);
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
