-- Garante que initial_import com sucesso ocorra apenas uma vez por integração.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_initial_import_success_once
  ON webhook_logs (integration_id)
  WHERE evento = 'initial_import' AND status = 'success';
