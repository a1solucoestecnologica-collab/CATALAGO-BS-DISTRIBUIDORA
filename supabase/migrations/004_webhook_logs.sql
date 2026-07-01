-- =============================================================================
-- Webhooks Bling — substitui sincronização agendada (sync_state / sync_logs)
-- =============================================================================

DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS sync_state;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL DEFAULT 'a0000000-0000-4000-8000-000000000001',
  evento TEXT NOT NULL,
  produto TEXT,
  payload JSONB NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_recebido_em
  ON webhook_logs (recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
  ON webhook_logs (status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration
  ON webhook_logs (integration_id);
