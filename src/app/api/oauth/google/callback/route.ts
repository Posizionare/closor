import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("oauth_state")?.value;
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/integracoes?error=invalid_state", url.origin));
  }
  const provider = state.split(".")[1] ?? "google_calendar";

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", url.origin));
  const tenantId = (session.user as any).tenantId as string;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/integracoes?error=missing_google_secret", url.origin));
  }
  const redirectUri = `${url.origin}/api/oauth/google/callback`;

  // Troca code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    console.error("oauth google token error:", txt);
    return NextResponse.redirect(new URL("/integracoes?error=token_exchange", url.origin));
  }
  const tokens = await tokenRes.json();

  // Busca info do usuário pra mostrar qual conta foi conectada
  let account = "";
  try {
    const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (ui.ok) {
      const j = await ui.json();
      account = j.email ?? j.name ?? "Conta Google";
    }
  } catch {}

  await prisma.integration.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    update: {
      connected: true, lastSyncAt: new Date(),
      config: {
        account,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
      } as any,
    },
    create: {
      tenantId, provider, connected: true, lastSyncAt: new Date(),
      config: {
        account,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
      } as any,
    },
  });

  const res = NextResponse.redirect(new URL("/integracoes?connected=" + provider, url.origin));
  res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
