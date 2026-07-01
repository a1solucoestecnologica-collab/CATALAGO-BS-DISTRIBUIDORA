export type WebhookLogStatus = "success" | "error" | "ignored";

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
