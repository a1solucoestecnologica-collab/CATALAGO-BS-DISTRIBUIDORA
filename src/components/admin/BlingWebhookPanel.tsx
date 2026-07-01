"use client";

import { useCallback, useEffect, useState } from "react";
import type { WebhookStatusView } from "@/services/webhook/types";

type WebhookStatusResponse = WebhookStatusView & {
  webhookUrl: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

const STATUS_LABEL: Record<WebhookStatusView["status"], string> = {
  online: "Online",
  error: "Erro",
  not_configured: "Não configurado",
};

export function BlingWebhookPanel() {
  const [status, setStatus] = useState<WebhookStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bling/webhook/status");
    const json = (await res.json()) as WebhookStatusResponse;
    setStatus(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        Carregando status dos webhooks…
      </div>
    );
  }

  const s = status!;
  const statusColor =
    s.status === "online"
      ? "text-emerald-700"
      : s.status === "error"
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Webhooks Bling</h2>
      <p className="mt-2 text-xs text-slate-500">
        Os produtos são atualizados em tempo real quando o Bling envia eventos
        para o endpoint abaixo.
      </p>
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
          <dt className="font-semibold text-slate-600">Último webhook</dt>
          <dd>{formatDate(s.lastWebhookAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-600">Último evento</dt>
          <dd>{s.lastEvent ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-600">
            Webhooks processados
          </dt>
          <dd>{s.webhooksProcessed}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-600">URL do webhook</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-700">
            {s.webhookUrl}
          </dd>
        </div>
      </dl>
      {s.lastError ? (
        <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <span className="font-semibold">Último erro:</span> {s.lastError}
        </p>
      ) : null}
    </section>
  );
}
