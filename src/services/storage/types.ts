import type { Cliente, ClienteRegistroInput } from "@/types/cliente";
import type { Solicitacao, SolicitacaoCreateInput } from "@/types/solicitacao";

export interface CatalogStorage {
  registerCliente(input: ClienteRegistroInput): Promise<Cliente>;
  lookupCliente(input: {
    whatsapp?: string;
    email?: string;
  }): Promise<Cliente | null>;
  getClienteById(id: string): Promise<Cliente | null>;
  createSolicitacao(input: SolicitacaoCreateInput): Promise<Solicitacao>;
}
