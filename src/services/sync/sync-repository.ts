import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/services/storage/supabase-admin";
import type {
  SyncLogRecord,
  SyncLogStatus,
  SyncStateRecord,
  SyncTriggerSource,
} from "@/services/sync/types";
import { BLING_INTEGRATION_ID, SYNC_INTERVAL_MS } from "@/services/sync/types";

export async function getSyncState(
  integrationId = BLING_INTEGRATION_ID,
): Promise<SyncStateRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sync_state")
    .select("*")
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SyncStateRecord | null;
}

export async function ensureSyncState(
  integrationId = BLING_INTEGRATION_ID,
): Promise<void> {
  const { error } = await getSupabaseAdmin().from("sync_state").upsert(
    {
      integration_id: integrationId,
      next_sync_at: new Date().toISOString(),
    },
    { onConflict: "integration_id" },
  );
  if (error) throw new Error(error.message);
}

export async function tryAcquireSyncLock(
  integrationId = BLING_INTEGRATION_ID,
): Promise<boolean> {
  await ensureSyncState(integrationId);
  const state = await getSyncState(integrationId);
  if (state?.sync_in_progress) {
    const started = state.sync_started_at
      ? new Date(state.sync_started_at).getTime()
      : 0;
    if (Date.now() - started < 30 * 60 * 1000) return false;
  }

  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("sync_state")
    .update({
      sync_in_progress: true,
      sync_started_at: now,
      last_sync_at: now,
    })
    .eq("integration_id", integrationId)
    .eq("sync_in_progress", false)
    .select("integration_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function releaseSyncLock(
  integrationId = BLING_INTEGRATION_ID,
  patch: {
    last_success_at?: string;
    next_sync_at?: string;
    last_error?: string | null;
    product_count?: number;
  },
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("sync_state")
    .update({
      sync_in_progress: false,
      sync_started_at: null,
      ...patch,
    })
    .eq("integration_id", integrationId);

  if (error) throw new Error(error.message);
}

export async function createSyncLog(
  trigger: SyncTriggerSource,
  integrationId = BLING_INTEGRATION_ID,
): Promise<string> {
  const id = randomUUID();
  const { error } = await getSupabaseAdmin().from("sync_logs").insert({
    id,
    integration_id: integrationId,
    trigger_source: trigger,
    status: "running",
    started_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function finishSyncLog(
  logId: string,
  patch: {
    status: SyncLogStatus;
    duration_ms: number;
    products_fetched: number;
    products_created: number;
    products_updated: number;
    products_inactivated: number;
    error_message?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("sync_logs")
    .update({
      ...patch,
      finished_at: new Date().toISOString(),
    })
    .eq("id", logId);

  if (error) throw new Error(error.message);
}

export async function getLatestSyncLog(
  integrationId = BLING_INTEGRATION_ID,
): Promise<SyncLogRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sync_logs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SyncLogRecord | null;
}

export function computeNextSyncAt(from = new Date()): string {
  return new Date(from.getTime() + SYNC_INTERVAL_MS).toISOString();
}
