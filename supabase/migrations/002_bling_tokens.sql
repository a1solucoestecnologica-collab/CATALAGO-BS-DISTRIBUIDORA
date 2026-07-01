-- =============================================================================
-- Catálogo Online — tokens OAuth do Bling
-- Execute no SQL Editor do Supabase (Production).
-- =============================================================================

-- Remove tabela antiga (schema TEXT id) se existir
DROP TABLE IF EXISTS bling_tokens;

CREATE TABLE bling_tokens (
  id UUID PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  token_type TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bling_tokens IS
  'Tokens OAuth do Bling — um registro por integração (UPSERT por id).';

COMMENT ON COLUMN bling_tokens.id IS
  'UUID fixo da integração Bling no catálogo.';

-- Atualiza updated_at automaticamente em cada UPDATE
CREATE OR REPLACE FUNCTION bling_tokens_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bling_tokens_updated_at
  BEFORE UPDATE ON bling_tokens
  FOR EACH ROW
  EXECUTE FUNCTION bling_tokens_set_updated_at();

-- =============================================================================
-- Verificação após executar:
-- SELECT id, expires_at, token_type, scope, created_at, updated_at
-- FROM bling_tokens;
-- =============================================================================
