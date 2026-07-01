import { NextResponse } from "next/server";
import { verifyBlingWebhookSignature } from "@/services/webhook/bling-webhook-signature";
import {
  extractWebhookEvent,
  extractWebhookProductId,
  processBlingWebhookPayload,
} from "@/services/catalog/bling-product-sync";
import { createWebhookLog } from "@/services/webhook/webhook-log-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-bling-signature-256");

  if (!verifyBlingWebhookSignature(rawBody, signature)) {
    try {
      await createWebhookLog({
        evento: "invalid_signature",
        payload: { bodyLength: rawBody.length },
        status: "error",
        erro: "Assinatura do webhook inválida ou ausente.",
      });
    } catch {
      // ignora falha ao persistir log
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    try {
      await createWebhookLog({
        evento: "invalid_json",
        payload: { raw: rawBody.slice(0, 500) },
        status: "error",
        erro: "Payload JSON inválido.",
      });
    } catch {
      // ignora falha ao persistir log
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const evento = extractWebhookEvent(payload);
  const produto = extractWebhookProductId(payload);

  try {
    const result = await processBlingWebhookPayload(payload);
    const logStatus = result.outcome === "skipped" ? "ignored" : "success";

    await createWebhookLog({
      evento: result.evento,
      produto: result.produto,
      payload,
      status: logStatus,
    });

    return NextResponse.json({
      ok: true,
      evento: result.evento,
      produto: result.produto,
      outcome: result.outcome,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao processar webhook.";

    try {
      await createWebhookLog({
        evento,
        produto,
        payload,
        status: "error",
        erro: message,
      });
    } catch {
      // ignora falha ao persistir log
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
