import Link from "next/link";
import { BlingWebhookPanel } from "@/components/admin/BlingWebhookPanel";
import { CatalogAdminPanel } from "@/components/admin/CatalogAdminPanel";

export default function AdminSyncPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="font-semibold text-[#0066CC] hover:underline">
          ← Voltar ao catálogo
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-black text-slate-900">Painel</h1>
      <p className="mb-6 text-sm text-slate-600">
        Integração com o Bling via webhooks — produtos atualizados em tempo
        real.
      </p>
      <div className="mb-8">
        <CatalogAdminPanel />
      </div>
      <BlingWebhookPanel />
    </div>
  );
}
