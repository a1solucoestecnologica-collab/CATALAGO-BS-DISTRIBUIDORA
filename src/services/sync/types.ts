/** UUID fixo da integração Bling — preparado para múltiplas contas futuras. */
export const BLING_INTEGRATION_ID = "a0000000-0000-4000-8000-000000000001";

export const SYNC_INTERVAL_MS = 15 * 60 * 1000;

export type SyncTriggerSource = "scheduled" | "startup" | "manual" | "cron";

export type SyncLogStatus = "running" | "success" | "error" | "skipped";

export type SyncLogRecord = {
  id: string;
  integration_id: string;
  trigger_source: SyncTriggerSource;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: SyncLogStatus;
  products_fetched: number;
  products_created: number;
  products_updated: number;
  products_inactivated: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

export type SyncStateRecord = {
  integration_id: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  next_sync_at: string | null;
  last_error: string | null;
  product_count: number;
  sync_in_progress: boolean;
  sync_started_at: string | null;
};

export type SyncRunResult =
  | {
      ok: true;
      skipped?: boolean;
      logId: string;
      productsFetched: number;
      productsCreated: number;
      productsUpdated: number;
      productsInactivated: number;
      durationMs: number;
    }
  | { ok: false; skipped?: boolean; error: string; logId?: string };

export type SyncStatusView = {
  status: "online" | "error" | "syncing" | "not_configured";
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  productCount: number;
  lastError: string | null;
  syncInProgress: boolean;
};
