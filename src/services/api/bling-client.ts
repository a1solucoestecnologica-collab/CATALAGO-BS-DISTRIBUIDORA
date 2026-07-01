import type {
  BlingListResponse,
  BlingProductSummary,
  BlingProductVariation,
  BlingSingleResponse,
  BlingStockBalance,
} from "@/services/api/bling.types";
import {
  getBlingStoredTokens,
  isBlingTokenExpired,
} from "@/services/api/bling-token-store";
import { refreshBlingAccessToken } from "@/services/api/bling-oauth";

const DEFAULT_BASE = "https://api.bling.com.br/Api/v3";
const FETCH_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 800;

export class BlingNotConfiguredError extends Error {
  constructor() {
    super(
      "Bling não configurado: defina BLING_API_ACCESS_TOKEN ou conecte via OAuth.",
    );
    this.name = "BlingNotConfiguredError";
  }
}

export class BlingApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BlingApiError";
    this.status = status;
  }
}

function getBaseUrl(): string {
  const raw = process.env.BLING_API_BASE_URL ?? DEFAULT_BASE;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function resolveAccessToken(): Promise<string> {
  const envToken = process.env.BLING_API_ACCESS_TOKEN?.trim();
  if (envToken) return envToken;

  let stored = await getBlingStoredTokens();
  if (!stored?.access_token) throw new BlingNotConfiguredError();

  if (isBlingTokenExpired(stored)) {
    if (!stored.refresh_token) throw new BlingNotConfiguredError();
    stored = await refreshBlingAccessToken(stored.refresh_token);
  }

  return stored.access_token;
}

export async function isBlingConfigured(): Promise<boolean> {
  if (process.env.BLING_API_ACCESS_TOKEN?.trim()) return true;
  const stored = await getBlingStoredTokens();
  return Boolean(stored?.access_token);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function blingFetch<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const base = getBaseUrl();
  const token = await resolveAccessToken();
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.status === 429) {
        const wait = INITIAL_BACKOFF_MS * 2 ** attempt;
        await sleep(wait);
        continue;
      }

      if (res.status >= 500) {
        const wait = INITIAL_BACKOFF_MS * 2 ** attempt;
        await sleep(wait);
        lastError = new BlingApiError(
          `Bling indisponível: HTTP ${res.status}`,
          res.status,
        );
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new BlingApiError(
          `Bling ${path}: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`,
          res.status,
        );
      }

      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof BlingApiError) throw e;
      lastError =
        e instanceof Error
          ? e
          : new Error("Falha de comunicação com o Bling.");
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_BACKOFF_MS * 2 ** attempt);
      }
    }
  }

  throw lastError ?? new Error("Falha de comunicação com o Bling.");
}

/** Uma página de produtos ativos (até 100 itens). */
export async function listActiveProductsPage(
  page: number,
  limit = 100,
): Promise<BlingProductSummary[]> {
  const json = await blingFetch<BlingListResponse<BlingProductSummary>>(
    "/produtos",
    {
      pagina: String(page),
      limite: String(limit),
      criterio: "1",
      tipo: "P",
    },
  );
  return json.data ?? [];
}

/** Lista produtos ativos com paginação completa. */
export async function listAllActiveProducts(): Promise<BlingProductSummary[]> {
  return listProductsPaginated();
}

async function listProductsPaginated(
  extraParams?: Record<string, string>,
): Promise<BlingProductSummary[]> {
  const all: BlingProductSummary[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const json = await blingFetch<BlingListResponse<BlingProductSummary>>(
      "/produtos",
      {
        pagina: String(page),
        limite: String(limit),
        criterio: "1",
        tipo: "P",
        ...extraParams,
      },
    );
    const batch = json.data ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < limit) break;
    page += 1;
  }
  return all;
}

export async function getProductById(
  id: string,
): Promise<BlingProductSummary | null> {
  try {
    const json = await blingFetch<BlingSingleResponse<BlingProductSummary>>(
      `/produtos/${id}`,
    );
    return json.data ?? null;
  } catch (e) {
    if (e instanceof BlingApiError && e.status === 404) return null;
    throw e;
  }
}

/** Variações de um produto pai no Bling. */
export async function getProductVariations(
  productId: string,
): Promise<BlingProductVariation[]> {
  try {
    const json = await blingFetch<BlingListResponse<BlingProductVariation>>(
      `/produtos/${productId}/variacoes`,
    );
    return json.data ?? [];
  } catch (e) {
    if (e instanceof BlingApiError && (e.status === 404 || e.status === 400)) {
      return [];
    }
    throw e;
  }
}

/** Busca variações em paralelo com limite de concorrência. */
export async function getProductVariationsBatch(
  productIds: string[],
  concurrency = 10,
): Promise<Map<string, BlingProductVariation[]>> {
  const map = new Map<string, BlingProductVariation[]>();
  if (productIds.length === 0) return map;

  let index = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = index++;
      if (i >= productIds.length) return;
      const id = productIds[i]!;
      const variations = await getProductVariations(id);
      map.set(id, variations);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, productIds.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return map;
}

/** Saldos de estoque em lote (quando disponível na API). */
export async function getStockBalances(
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const chunkSize = 50;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    try {
      const json = await blingFetch<BlingListResponse<BlingStockBalance>>(
        "/estoques/saldos",
        { idsProdutos: chunk.join(",") },
      );
      for (const row of json.data ?? []) {
        const pid = String(row.produto?.id ?? "");
        if (!pid) continue;
        const saldo =
          row.saldoVirtualTotal ?? row.saldoFisicoTotal ?? undefined;
        if (saldo != null) map.set(pid, Number(saldo));
      }
    } catch {
      // Estoque indisponível — usa saldo do cadastro do produto.
    }
  }
  return map;
}

export function parseBlingMoney(value: string | number | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}
