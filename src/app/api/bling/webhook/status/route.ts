import { NextResponse } from "next/server";
import { getWebhookStatus } from "@/services/webhook/webhook-log-repository";
import { getBlingWebhookUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getWebhookStatus();
  return NextResponse.json({
    ...status,
    webhookUrl: getBlingWebhookUrl(),
  });
}
