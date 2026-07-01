import { createHash } from "crypto";
import type { CatalogProduct } from "@/types/catalog";

export function hashCatalogProduct(product: CatalogProduct): string {
  return createHash("sha256")
    .update(JSON.stringify(product))
    .digest("hex");
}

export function productsContentEqual(
  a: CatalogProduct,
  b: CatalogProduct,
): boolean {
  return hashCatalogProduct(a) === hashCatalogProduct(b);
}
