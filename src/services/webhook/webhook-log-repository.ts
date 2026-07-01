import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/services/storage/supabase-admin";
import { BLING_INTEGRATION_ID } from "@/services/sync/integration";
import type {
  InitialImportProgressPayload,
  WebhookLogRecord,
  WebhookLogStatus,
  WebhookStatusView,
} from "@/services/webhook/types";
import {
  INITIAL_IMPORT_EVENT,
  INITIAL_IMPORT_PROGRESS_EVENT,
  CURRENT_IMPORT_VERSION,
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

async function findInitialImportSuccessLogId(
  integrationId = BLING_INTEGRATION_ID,
): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("webhook_logs")
    .select("id")
    .eq("integration_id", integrationId)
    .eq("evento", INITIAL_IMPORT_EVENT)
    .eq("status", "success")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/**
 * Marca a importação inicial como concluída.
 * Respeita idx_webhook_logs_initial_import_success_once: atualiza o success
 * existente (ex.: v1) em vez de inserir outro registro.
 */
export async function completeInitialImport(
  payload: Record<string, unknown>,
  integrationId = BLING_INTEGRATION_ID,
): Promise<void> {
  const existingId = await findInitialImportSuccessLogId(integrationId);

  if (existingId) {
    const { error } = await getSupabaseAdmin()
      .from("webhook_logs")
      .update({
        payload,
        erro: null,
        recebido_em: new Date().toISOString(),
      })
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    return;
  }

  try {
    await createWebhookLog({
      evento: INITIAL_IMPORT_EVENT,
      payload,
      status: "success",
      integrationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("idx_webhook_logs_initial_import_success_once")) {
      throw e;
    }

    const racedId = await findInitialImportSuccessLogId(integrationId);
    if (!racedId) throw e;

    const { error } = await getSupabaseAdmin()
      .from("webhook_logs")
      .update({
        payload,
        erro: null,
        recebido_em: new Date().toISOString(),
      })
      .eq("id", racedId);
    if (error) throw new Error(error.message);
  }
}

export async function hasInitialImportCompleted(
  integrationId = BLING_INTEGRATION_ID,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("webhook_logs")
    .select("payload")
    .eq("integration_id", integrationId)
    .eq("evento", INITIAL_IMPORT_EVENT)
    .eq("status", "success")
    .order("recebido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.payload || typeof data.payload !== "object") return false;

  const version =
    (data.payload as { importVersion?: number }).importVersion ?? 1;
  return version >= CURRENT_IMPORT_VERSION;
}

export async function getInitialImportProgress(
  integrationId = BLING_INTEGRATION_ID,
): Promise<InitialImportProgressPayload | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("webhook_logs")
    .select("payload")
    .eq("integration_id", integrationId)
    .eq("evento", INITIAL_IMPORT_PROGRESS_EVENT)
    .order("recebido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.payload || typeof data.payload !== "object") return null;
  return data.payload as InitialImportProgressPayload;
}

export async function saveInitialImportProgress(
  payload: InitialImportProgressPayload,
  integrationId = BLING_INTEGRATION_ID,
): Promise<void> {
  await createWebhookLog({
    evento: INITIAL_IMPORT_PROGRESS_EVENT,
    payload: payload as unknown as Record<string, unknown>,
    status: "ignored",
    integrationId,
  });
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
