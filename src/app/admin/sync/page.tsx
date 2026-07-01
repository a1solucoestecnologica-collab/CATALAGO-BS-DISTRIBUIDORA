import Link from "next/link";
import { BlingSyncPanel } from "@/components/admin/BlingSyncPanel";

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
        Sincronização automática a cada 15 minutos com o Bling.
      </p>
      <BlingSyncPanel />
    </div>
  );
}
