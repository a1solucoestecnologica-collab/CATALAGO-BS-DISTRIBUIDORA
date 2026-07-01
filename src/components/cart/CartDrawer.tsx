"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useClient } from "@/contexts/client-context";
import { formatBRL } from "@/lib/format";
import { getCartLineKey } from "@/lib/catalog-variants";
import { SolicitacaoSuccess } from "@/components/cart/SolicitacaoSuccess";

export function CartDrawer() {
  const {
    isOpen,
    closeCart,
    lines,
    isResolving,
    setQuantity,
    removeLine,
    subtotal,
    observacoes,
    setObservacoes,
    submitSolicitacao,
    lastSolicitacao,
    clearLastSolicitacao,
  } = useCart();
  const { cliente, isIdentified, openIdentification } = useClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (lastSolicitacao) {
    return (
      <SolicitacaoSuccess
        solicitacao={lastSolicitacao}
        onClose={() => {
          clearLastSolicitacao();
          closeCart();
        }}
      />
    );
  }

  async function handleSubmit() {
    setError("");
    if (!isIdentified || !cliente) {
      openIdentification();
      return;
    }
    setSubmitting(true);
    try {
      await submitSolicitacao(cliente.cliente_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-slate-900/50 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
        onClick={closeCart}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md transform flex-col bg-white shadow-2xl transition duration-200 sm:max-w-lg ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
        aria-label="Carrinho lateral"
      >
        <div className="border-b border-slate-200 bg-[#0066CC] px-4 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                Montar solicitação
              </p>
              <h2 className="text-lg font-black uppercase tracking-wide">
                Carrinho
              </h2>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="rounded-full p-2 text-white/90 hover:bg-white/10"
              aria-label="Fechar carrinho"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isResolving && lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Carregando itens…
            </p>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium">Carrinho vazio</p>
              <p className="text-xs">
                Adicione produtos para gerar uma solicitação de orçamento.
              </p>
              <Link
                href="/#catalogo"
                onClick={closeCart}
                className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => {
                const lineKey = getCartLineKey(line);
                const lineTotal = line.unitPrice * line.quantity;
                return (
                  <li
                    key={lineKey}
                    className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                      {line.imageUrl ? (
                        <Image
                          src={line.imageUrl}
                          alt={line.name}
                          fill
                          sizes="80px"
                          className="object-contain p-1"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/produto/${line.slug}`}
                        onClick={closeCart}
                        className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-[#0066CC] hover:underline"
                      >
                        {line.name}
                      </Link>
                      {line.variantLabel ? (
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {line.variantLabel}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-500">SKU {line.sku}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          onClick={() =>
                            setQuantity(lineKey, line.quantity - 1)
                          }
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          onClick={() =>
                            setQuantity(lineKey, line.quantity + 1)
                          }
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                          onClick={() => removeLine(lineKey)}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {formatBRL(lineTotal)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <label className="block text-xs font-semibold text-slate-600">
            Observações (opcional)
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Informações adicionais para esta solicitação"
            />
          </label>
          <div className="mb-3 mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal estimado</span>
            <span className="text-lg font-bold text-slate-900">
              {formatBRL(subtotal)}
            </span>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Valores exibidos conforme cadastro no Bling. A solicitação não
            constitui compra nem pedido.
          </p>
          {error ? (
            <p className="mb-2 text-sm text-rose-600">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={lines.length === 0 || submitting || isResolving}
            onClick={handleSubmit}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#0066CC] py-3 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-[#0052a3] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Gerando solicitação…"
              : "Gerar solicitação de orçamento"}
          </button>
        </div>
      </aside>
    </>
  );
}
