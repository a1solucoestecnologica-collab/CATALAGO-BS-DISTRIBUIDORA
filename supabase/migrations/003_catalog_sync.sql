-- =============================================================================
-- Catálogo Online — cache de produtos e sincronização Bling
-- Execute no SQL Editor do Supabase após 001 e 002.
-- =============================================================================

-- Estado da sincronização por integração (preparado para múltiplas contas)
CREATE TABLE IF NOT EXISTS sync_state (
  integration_id UUID PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  last_error TEXT,
  product_count INTEGER NOT NULL DEFAULT 0,
  sync_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
  sync_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produtos do catálogo (cache local — nunca DELETE, apenas inativar)
CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  bling_product_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  data JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  bling_updated_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (integration_id, bling_product_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_integration_active
  ON catalog_products (integration_id, active);

CREATE INDEX IF NOT EXISTS idx_catalog_products_slug
  ON catalog_products (integration_id, slug);

CREATE INDEX IF NOT EXISTS idx_catalog_products_bling_id
  ON catalog_products (bling_product_id);

-- Histórico de sincronizações
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  products_fetched INTEGER NOT NULL DEFAULT 0,
  products_created INTEGER NOT NULL DEFAULT 0,
  products_updated INTEGER NOT NULL DEFAULT 0,
  products_inactivated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_started
  ON sync_logs (integration_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_logs_status
  ON sync_logs (status);

-- updated_at automático
CREATE OR REPLACE FUNCTION sync_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_state_updated_at ON sync_state;
CREATE TRIGGER trg_sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION sync_set_updated_at();

DROP TRIGGER IF EXISTS trg_catalog_products_updated_at ON catalog_products;
CREATE TRIGGER trg_catalog_products_updated_at
  BEFORE UPDATE ON catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_set_updated_at();

-- Estado inicial integração Bling (UUID fixo — mesmo do bling_tokens)
INSERT INTO sync_state (integration_id, next_sync_at)
VALUES ('a0000000-0000-4000-8000-000000000001', NOW())
ON CONFLICT (integration_id) DO NOTHING;
