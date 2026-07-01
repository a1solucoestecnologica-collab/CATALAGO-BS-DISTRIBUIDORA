import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/services/storage/supabase-admin";
import { BLING_INTEGRATION_ID } from "@/services/sync/integration";
import type {
  WebhookLogRecord,
  WebhookLogStatus,
  WebhookStatusView,
} from "@/services/webhook/types";
import { countActiveProducts } from "@/services/sync/catalog-product-repository";
import { isBlingConfigured } from "@/services/api/bling-client";

export async function createWebhookLog(input: {
  evento: string;
  produto?: string | null;
  payload: Record<string, unknown>;
  status: WebhookLogStatus;
  erro?: string | null;
  integrationId?: string;
}): Promise<string> {
  const id = randomUUID();
  const { error } = await getSupabaseAdmin().from("webhook_logs").insert({
    id,
    integration_id: input.integrationId ?? BLING_INTEGRATION_ID,
    evento: input.evento,
    produto: input.produto ?? null,
    payload: input.payload,
    status: input.status,
    erro: input.erro ?? null,
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function getLatestWebhookLog(): Promise<WebhookLogRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("webhook_logs")
    .select("*")
    .eq("integration_id", BLING_INTEGRATION_ID)
    .order("recebido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as WebhookLogRecord | null;
}

export async function countProcessedWebhooks(): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("webhook_logs")
    .select("id", { count: "exact", head: true })
    .eq("integration_id", BLING_INTEGRATION_ID)
    .eq("status", "success");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getWebhookStatus(): Promise<WebhookStatusView> {
  if (!(await isBlingConfigured())) {
    return {
      status: "not_configured",
      lastWebhookAt: null,
      lastEvent: null,
      webhooksProcessed: 0,
      productCount: 0,
      lastError: null,
    };
  }

  try {
    const [latest, processed, productCount] = await Promise.all([
      getLatestWebhookLog(),
      countProcessedWebhooks(),
      countActiveProducts(),
    ]);

    const lastError =
      latest?.status === "error" ? latest.erro : null;

    return {
      status: lastError ? "error" : "online",
      lastWebhookAt: latest?.recebido_em ?? null,
      lastEvent: latest?.evento ?? null,
      webhooksProcessed: processed,
      productCount,
      lastError,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao ler webhooks.";
    return {
      status: "error",
      lastWebhookAt: null,
      lastEvent: null,
      webhooksProcessed: 0,
      productCount: 0,
      lastError: message,
    };
  }
}
