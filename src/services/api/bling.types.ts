/**
 * Tipos de referência para a API Bling v3.
 * @see https://developer.bling.com.br/referencia
 */

export type BlingMoneyString = string | number;

export type BlingRef = { id?: number | string };

export type BlingProductImage = {
  link?: string;
  linkMiniatura?: string;
  validade?: string;
  ordem?: number;
  anexo?: { id?: number | string };
  anexoVinculo?: { id?: number | string };
};

export type BlingProductMedia = {
  imagens?: {
    internas?: BlingProductImage[];
    externas?: BlingProductImage[];
    imagensURL?: BlingProductImage[];
  };
  video?: { url?: string };
};

export type BlingProductStock = {
  minimo?: number;
  maximo?: number;
  crossdocking?: number;
  localizacao?: string;
  saldoVirtualTotal?: number;
};

export type BlingVariationAttribute = {
  id?: number | string;
  nome?: string;
  valor?: string;
};

export type BlingProductVariation = {
  id?: number | string;
  nome?: string;
  codigo?: string;
  preco?: BlingMoneyString;
  situacao?: string;
  gtin?: string;
  estoque?: BlingProductStock;
  midia?: BlingProductMedia;
  variacao?: {
    nome?: string;
    ordem?: number;
    produtoPai?: BlingRef;
  };
  /** Atributos estruturados quando retornados pela API. */
  atributos?: BlingVariationAttribute[];
};

export type BlingProductSummary = {
  id: number | string;
  nome?: string;
  codigo?: string;
  preco?: BlingMoneyString;
  precoCusto?: BlingMoneyString;
  precoPromocional?: BlingMoneyString;
  descricaoCurta?: string;
  descricao?: string;
  tipo?: string;
  situacao?: string;
  formato?: string;
  unidade?: string;
  pesoLiquido?: number | string;
  pesoBruto?: number | string;
  gtin?: string;
  gtinEmbalagem?: string;
  marca?: string | (BlingRef & { descricao?: string; nome?: string });
  categoria?: BlingRef & { descricao?: string; nome?: string };
  estoque?: BlingProductStock;
  midia?: BlingProductMedia;
  variacao?: {
    nome?: string;
    ordem?: number;
    produtoPai?: BlingRef;
  };
  fornecedor?: BlingRef;
};

export type BlingListResponse<T> = {
  data?: T[];
};

export type BlingSingleResponse<T> = {
  data?: T;
};

export type BlingStockBalance = {
  produto?: BlingRef;
  saldoFisicoTotal?: number;
  saldoVirtualTotal?: number;
};
