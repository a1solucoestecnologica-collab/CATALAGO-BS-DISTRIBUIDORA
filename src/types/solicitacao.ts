import type { VariantVisual } from "@/types/catalog";
import type { BlingTechnicalIds } from "@/types/catalog";

export type SolicitacaoCliente = {
  cliente_id: string;
  nome: string;
  whatsapp: string;
  email: string;
  empresa?: string;
};

export type SolicitacaoItemVisual = {
  nome: string;
  codigo: string;
  sku: string;
  categoria: string;
  quantidade: number;
  preco_exibido: number;
  variacoes?: VariantVisual;
};

export type SolicitacaoItemTecnico = BlingTechnicalIds & {
  bling_category_id?: string;
  quantidade: number;
  preco_exibido: number;
};

export type SolicitacaoItem = {
  visual: SolicitacaoItemVisual;
  tecnico: SolicitacaoItemTecnico;
};

export type SolicitacaoOrigem = "catalogo_online";

export type Solicitacao = {
  solicitacao_id: string;
  data: string;
  hora: string;
  cliente: SolicitacaoCliente;
  origem: SolicitacaoOrigem;
  itens: SolicitacaoItem[];
  observacoes?: string;
  criado_em: string;
};

/** Entrada validada — apenas IDs e quantidades do cliente. */
export type SolicitacaoSubmitInput = {
  cliente_id: string;
  itens: Array<{
    bling_product_id: string;
    bling_variant_id?: string;
    bling_attribute_ids?: Record<string, string>;
    quantidade: number;
  }>;
  observacoes?: string;
};

export type SolicitacaoCreateInput = {
  cliente_id: string;
  itens: SolicitacaoItem[];
  observacoes?: string;
};
