"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportStepResponse = {
  status: "skipped" | "in_progress" | "complete" | "error";
  nextPage?: number;
  message?: string;
};

export function CatalogImporting() {
  const router = useRouter();
  const running = useRef(false);
  const [statusText, setStatusText] = useState("Preparando importação…");
  const [error, setError] = useState<string | null>(null);

  const runStep = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const res = await fetch("/api/bling/initial-import", { method: "POST" });
      const json = (await res.json()) as ImportStepResponse;

      if (json.status === "complete" || json.status === "skipped") {
        setStatusText("Importação concluída. Atualizando catálogo…");
        router.refresh();
        return;
      }

      if (json.status === "error") {
        setError(json.message ?? "Erro na importação inicial.");
        running.current = false;
        setTimeout(() => {
          setError(null);
          void runStep();
        }, 5000);
        return;
      }

      if (json.status === "in_progress") {
        setStatusText(
          json.nextPage
            ? `Importando produtos… (página ${json.nextPage})`
            : "Importando produtos…",
        );
        running.current = false;
        setTimeout(() => void runStep(), 1500);
        return;
      }

      running.current = false;
      setTimeout(() => void runStep(), 3000);
    } catch {
      setError("Falha de comunicação ao importar produtos.");
      running.current = false;
    }
  }, [router]);

  useEffect(() => {
    void runStep();
  }, [runStep]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">
          Catálogo em importação
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Os produtos estão sendo importados do Bling em segundo plano. Esta
          página atualiza automaticamente quando o processo terminar.
        </p>
        <p className="mt-4 text-xs font-medium text-[#0066CC]">{statusText}</p>
        {error ? (
          <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </p>
        ) : (
          <div
            className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0066CC]"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
