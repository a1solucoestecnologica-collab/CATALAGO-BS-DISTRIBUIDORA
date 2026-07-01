import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeBlingAuthorizationCode,
  getBlingRedirectUri,
} from "@/services/api/bling-oauth";

const STATE_COOKIE = "bling_oauth_state";

function successHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bling conectado</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #f8fafc; color: #0f172a; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; max-width: 420px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
    h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
    p { margin: 0; color: #475569; font-size: .95rem; line-height: 1.5; }
    a { display: inline-block; margin-top: 1.25rem; color: #0066CC; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Bling conectado com sucesso</h1>
    <p>Os tokens foram salvos. O catálogo já pode consultar a API do Bling.</p>
    <a href="/">Voltar ao catálogo</a>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Erro na conexão Bling</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #fff1f2; color: #881337; }
    .card { background: #fff; border: 1px solid #fecdd3; border-radius: 12px; padding: 2rem; max-width: 480px; text-align: center; }
    h1 { font-size: 1.1rem; margin: 0 0 .5rem; }
    p { margin: 0; font-size: .9rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Falha ao conectar o Bling</h1>
    <p>${message.replace(/</g, "&lt;")}</p>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const oauthError = url.searchParams.get("error")?.trim();

  if (oauthError) {
    return new NextResponse(errorHtml(oauthError), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!code) {
    return new NextResponse(errorHtml("Parâmetro code ausente."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return new NextResponse(errorHtml("State OAuth inválido."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const redirectUri = getBlingRedirectUri();
    const clientId = process.env.BLING_CLIENT_ID?.trim() ?? "(não definido)";
    console.log("[bling/oauth/callback] redirect_uri:", redirectUri);
    console.log("[bling/oauth/callback] client_id:", clientId);

    await exchangeBlingAuthorizationCode(code);
    const res = new NextResponse(successHtml(), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e) {
    console.error("[bling/oauth/callback] exception:", e);
    if (e instanceof Error && e.stack) {
      console.error("[bling/oauth/callback] stack:", e.stack);
    }
    const message = e instanceof Error ? e.message : "Erro ao trocar o code.";
    return new NextResponse(errorHtml(message), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
