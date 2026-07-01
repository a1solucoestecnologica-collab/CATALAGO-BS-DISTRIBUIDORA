import { NextResponse } from "next/server";
import { runInitialImportStep } from "@/services/catalog/bling-initial-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await runInitialImportStep();
    return NextResponse.json(result);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro na importação inicial.";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
