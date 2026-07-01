"use client";

import { Package } from "lucide-react";
import { STORE_BLUE } from "@/lib/store-theme";

const items = [
  {
    icon: Package,
    text: "Produtos sincronizados com o Bling",
    hint: "Preços e estoque conforme o ERP",
  },
];

export function BenefitsBar() {
  return (
    <div className="border-b border-slate-200 bg-[#f4f9ff]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-3 py-2.5 text-[11px] font-semibold sm:px-6 sm:text-xs lg:px-8">
        {items.map((it) => (
          <div
            key={it.text}
            className="flex max-w-none items-start gap-2 text-slate-800"
          >
            <it.icon
              className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5"
              style={{ color: STORE_BLUE }}
              aria-hidden
            />
            <span>
              <span className="leading-tight">{it.text}</span>
              {it.hint ? (
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                  {it.hint}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
