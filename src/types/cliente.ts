export type Cliente = {
  cliente_id: string;
  nome: string;
  whatsapp: string;
  email: string;
  empresa?: string;
  criado_em: string;
  atualizado_em: string;
};

export type ClienteRegistroInput = {
  nome: string;
  whatsapp: string;
  email: string;
  empresa?: string;
};

export type ClienteLookupInput = {
  whatsapp?: string;
  email?: string;
};
