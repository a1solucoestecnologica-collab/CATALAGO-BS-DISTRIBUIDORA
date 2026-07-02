import { NextResponse } from "next/server";
import { listCatalogProductsForAdmin } from "@/services/sync/catalog-product-repository";
import { isBlingConfigured } from "@/services/api/bling-client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isBlingConfigured())) {
    return NextResponse.json({ error: "Bling não configurado." }, { status: 503 });
  }

  try {
    const products = await listCatalogProductsForAdmin();
    return NextResponse.json({ products });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar produtos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
