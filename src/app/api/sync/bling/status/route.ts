import { NextResponse } from "next/server";
import { getBlingSyncStatus } from "@/services/sync/bling-sync-scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getBlingSyncStatus();
    return NextResponse.json(status);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao obter status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
