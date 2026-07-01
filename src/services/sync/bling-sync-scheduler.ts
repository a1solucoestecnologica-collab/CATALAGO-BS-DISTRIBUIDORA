import { isBlingConfigured } from "@/services/api/bling-client";
import { runBlingCatalogSync } from "@/services/sync/bling-sync-runner";
import { getSyncState } from "@/services/sync/sync-repository";
import type { SyncStatusView, SyncTriggerSource } from "@/services/sync/types";
import { SYNC_INTERVAL_MS } from "@/services/sync/types";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let startupTriggered = false;

function fireAndForgetSync(trigger: SyncTriggerSource): void {
  void runBlingCatalogSync(trigger).catch((e) => {
    console.error("[bling-sync-scheduler]", e);
  });
}

export function startBlingSyncScheduler(): void {
  if (startupTriggered) return;
  startupTriggered = true;

  console.log("[bling-sync-scheduler] iniciando");

  void (async () => {
    if (!(await isBlingConfigured())) return;
    const state = await getSyncState().catch(() => null);
    const next = state?.next_sync_at
      ? new Date(state.next_sync_at).getTime()
      : 0;
    if (!state?.last_success_at || Date.now() >= next) {
      fireAndForgetSync("startup");
    }
  })();

  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    fireAndForgetSync("scheduled");
  }, SYNC_INTERVAL_MS);
}

export async function getBlingSyncStatus(): Promise<SyncStatusView> {
  if (!(await isBlingConfigured())) {
    return {
      status: "not_configured",
      lastSyncAt: null,
      nextSyncAt: null,
      productCount: 0,
      lastError: null,
      syncInProgress: false,
    };
  }

  const state = await getSyncState().catch(() => null);
  if (!state) {
    return {
      status: "online",
      lastSyncAt: null,
      nextSyncAt: new Date(Date.now() + SYNC_INTERVAL_MS).toISOString(),
      productCount: 0,
      lastError: null,
      syncInProgress: false,
    };
  }

  let status: SyncStatusView["status"] = "online";
  if (state.sync_in_progress) status = "syncing";
  else if (state.last_error) status = "error";

  return {
    status,
    lastSyncAt: state.last_success_at,
    nextSyncAt: state.next_sync_at,
    productCount: state.product_count,
    lastError: state.last_error,
    syncInProgress: state.sync_in_progress,
  };
}

export function triggerManualBlingSync(): void {
  fireAndForgetSync("manual");
}
