"use client";

import type { Solicitacao } from "@/types/solicitacao";
import { formatBRL } from "@/lib/format";
import { X } from "lucide-react";

type Props = {
  solicitacao: Solicitacao;
  onClose: () => void;
};

export function SolicitacaoSuccess({ solicitacao, onClose }: Props) {
  const total = solicitacao.itens.reduce(
    (s, i) => s + i.visual.preco_exibido * i.visual.quantidade,
    0,
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-lg">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">
              Solicitação gerada
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 hover:bg-slate-100"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">
            ID: {solicitacao.solicitacao_id}
          </p>
          <p className="mt-1 text-slate-600">
            {solicitacao.data} às {solicitacao.hora}
          </p>
          <p className="mt-4 text-xs font-bold uppercase text-slate-500">
            Cliente
          </p>
          <p>{solicitacao.cliente.nome}</p>
          <p className="text-slate-600">{solicitacao.cliente.email}</p>
          <p className="mt-4 text-xs font-bold uppercase text-slate-500">
            Itens ({solicitacao.itens.length})
          </p>
          <ul className="mt-2 space-y-2">
            {solicitacao.itens.map((item, idx) => (
              <li key={idx} className="rounded border border-slate-100 p-2">
                <p className="font-medium">{item.visual.nome}</p>
                <p className="text-xs text-slate-500">
                  {item.visual.quantidade}x · {formatBRL(item.visual.preco_exibido)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-bold">
            Total estimado: {formatBRL(total)}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Sua solicitação foi registrada. O catálogo concluiu sua parte —
            outros sistemas poderão processar esta solicitação futuramente.
          </p>
        </div>
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-[#0066CC] py-3 text-sm font-bold text-white"
          >
            Continuar navegando
          </button>
        </div>
      </aside>
    </>
  );
}
