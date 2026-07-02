/** Identificadores técnicos obrigatórios — nunca substituir por texto. */
export type BlingTechnicalIds = {
  bling_product_id: string;
  bling_variant_id?: string;
  bling_color_id?: string;
  bling_size_id?: string;
  bling_model_id?: string;
  bling_attribute_ids?: Record<string, string>;
  sku: string;
  codigo: string;
  barcode?: string;
};

/** Camada visual para exibição ao usuário. */
export type VariantVisual = {
  color?: string;
  size?: string;
  model?: string;
  [attribute: string]: string | undefined;
};

/** Cada opção representa exatamente um SKU/variação existente no Bling. */
export type CatalogVariantOption = {
  /** ID do produto-variação no Bling. */
  id: string;
  label: string;
  price: number;
  stock: number;
  imageUrl?: string;
  visual: VariantVisual;
  technical: BlingTechnicalIds;
};

export type CatalogCategory = {
  bling_category_id: string;
  name: string;
};

export type CatalogDisplaySettings = {
  visible: boolean;
  featured: boolean;
  promotion: boolean;
  isNew: boolean;
  sortOrder: number;
  allowOrder: boolean;
  seoTitle?: string;
  seoDescription?: string;
  customSlug?: string;
};

export type CatalogProduct = {
  technical: BlingTechnicalIds;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  category: CatalogCategory;
  brand?: string;
  brandId?: string;
  imageUrl: string;
  galleryUrls?: string[];
  description: string;
  unit?: string;
  weight?: number;
  situation?: string;
  stock: number;
  formato?: string;
  /** Lista plana — uma entrada por SKU Bling (sem combinações inválidas). */
  variants?: CatalogVariantOption[];
  /** Configurações de vitrine — não sincronizadas com o Bling. */
  display?: CatalogDisplaySettings;
};

/** Linha persistida no carrinho — somente IDs e quantidade. */
export type CartLineStored = {
  bling_product_id: string;
  bling_variant_id?: string;
  bling_attribute_ids?: Record<string, string>;
  quantity: number;
};

/** Linha resolvida para exibição (reconstruída a partir do Bling). */
export type CartLineDisplay = CartLineStored & {
  name: string;
  slug: string;
  imageUrl: string;
  sku: string;
  unitPrice: number;
  variantLabel?: string;
};

/** Payload mínimo enviado ao servidor para solicitação. */
export type CartLineSubmit = {
  bling_product_id: string;
  bling_variant_id?: string;
  bling_attribute_ids?: Record<string, string>;
  quantidade: number;
};

