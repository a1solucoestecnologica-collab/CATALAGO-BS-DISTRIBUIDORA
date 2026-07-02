-- Configurações de exibição do catálogo (independentes do Bling / ERP)
ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS catalog_visible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS catalog_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catalog_promotion BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catalog_new BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catalog_sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_allow_order BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS custom_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_catalog_products_visible_sort
  ON catalog_products (integration_id, catalog_visible, catalog_sort_order)
  WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_products_custom_slug
  ON catalog_products (integration_id, custom_slug)
  WHERE custom_slug IS NOT NULL AND custom_slug <> '';
