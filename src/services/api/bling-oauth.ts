import {
  getBlingStoredTokens,
  saveBlingTokens,
  type BlingStoredTokens,
} from "@/services/api/bling-token-store";

const OAUTH_BASE = "https://www.bling.com.br/Api/v3/oauth";

export type BlingTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

function getClientId(): string {
  const id = process.env.BLING_CLIENT_ID?.trim();
  if (!id) throw new Error("BLING_CLIENT_ID não configurado.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.BLING_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("BLING_CLIENT_SECRET não configurado.");
  return secret;
}

function getBasicAuth(): string {
  const credentials = `${getClientId()}:${getClientSecret()}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export function getBlingRedirectUri(): string {
  const explicit = process.env.BLING_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/api/bling/callback`;
}

export function buildBlingAuthorizeUrl(state: string): string {
  const url = new URL(`${OAUTH_BASE}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestTokens(
  body: Record<string, string>,
): Promise<BlingTokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Bling OAuth token: HTTP ${res.status}${text ? ` — ${text.slice(0, 300)}` : ""}`,
    );
  }

  return JSON.parse(text) as BlingTokenResponse;
}

export async function exchangeBlingAuthorizationCode(
  code: string,
): Promise<BlingStoredTokens> {
  const tokens = await requestTokens({
    grant_type: "authorization_code",
    code,
  });
  await saveBlingTokens(tokens);
  const stored = await getBlingStoredTokens();
  if (!stored) throw new Error("Falha ao persistir tokens do Bling.");
  return stored;
}

export async function refreshBlingAccessToken(
  refreshToken: string,
): Promise<BlingStoredTokens> {
  const tokens = await requestTokens({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  await saveBlingTokens(tokens);
  const stored = await getBlingStoredTokens();
  if (!stored) throw new Error("Falha ao atualizar tokens do Bling.");
  return stored;
}
