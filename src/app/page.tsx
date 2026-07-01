import { getProducts } from "@/services/api/products";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { CatalogNotConfigured } from "@/components/catalog/CatalogNotConfigured";
import { CatalogImporting } from "@/components/catalog/CatalogImporting";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await getProducts();

  if (!result.ok && result.reason === "not_configured") {
    return <CatalogNotConfigured />;
  }

  if (!result.ok && result.reason === "importing") {
    return <CatalogImporting />;
  }

  if (!result.ok) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-lg border border-rose-200 bg-white p-8">
          <h1 className="text-lg font-black text-slate-900">
            Erro ao carregar o catálogo
          </h1>
          <p className="mt-2 text-sm text-slate-600">{result.message}</p>
        </div>
      </div>
    );
  }

  return <CatalogPage products={result.products} />;
}
