import { getSupabaseAdmin } from "@/services/storage/supabase-admin";

export type BlingStoredTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  token_type: string | null;
  scope: string | null;
  updated_at: string;
};

const ROW_ID = "default";

export async function getBlingStoredTokens(): Promise<BlingStoredTokens | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bling_tokens")
      .select("access_token, refresh_token, expires_at, token_type, scope, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error || !data) return null;
    return data as BlingStoredTokens;
  } catch {
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
        id: ROW_ID,
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
