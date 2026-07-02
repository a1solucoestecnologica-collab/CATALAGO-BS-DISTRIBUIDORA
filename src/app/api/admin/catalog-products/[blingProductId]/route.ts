import { NextResponse } from "next/server";
import type { CatalogDisplaySettings } from "@/types/catalog";
import { updateCatalogDisplaySettings } from "@/services/sync/catalog-product-repository";
import { isBlingConfigured } from "@/services/api/bling-client";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ blingProductId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isBlingConfigured())) {
    return NextResponse.json({ error: "Bling não configurado." }, { status: 503 });
  }

  const { blingProductId } = await context.params;
  const body = (await request.json()) as Partial<CatalogDisplaySettings> & {
    visible?: boolean;
    isNew?: boolean;
  };

  const settings: Partial<CatalogDisplaySettings> = {};
  if (body.visible !== undefined) settings.visible = Boolean(body.visible);
  if (body.featured !== undefined) settings.featured = Boolean(body.featured);
  if (body.promotion !== undefined) settings.promotion = Boolean(body.promotion);
  if (body.isNew !== undefined) settings.isNew = Boolean(body.isNew);
  if (body.sortOrder !== undefined) settings.sortOrder = Number(body.sortOrder);
  if (body.allowOrder !== undefined) settings.allowOrder = Boolean(body.allowOrder);
  if (body.seoTitle !== undefined) settings.seoTitle = String(body.seoTitle);
  if (body.seoDescription !== undefined) {
    settings.seoDescription = String(body.seoDescription);
  }
  if (body.customSlug !== undefined) settings.customSlug = String(body.customSlug);

  try {
    await updateCatalogDisplaySettings(blingProductId, settings);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar produto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
