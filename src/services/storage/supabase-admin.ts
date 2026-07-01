import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CLIENT_SOURCE = "src/services/storage/supabase-admin.ts";

let adminClient: SupabaseClient | null = null;

function resolveSupabaseUrl(): string | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value.replace(/\/$/, "");
    }

    // Aceita host sem protocolo (ex.: xxx.supabase.co)
    return `https://${value.replace(/\/$/, "")}`;
  }

  return undefined;
}

function resolveServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}

function logSupabaseEnvDiagnostics(resolvedUrl?: string): void {
  console.log("[supabase-admin] client_file:", CLIENT_SOURCE);
  console.log(
    "[supabase-admin] NEXT_PUBLIC_SUPABASE_URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(undefined)",
  );
  console.log(
    "[supabase-admin] SUPABASE_URL:",
    process.env.SUPABASE_URL ?? "(undefined)",
  );
  console.log(
    "[supabase-admin] resolved_url:",
    resolvedUrl ?? "(undefined)",
  );
  console.log(
    "[supabase-admin] SUPABASE_SERVICE_ROLE_KEY:",
    resolveServiceRoleKey() ? "present" : "missing",
  );
}

function assertValidSupabaseUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`protocolo inválido: ${parsed.protocol}`);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : "URL inválida";
    throw new Error(`Supabase URL inválida (${detail}): "${url}"`);
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveServiceRoleKey());
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = resolveSupabaseUrl();
    const key = resolveServiceRoleKey();

    logSupabaseEnvDiagnostics(url);

    if (!url || !key) {
      throw new Error(
        "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    assertValidSupabaseUrl(url);

    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
