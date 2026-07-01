import { NextResponse } from "next/server";
import { runInitialImportStep } from "@/services/catalog/bling-initial-import";
import {
  logInitialImport,
  logInitialImportError,
} from "@/services/catalog/initial-import-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  logInitialImport("API POST /api/bling/initial-import recebido");
  try {
    const result = await runInitialImportStep();
    logInitialImport("API resposta", { status: result.status });
    return NextResponse.json(result);
  } catch (e) {
    logInitialImportError("API POST /api/bling/initial-import", e);
    const message =
      e instanceof Error ? e.message : "Erro na importação inicial.";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
