"use client";

import { useState } from "react";
import { useClient } from "@/contexts/client-context";
import { STORE_BLUE } from "@/lib/store-theme";

type Mode = "choose" | "register" | "lookup";

export function ClientIdentificationModal() {
  const { isModalOpen, register, lookup } = useClient();
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [lookupValue, setLookupValue] = useState("");

  if (!isModalOpen) return null;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ nome, whatsapp, email, empresa: empresa || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const v = lookupValue.trim();
    const isEmail = v.includes("@");
    try {
      await lookup(isEmail ? { email: v } : { whatsapp: v });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao localizar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
      >
        <h2
          id="client-modal-title"
          className="text-lg font-black text-slate-900"
        >
          Identificação
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Informe seus dados para montar solicitações de orçamento. Não é um
          login — apenas identificamos quem montou o carrinho.
        </p>

        {mode === "choose" ? (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="rounded py-3 text-sm font-bold text-white"
              style={{ backgroundColor: STORE_BLUE }}
              onClick={() => setMode("register")}
            >
              Primeira vez — cadastrar
            </button>
            <button
              type="button"
              className="rounded border-2 border-slate-200 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              onClick={() => setMode("lookup")}
            >
              Já me cadastrei — entrar com WhatsApp ou e-mail
            </button>
          </div>
        ) : null}

        {mode === "register" ? (
          <form className="mt-6 space-y-3" onSubmit={handleRegister}>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">
                Nome *
              </label>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">
                WhatsApp *
              </label>
              <input
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="5511999999999"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">
                E-mail *
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">
                Empresa (opcional)
              </label>
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded border py-2 text-sm font-semibold text-slate-600"
                onClick={() => setMode("choose")}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded py-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: STORE_BLUE }}
              >
                {loading ? "Salvando…" : "Continuar"}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "lookup" ? (
          <form className="mt-6 space-y-3" onSubmit={handleLookup}>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">
                WhatsApp ou e-mail
              </label>
              <input
                required
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="5511999999999 ou seu@email.com"
              />
            </div>
            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : null}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded border py-2 text-sm font-semibold text-slate-600"
                onClick={() => setMode("choose")}
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded py-2 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: STORE_BLUE }}
              >
                {loading ? "Buscando…" : "Continuar"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
