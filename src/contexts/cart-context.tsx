"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  BlingTechnicalIds,
  CartLineDisplay,
  CartLineStored,
  CatalogProduct,
} from "@/types/catalog";
import type { Solicitacao } from "@/types/solicitacao";
import {
  getCartLineKey,
  productHasVariants,
  storedLineFromProduct,
} from "@/lib/catalog-variants";

type CartContextValue = {
  lines: CartLineDisplay[];
  isOpen: boolean;
  isResolving: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addProduct: (
    product: CatalogProduct,
    qty?: number,
    variantId?: string,
  ) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeLine: (lineKey: string) => void;
  itemCount: number;
  subtotal: number;
  observacoes: string;
  setObservacoes: (v: string) => void;
  submitSolicitacao: (clienteId: string) => Promise<Solicitacao>;
  lastSolicitacao: Solicitacao | null;
  clearLastSolicitacao: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "catalogo-cart-v4";

function migrateStoredLine(raw: unknown): CartLineStored | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  if (typeof row.bling_product_id === "string") {
    const qty = Number(row.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return {
      bling_product_id: row.bling_product_id,
      bling_variant_id:
        typeof row.bling_variant_id === "string"
          ? row.bling_variant_id
          : undefined,
      bling_attribute_ids:
        row.bling_attribute_ids &&
        typeof row.bling_attribute_ids === "object"
          ? (row.bling_attribute_ids as Record<string, string>)
          : undefined,
      quantity: qty,
    };
  }

  const legacy = raw as {
    product?: { technical?: BlingTechnicalIds };
    resolvedTechnical?: BlingTechnicalIds;
    quantity?: number;
  };
  const tech =
    legacy.resolvedTechnical ?? legacy.product?.technical;
  if (!tech?.bling_product_id) return null;
  const qty = Number(legacy.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return {
    bling_product_id: tech.bling_product_id,
    bling_variant_id: tech.bling_variant_id,
    bling_attribute_ids: tech.bling_attribute_ids,
    quantity: qty,
  };
}

function loadStoredLines(): CartLineStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(migrateStoredLine)
      .filter((l): l is CartLineStored => l !== null);
  } catch {
    return [];
  }
}

async function resolveDisplayLines(
  stored: CartLineStored[],
): Promise<CartLineDisplay[]> {
  if (stored.length === 0) return [];
  const res = await fetch("/api/carrinho/resolver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: stored }),
  });
  const json = (await res.json()) as {
    lines?: CartLineDisplay[];
    error?: string;
  };
  if (!res.ok || !json.lines) return [];
  return json.lines;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [storedLines, setStoredLines] = useState<CartLineStored[]>([]);
  const [displayLines, setDisplayLines] = useState<CartLineDisplay[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [lastSolicitacao, setLastSolicitacao] = useState<Solicitacao | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      setStoredLines(loadStoredLines());
      setHydrated(true);
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedLines));
  }, [storedLines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    if (storedLines.length === 0) {
      setDisplayLines([]);
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    resolveDisplayLines(storedLines)
      .then((lines) => {
        if (alive) setDisplayLines(lines);
      })
      .catch(() => {
        if (alive) setDisplayLines([]);
      })
      .finally(() => {
        if (alive) setIsResolving(false);
      });
    return () => {
      alive = false;
    };
  }, [storedLines, hydrated]);

  const addProduct = useCallback(
    (product: CatalogProduct, qty = 1, variantId?: string) => {
      if (productHasVariants(product) && !variantId) return;
      const stored = storedLineFromProduct(product, qty, variantId);
      const key = getCartLineKey(stored);
      setStoredLines((prev) => {
        const idx = prev.findIndex((l) => getCartLineKey(l) === key);
        if (idx === -1) return [...prev, stored];
        const next = [...prev];
        const cur = next[idx]!;
        next[idx] = { ...cur, quantity: cur.quantity + qty };
        return next;
      });
      setIsOpen(true);
    },
    [],
  );

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      setStoredLines((prev) =>
        prev.filter((l) => getCartLineKey(l) !== lineKey),
      );
      return;
    }
    setStoredLines((prev) =>
      prev.map((l) =>
        getCartLineKey(l) === lineKey ? { ...l, quantity } : l,
      ),
    );
  }, []);

  const removeLine = useCallback((lineKey: string) => {
    setStoredLines((prev) =>
      prev.filter((l) => getCartLineKey(l) !== lineKey),
    );
  }, []);

  const subtotal = useMemo(
    () =>
      displayLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [displayLines],
  );

  const itemCount = useMemo(
    () => storedLines.reduce((s, l) => s + l.quantity, 0),
    [storedLines],
  );

  const submitSolicitacao = useCallback(
    async (clienteId: string) => {
      if (storedLines.length === 0) {
        throw new Error("Carrinho vazio.");
      }
      const res = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          itens: storedLines.map((l) => ({
            bling_product_id: l.bling_product_id,
            bling_variant_id: l.bling_variant_id,
            bling_attribute_ids: l.bling_attribute_ids,
            quantidade: l.quantity,
          })),
          observacoes: observacoes.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        solicitacao?: Solicitacao;
        error?: string;
      };
      if (!res.ok || !json.solicitacao) {
        throw new Error(json.error ?? "Erro ao gerar solicitação.");
      }
      setLastSolicitacao(json.solicitacao);
      setStoredLines([]);
      setDisplayLines([]);
      setObservacoes("");
      setIsOpen(false);
      return json.solicitacao;
    },
    [storedLines, observacoes],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines: displayLines,
      isOpen,
      isResolving,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((v) => !v),
      addProduct,
      setQuantity,
      removeLine,
      itemCount,
      subtotal,
      observacoes,
      setObservacoes,
      submitSolicitacao,
      lastSolicitacao,
      clearLastSolicitacao: () => setLastSolicitacao(null),
    }),
    [
      displayLines,
      isOpen,
      isResolving,
      addProduct,
      setQuantity,
      removeLine,
      itemCount,
      subtotal,
      observacoes,
      submitSolicitacao,
      lastSolicitacao,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
