import { NextResponse } from "next/server";
import { runBlingCatalogSync } from "@/services/sync/bling-sync-runner";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const result = await runBlingCatalogSync("cron");
  return NextResponse.json(result);
}
