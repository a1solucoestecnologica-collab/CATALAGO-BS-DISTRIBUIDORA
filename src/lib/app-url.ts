/** Domínio de produção canônico — deve coincidir com o Redirect URI do Bling. */
export const CANONICAL_PRODUCTION_ORIGIN =
  "https://catalogo-bs-distribuidora.vercel.app";

/**
 * Origem pública do app (sem barra final).
 * Prioridade: BLING_REDIRECT_URI → NEXT_PUBLIC_APP_URL → VERCEL_PROJECT_PRODUCTION_URL → produção canônica.
 */
export function getCanonicalAppOrigin(): string {
  const fromRedirect = process.env.BLING_REDIRECT_URI?.trim();
  if (fromRedirect) {
    try {
      return new URL(fromRedirect).origin;
    } catch {
      // ignora valor inválido
    }
  }

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) {
    const host = vercelProduction
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV === "production") {
    return CANONICAL_PRODUCTION_ORIGIN;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getBlingCallbackUrl(): string {
  return `${getCanonicalAppOrigin()}/api/bling/callback`;
}
