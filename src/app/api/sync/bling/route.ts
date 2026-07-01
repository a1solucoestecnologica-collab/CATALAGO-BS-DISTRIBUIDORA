import { NextResponse } from "next/server";
import { triggerManualBlingSync } from "@/services/sync/bling-sync-scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  triggerManualBlingSync();
  return NextResponse.json({
    ok: true,
    message:
      "Sincronização iniciada em background. A sincronização agendada não será interrompida.",
  });
}
