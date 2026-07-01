export type WebhookLogStatus = "success" | "error" | "ignored";

export const INITIAL_IMPORT_EVENT = "initial_import";

/** Progresso incremental da importação inicial (uma página por invocação). */
export const INITIAL_IMPORT_PROGRESS_EVENT = "initial_import_progress";

export type InitialImportProgressPayload = {
  nextPage: number;
  pagesCompleted: number;
  productsCreated: number;
  productsUpdated: number;
  productsUnchanged: number;
  productsMapped: number;
  startedAt: number;
};

export type WebhookLogRecord = {
  id: string;
  integration_id: string;
  evento: string;
  produto: string | null;
  payload: Record<string, unknown>;
  recebido_em: string;
  status: WebhookLogStatus;
  erro: string | null;
};

export type WebhookStatusView = {
  status: "online" | "error" | "not_configured";
  lastWebhookAt: string | null;
  lastEvent: string | null;
  webhooksProcessed: number;
  productCount: number;
  lastError: string | null;
};
