import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

// Inicia OAuth com Google e redireciona o usuário ao consentimento
// Suporta provider=google_calendar | google_meet | google_ads (mesmo client OAuth, escopos diferentes)

const SCOPES: Record<string, string[]> = {
  google_calendar: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"],
  google_meet: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"],
  google_ads: ["openid", "email", "profile", "https://www.googleapis.com/auth/adwords"],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "google_calendar";
  const scopes = SCOPES[provider] ?? SCOPES.google_calendar;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/integracoes?error=missing_google_client", url.origin));
  }
  const redirectUri = `${url.origin}/api/oauth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex") + "." + provider;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  // Guarda state em cookie pra validar depois
  const res = NextResponse.redirect(authUrl);
  res.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
