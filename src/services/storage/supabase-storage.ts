import { randomUUID } from "crypto";
import type { Cliente, ClienteRegistroInput } from "@/types/cliente";
import type { Solicitacao, SolicitacaoCreateInput } from "@/types/solicitacao";
import type { CatalogStorage } from "@/services/storage/types";
import { normalizeEmail, normalizePhone } from "@/services/storage/normalize";
import { getSupabaseAdmin } from "@/services/storage/supabase-admin";

type ClienteRow = {
  cliente_id: string;
  nome: string;
  whatsapp: string;
  email: string;
  empresa: string | null;
  created_at: string;
  updated_at: string;
};

type SolicitacaoDados = {
  data: string;
  hora: string;
  cliente: Solicitacao["cliente"];
  origem: Solicitacao["origem"];
  itens: Solicitacao["itens"];
  observacoes?: string;
};

function rowToCliente(row: ClienteRow): Cliente {
  return {
    cliente_id: row.cliente_id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    email: row.email,
    empresa: row.empresa ?? undefined,
    criado_em: row.created_at,
    atualizado_em: row.updated_at,
  };
}

export class SupabaseCatalogStorage implements CatalogStorage {
  async registerCliente(input: ClienteRegistroInput): Promise<Cliente> {
    const whatsapp = normalizePhone(input.whatsapp);
    const email = normalizeEmail(input.email);
    const supabase = getSupabaseAdmin();

    const existing =
      (await this.lookupCliente({ whatsapp })) ??
      (await this.lookupCliente({ email }));
    if (existing) return existing;

    const now = new Date().toISOString();
    const cliente_id = randomUUID();
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        cliente_id,
        nome: input.nome.trim(),
        whatsapp,
        email,
        empresa: input.empresa?.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        const dup =
          (await this.lookupCliente({ whatsapp })) ??
          (await this.lookupCliente({ email }));
        if (dup) return dup;
      }
      throw new Error(error.message);
    }

    return rowToCliente(data as ClienteRow);
  }

  async lookupCliente(input: {
    whatsapp?: string;
    email?: string;
  }): Promise<Cliente | null> {
    const supabase = getSupabaseAdmin();

    if (input.whatsapp) {
      const w = normalizePhone(input.whatsapp);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("whatsapp", w)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return rowToCliente(data as ClienteRow);
    }

    if (input.email) {
      const e = normalizeEmail(input.email);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("email", e)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return rowToCliente(data as ClienteRow);
    }

    return null;
  }

  async getClienteById(id: string): Promise<Cliente | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("cliente_id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return rowToCliente(data as ClienteRow);
  }

  async createSolicitacao(input: SolicitacaoCreateInput): Promise<Solicitacao> {
    const cliente = await this.getClienteById(input.cliente_id);
    if (!cliente) throw new Error("Cliente não encontrado.");

    const now = new Date();
    const solicitacao_id = randomUUID();
    const solicitacao: Solicitacao = {
      solicitacao_id,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      cliente: {
        cliente_id: cliente.cliente_id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
        empresa: cliente.empresa,
      },
      origem: "catalogo_online",
      itens: input.itens,
      observacoes: input.observacoes?.trim() || undefined,
      criado_em: now.toISOString(),
    };

    const dados: SolicitacaoDados = {
      data: solicitacao.data,
      hora: solicitacao.hora,
      cliente: solicitacao.cliente,
      origem: solicitacao.origem,
      itens: solicitacao.itens,
      observacoes: solicitacao.observacoes,
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("solicitacoes").insert({
      solicitacao_id,
      cliente_id: input.cliente_id,
      status: "criada",
      dados,
      created_at: solicitacao.criado_em,
    });

    if (error) throw new Error(error.message);
    return solicitacao;
  }
}
