"use client";

import { useCallback, useEffect, useState } from "react";
import type { SyncStatusView } from "@/services/sync/types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

const STATUS_LABEL: Record<SyncStatusView["status"], string> = {
  online: "Online",
  error: "Erro",
  syncing: "Sincronizando…",
  not_configured: "Não configurado",
};

export function BlingSyncPanel() {
  const [status, setStatus] = useState<SyncStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sync/bling/status");
    const json = (await res.json()) as SyncStatusView;
    setStatus(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function handleSyncNow() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/sync/bling", { method: "POST" });
      const json = (await res.json()) as { message?: string; error?: string };
      setMessage(json.message ?? json.error ?? "");
      setTimeout(() => void refresh(), 2000);
    } catch {
      setMessage("Falha ao iniciar sincronização.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        Carregando status da sincronização…
      </div>
    );
  }

  const s = status!;
  const statusColor =
    s.status === "online"
      ? "text-emerald-700"
      : s.status === "error"
        ? "text-rose-600"
        : s.status === "syncing"
          ? "text-amber-600"
          : "text-slate-500";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">
        Sincronização Bling
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-600">Status</dt>
          <dd className={`font-bold ${statusColor}`}>
            {STATUS_LABEL[s.status]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Produtos ativos</dt>
          <dd>{s.productCount}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Última sincronização</dt>
          <dd>{formatDate(s.lastSyncAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Próxima sincronização</dt>
          <dd>{formatDate(s.nextSyncAt)}</dd>
        </div>
      </dl>
      {s.lastError ? (
        <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <span className="font-semibold">Último erro:</span> {s.lastError}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-xs text-slate-600">{message}</p>
      ) : null}
      <button
        type="button"
        disabled={syncing || s.syncInProgress}
        onClick={handleSyncNow}
        className="mt-4 rounded-md bg-[#0066CC] px-4 py-2 text-sm font-bold text-white hover:bg-[#0052a3] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {syncing || s.syncInProgress ? "Sincronizando…" : "Sincronizar agora"}
      </button>
    </section>
  );
}
