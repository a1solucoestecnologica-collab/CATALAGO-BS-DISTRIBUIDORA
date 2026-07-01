import { getSupabaseAdmin } from "@/services/storage/supabase-admin";

/** UUID fixo — uma integração Bling por catálogo (UPSERT por id). */
export const BLING_INTEGRATION_ID = "a0000000-0000-4000-8000-000000000001";

export type BlingStoredTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  token_type: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
};

export async function getBlingStoredTokens(): Promise<BlingStoredTokens | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bling_tokens")
      .select(
        "access_token, refresh_token, expires_at, token_type, scope, created_at, updated_at",
      )
      .eq("id", BLING_INTEGRATION_ID)
      .maybeSingle();

    if (error) {
      console.error("[bling-token-store] get:", error.message);
      return null;
    }
    if (!data?.access_token || !data.refresh_token) return null;
    return data as BlingStoredTokens;
  } catch (e) {
    console.error(
      "[bling-token-store] get:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function saveBlingTokens(input: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}): Promise<void> {
  const now = new Date();
  const expires_at =
    input.expires_in != null
      ? new Date(now.getTime() + input.expires_in * 1000).toISOString()
      : null;

  const { error } = await getSupabaseAdmin()
    .from("bling_tokens")
    .upsert(
      {
        id: BLING_INTEGRATION_ID,
        access_token: input.access_token,
        refresh_token: input.refresh_token,
        expires_at,
        token_type: input.token_type ?? null,
        scope: input.scope ?? null,
        updated_at: now.toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
}

export function isBlingTokenExpired(
  tokens: BlingStoredTokens,
  skewSeconds = 60,
): boolean {
  if (!tokens.expires_at) return false;
  const expires = new Date(tokens.expires_at).getTime();
  return Date.now() >= expires - skewSeconds * 1000;
}
