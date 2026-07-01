-- Catálogo Online — persistência de clientes e solicitações
-- Execute no SQL Editor do Supabase ou via CLI de migrações.

CREATE TABLE IF NOT EXISTS clientes (
  cliente_id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  empresa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes (whatsapp);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_email ON clientes (email);

CREATE TABLE IF NOT EXISTS solicitacoes (
  solicitacao_id UUID PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes (cliente_id),
  status TEXT NOT NULL DEFAULT 'criada',
  dados JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_cliente_id ON solicitacoes (cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON solicitacoes (created_at);
