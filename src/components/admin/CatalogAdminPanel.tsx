"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogDisplaySettings } from "@/types/catalog";

type AdminProduct = {
  rowId: string;
  blingProductId: string;
  blingSlug: string;
  name: string;
  category: { name: string };
  display?: CatalogDisplaySettings;
};

type FormState = {
  visible: boolean;
  featured: boolean;
  promotion: boolean;
  isNew: boolean;
  sortOrder: number;
  allowOrder: boolean;
  seoTitle: string;
  seoDescription: string;
  customSlug: string;
};

function formFromProduct(p: AdminProduct): FormState {
  const d = p.display;
  return {
    visible: d?.visible !== false,
    featured: d?.featured ?? false,
    promotion: d?.promotion ?? false,
    isNew: d?.isNew ?? false,
    sortOrder: d?.sortOrder ?? 0,
    allowOrder: d?.allowOrder !== false,
    seoTitle: d?.seoTitle ?? "",
    seoDescription: d?.seoDescription ?? "",
    customSlug: d?.customSlug ?? "",
  };
}

export function CatalogAdminPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog-products");
      const json = (await res.json()) as {
        products?: AdminProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar.");
      setProducts(json.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.blingProductId.includes(q) ||
        p.category.name.toLowerCase().includes(q),
    );
  }, [products, query]);

  function openEdit(p: AdminProduct) {
    setSelected(p);
    setForm(formFromProduct(p));
    setMessage(null);
  }

  async function save() {
    if (!selected || !form) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/catalog-products/${selected.blingProductId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visible: form.visible,
            featured: form.featured,
            promotion: form.promotion,
            isNew: form.isNew,
            sortOrder: form.sortOrder,
            allowOrder: form.allowOrder,
            seoTitle: form.seoTitle,
            seoDescription: form.seoDescription,
            customSlug: form.customSlug,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar.");
      setMessage("Salvo com sucesso.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">
          Gerenciar catálogo
        </h2>
        <span className="text-xs text-slate-500">
          {products.length} produtos · independente do Bling
        </span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome, ID ou categoria…"
        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
      />

      {loading ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="p-2">Produto</th>
                <th className="p-2">Categoria</th>
                <th className="p-2">Visível</th>
                <th className="p-2">Ordem</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p) => (
                <tr key={p.blingProductId} className="border-t border-slate-100">
                  <td className="p-2 font-medium text-slate-800">{p.name}</td>
                  <td className="p-2 text-slate-600">{p.category.name}</td>
                  <td className="p-2">
                    {p.display?.visible !== false ? "Sim" : "Oculto"}
                  </td>
                  <td className="p-2">{p.display?.sortOrder ?? 0}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="font-bold text-[#0066CC] hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 ? (
            <p className="p-2 text-[10px] text-slate-400">
              Exibindo 200 de {filtered.length}. Refine a busca.
            </p>
          ) : null}
        </div>
      )}

      {selected && form ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">{selected.name}</h3>
          <p className="mb-3 text-[10px] text-slate-500">
            ID Bling: {selected.blingProductId}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) =>
                  setForm({ ...form, visible: e.target.checked })
                }
              />
              Mostrar no catálogo
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
              />
              Destacar
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.promotion}
                onChange={(e) =>
                  setForm({ ...form, promotion: e.target.checked })
                }
              />
              Promoção
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
              />
              Novo
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.allowOrder}
                onChange={(e) =>
                  setForm({ ...form, allowOrder: e.target.checked })
                }
              />
              Permitir pedido
            </label>
            <label className="text-xs">
              Ordenação
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              Slug personalizado
              <input
                type="text"
                value={form.customSlug}
                onChange={(e) =>
                  setForm({ ...form, customSlug: e.target.value })
                }
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              SEO título
              <input
                type="text"
                value={form.seoTitle}
                onChange={(e) =>
                  setForm({ ...form, seoTitle: e.target.value })
                }
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              SEO descrição
              <textarea
                value={form.seoDescription}
                onChange={(e) =>
                  setForm({ ...form, seoDescription: e.target.value })
                }
                rows={2}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded bg-[#0066CC] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setForm(null);
              }}
              className="rounded border border-slate-200 px-4 py-2 text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
          {message ? (
            <p className="mt-2 text-xs text-slate-600">{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
