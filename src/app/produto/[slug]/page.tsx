import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCatalogConfigurationStatus,
  getProductBySlug,
  getProducts,
} from "@/services/api/products";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { CatalogNotConfigured } from "@/components/catalog/CatalogNotConfigured";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  if (getCatalogConfigurationStatus() !== "configured") return [];
  const result = await getProducts();
  if (!result.ok) return [];
  return result.products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: "Produto" };
  }
  return {
    title: `${product.name} | Catálogo`,
    description: product.description.slice(0, 155) || product.name,
  };
}

export default async function ProductPage({ params }: PageProps) {
  if (getCatalogConfigurationStatus() !== "configured") {
    return <CatalogNotConfigured />;
  }

  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
