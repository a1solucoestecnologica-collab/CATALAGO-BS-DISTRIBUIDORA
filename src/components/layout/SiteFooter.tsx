import Link from "next/link";
import { STORE_BLUE } from "@/lib/store-theme";

export function SiteFooter() {
  return (
    <footer className="text-white" style={{ backgroundColor: STORE_BLUE }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-black uppercase tracking-wide">
              Catálogo Online
            </p>
            <p className="mt-3 text-sm text-white/90 leading-relaxed">
              Exibe produtos do Bling e permite montar solicitações de
              orçamento. Não realiza vendas, pagamentos ou pedidos.
            </p>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide">
              Navegação
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/90">
              <li>
                <Link href="/#catalogo" className="hover:underline">
                  Ver catálogo
                </Link>
              </li>
              <li>
                <Link href="/admin/sync" className="hover:underline">
                  Webhooks Bling
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 bg-black/10 py-4 text-center text-[10px] leading-relaxed text-white/85 sm:text-[11px]">
        © {new Date().getFullYear()} Catálogo Online — Dados de produtos
        originados do Bling.
      </div>
    </footer>
  );
}
