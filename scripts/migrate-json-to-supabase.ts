/**
 * Importa data/store/clientes.json e data/store/solicitacoes.json para o Supabase.
 *
 * Uso (variáveis de ambiente obrigatórias):
 *   NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Exemplo local:
 *   npx tsx --env-file=.env.local scripts/migrate-json-to-supabase.ts
 */

import { readFile, access } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Cliente } from "../src/types/cliente";
import type { Solicitacao } from "../src/types/solicitacao";

const STORE_DIR = path.join(process.cwd(), "data", "store");
const CLIENTES_FILE = path.join(STORE_DIR, "clientes.json");
const SOLICITACOES_FILE = path.join(STORE_DIR, "solicitacoes.json");

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  if (!(await fileExists(file))) return [];
  const raw = await readFile(file, "utf-8");
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const normalizedUrl = url
    ? url.startsWith("http")
      ? url
      : `https://${url}`
    : undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!normalizedUrl || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(normalizedUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function migrateClientes(): Promise<number> {
  const clientes = await readJsonArray<Cliente>(CLIENTES_FILE);
  if (clientes.length === 0) {
    console.log("clientes.json: vazio ou inexistente — nada a importar.");
    return 0;
  }

  const supabase = getSupabase();
  const rows = clientes.map((c) => ({
    cliente_id: c.cliente_id,
    nome: c.nome,
    whatsapp: c.whatsapp,
    email: c.email,
    empresa: c.empresa ?? null,
    created_at: c.criado_em,
    updated_at: c.atualizado_em,
  }));

  const { error } = await supabase.from("clientes").upsert(rows, {
    onConflict: "cliente_id",
  });
  if (error) throw new Error(`clientes: ${error.message}`);

  console.log(`clientes: ${rows.length} registro(s) importado(s).`);
  return rows.length;
}

async function migrateSolicitacoes(): Promise<number> {
  const list = await readJsonArray<Solicitacao>(SOLICITACOES_FILE);
  if (list.length === 0) {
    console.log("solicitacoes.json: vazio ou inexistente — nada a importar.");
    return 0;
  }

  const supabase = getSupabase();
  const rows = list.map((s) => ({
    solicitacao_id: s.solicitacao_id,
    cliente_id: s.cliente.cliente_id,
    status: "criada",
    dados: {
      data: s.data,
      hora: s.hora,
      cliente: s.cliente,
      origem: s.origem,
      itens: s.itens,
      observacoes: s.observacoes,
    },
    created_at: s.criado_em,
  }));

  const { error } = await supabase.from("solicitacoes").upsert(rows, {
    onConflict: "solicitacao_id",
  });
  if (error) throw new Error(`solicitacoes: ${error.message}`);

  console.log(`solicitacoes: ${rows.length} registro(s) importado(s).`);
  return rows.length;
}

async function main() {
  console.log("Migração JSON → Supabase\n");
  const c = await migrateClientes();
  const s = await migrateSolicitacoes();
  console.log(`\nConcluído: ${c} cliente(s), ${s} solicitação(ões).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
