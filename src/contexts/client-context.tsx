"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Cliente } from "@/types/cliente";

const STORAGE_KEY = "catalogo-cliente-id-v1";

type ClientContextValue = {
  cliente: Cliente | null;
  isIdentified: boolean;
  isModalOpen: boolean;
  openIdentification: () => void;
  closeIdentification: () => void;
  register: (input: {
    nome: string;
    whatsapp: string;
    email: string;
    empresa?: string;
  }) => Promise<Cliente>;
  lookup: (input: { whatsapp?: string; email?: string }) => Promise<Cliente>;
  logout: () => void;
};

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    let storedId: string | null = raw;
    if (raw && raw.startsWith("{")) {
      try {
        const legacy = JSON.parse(raw) as Cliente;
        storedId = legacy?.cliente_id ?? null;
      } catch {
        storedId = null;
      }
    }
    if (!storedId) {
      if (raw?.startsWith("{")) localStorage.removeItem(STORAGE_KEY);
      setHydrated(true);
      setIsModalOpen(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/clientes/validate?cliente_id=${encodeURIComponent(storedId)}`,
        );
        if (!alive) return;
        if (res.ok) {
          const json = (await res.json()) as { cliente?: Cliente };
          if (json.cliente) {
            setCliente(json.cliente);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            setIsModalOpen(true);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setIsModalOpen(true);
        }
      } catch {
        if (alive) {
          localStorage.removeItem(STORAGE_KEY);
          setIsModalOpen(true);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((c: Cliente) => {
    setCliente(c);
    localStorage.setItem(STORAGE_KEY, c.cliente_id);
    setIsModalOpen(false);
  }, []);

  const register = useCallback(
    async (input: {
      nome: string;
      whatsapp: string;
      email: string;
      empresa?: string;
    }) => {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as {
        cliente?: Cliente;
        error?: string;
      };
      if (!res.ok || !json.cliente) {
        throw new Error(json.error ?? "Não foi possível registrar.");
      }
      persist(json.cliente);
      return json.cliente;
    },
    [persist],
  );

  const lookup = useCallback(
    async (input: { whatsapp?: string; email?: string }) => {
      const res = await fetch("/api/clientes/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as {
        cliente?: Cliente;
        error?: string;
      };
      if (!res.ok || !json.cliente) {
        throw new Error(json.error ?? "Cliente não encontrado.");
      }
      persist(json.cliente);
      return json.cliente;
    },
    [persist],
  );

  const logout = useCallback(() => {
    setCliente(null);
    localStorage.removeItem(STORAGE_KEY);
    setIsModalOpen(true);
  }, []);

  const value = useMemo<ClientContextValue>(
    () => ({
      cliente,
      isIdentified: Boolean(cliente),
      isModalOpen: hydrated && isModalOpen,
      openIdentification: () => setIsModalOpen(true),
      closeIdentification: () => setIsModalOpen(false),
      register,
      lookup,
      logout,
    }),
    [cliente, hydrated, isModalOpen, register, lookup],
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient exige ClientProvider");
  return ctx;
}
