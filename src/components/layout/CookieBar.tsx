"use client";

import { useEffect, useState } from "react";
import { STORE_BLUE } from "@/lib/store-theme";

const KEY = "catalogo-cookie-consent-v1";

export function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      try {
        if (!localStorage.getItem(KEY)) setVisible(true);
      } catch {
        setVisible(true);
      }
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
          Coletamos dados para melhorar desempenho e segurança, além de
          personalizar conteúdo. Ao continuar, você concorda com nossos{" "}
          <span className="font-semibold text-slate-800">termos de uso</span> e{" "}
          <span className="font-semibold text-slate-800">política de privacidade</span>.
        </p>
        <button
          type="button"
          className="shrink-0 rounded px-6 py-2.5 text-sm font-bold uppercase text-white transition hover:opacity-95"
          style={{ backgroundColor: STORE_BLUE }}
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          Concordar e fechar
        </button>
      </div>
    </div>
  );
}
