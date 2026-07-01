import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildBlingAuthorizeUrl } from "@/services/api/bling-oauth";

const STATE_COOKIE = "bling_oauth_state";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    const url = buildBlingAuthorizeUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao iniciar OAuth.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
