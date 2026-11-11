"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plug, Check, ChevronRight, Settings } from "lucide-react";
import { saveIntegration, disconnectIntegration } from "../conversoes/actions";

// Provedores que suportam OAuth "um clique"
const OAUTH_PROVIDERS: Record<string, { accountsLabel: string; mockAccounts: string[] }> = {
  google_calendar: { accountsLabel: "Conta Google", mockAccounts: ["suporte@posizionare.com.br", "vendas@empresa.com.br"] },
  google_meet:     { accountsLabel: "Conta Google", mockAccounts: ["suporte@posizionare.com.br", "vendas@empresa.com.br"] },
  google_ads:      { accountsLabel: "Conta Google Ads", mockAccounts: ["Conta principal — 123-456-7890"] },
  meta_ads:        { accountsLabel: "Conta do Meta", mockAccounts: ["Página: Posizionare", "Página: Closor"] },
  instagram:       { accountsLabel: "Perfil Instagram", mockAccounts: ["@posizionare", "@closor.crm"] },
  youtube:         { accountsLabel: "Canal do YouTube", mockAccounts: ["Posizionare Tech"] },
  tiktok:          { accountsLabel: "Perfil TikTok", mockAccounts: ["@posizionare"] },
};

const FIELDS: Record<string, Array<{ name: string; label: string; type?: string; placeholder?: string }>> = {
  whatsapp: [
    { name: "apiUrl", label: "URL da API", placeholder: "https://graph.facebook.com/v19.0/..." },
    { name: "phoneId", label: "Phone Number ID" },
    { name: "accessToken", label: "Access Token", type: "password" },
  ],
  google_calendar: [
    { name: "clientId", label: "Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password" },
    { name: "refreshToken", label: "Refresh Token", type: "password" },
  ],
  google_meet: [
    { name: "clientId", label: "Client ID" },
    { name: "clientSecret", label: "Client Secret", type: "password" },
  ],
  instagram: [
    { name: "accessToken", label: "Access Token", type: "password" },
    { name: "businessAccountId", label: "Business Account ID" },
  ],
  youtube: [
    { name: "apiKey", label: "API Key", type: "password" },
    { name: "channelId", label: "Channel ID" },
  ],
  tiktok: [
    { name: "accessToken", label: "Access Token", type: "password" },
    { name: "advertiserId", label: "Advertiser ID" },
  ],
  smtp: [
    { name: "host", label: "Host", placeholder: "smtp.gmail.com" },
    { name: "port", label: "Porta", placeholder: "587" },
    { name: "user", label: "Usuário" },
    { name: "password", label: "Senha", type: "password" },
    { name: "from", label: "Remetente padrão", placeholder: "no-reply@empresa.com" },
  ],
  webhook: [
    { name: "url", label: "URL do webhook", placeholder: "https://api.empresa.com/eventos" },
    { name: "secret", label: "Secret (HMAC)", type: "password" },
    { name: "events", label: "Eventos", placeholder: "deal.won,contact.created" },
  ],
};

export function IntegrationGrid({ items, state }: { items: any[]; state: Record<string, any> }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [oauthOpen, setOauthOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const current = open ? items.find(i => i.provider === open) : null;
  const fields = open ? (FIELDS[open] ?? []) : [];

  function startConnect(provider: string) {
    // Google → fluxo OAuth real
    if (provider.startsWith("google_")) {
      window.location.href = `/api/oauth/google/start?provider=${provider}`;
      return;
    }
    if (OAUTH_PROVIDERS[provider]) setOauthOpen(provider);
    else setOpen(provider);
  }
  function selectAccount(provider: string, account: string) {
    const fd = new FormData();
    fd.set("account", account);
    fd.set("oauth", "true");
    start(async () => {
      await saveIntegration(provider, fd);
      setOauthOpen(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(it => {
          const data = state[it.provider];
          const connected = !!data?.connected;
          return (
            <Card key={it.provider} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: it.color }}>
                      <Plug className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.category}</div>
                    </div>
                  </div>
                  {connected ? <Badge variant="success"><Check className="h-3 w-3" /> Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-3 mb-4">{it.description}</p>
                {data?.lastSyncAt && <div className="text-[11px] text-muted-foreground mb-3">Última sincronização: {new Date(data.lastSyncAt).toLocaleString("pt-BR")}</div>}
                <div className="flex gap-2">
                  <Button size="sm" variant={connected ? "outline" : "default"} onClick={() => startConnect(it.provider)}>
                    {connected ? "Reconfigurar" : OAUTH_PROVIDERS[it.provider] ? "Conectar com 1 clique" : "Conectar"}
                  </Button>
                  {connected && OAUTH_PROVIDERS[it.provider] && (
                    <Button size="sm" variant="outline" onClick={() => setOpen(it.provider)} title="Configurações avançadas"><Settings className="h-3 w-3" /></Button>
                  )}
                  {connected && <Button size="sm" variant="ghost" onClick={() => start(async () => { await disconnectIntegration(it.provider); router.refresh(); })}>Desconectar</Button>}
                </div>
                {connected && data?.config?.account && (
                  <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
                    Conta: <span className="font-medium text-foreground">{data.config.account}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal OAuth — escolher conta com 1 clique */}
      <Dialog open={!!oauthOpen} onOpenChange={(v) => !v && setOauthOpen(null)}>
        <DialogContent>
          {oauthOpen && (() => {
            const it = items.find((i: any) => i.provider === oauthOpen)!;
            const cfg = OAUTH_PROVIDERS[oauthOpen];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: it.color }}>
                      <Plug className="h-4 w-4" />
                    </div>
                    <div>
                      <DialogTitle>Conectar {it.name}</DialogTitle>
                      <p className="text-xs text-muted-foreground">Selecione a {cfg.accountsLabel} que deseja conectar.</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="grid gap-2 mt-2">
                  {cfg.mockAccounts.map(a => (
                    <button key={a} onClick={() => selectAccount(oauthOpen!, a)} disabled={pending}
                      className="w-full flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{a}</div>
                        <div className="text-xs text-muted-foreground">Conceder acesso e conectar</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  <button onClick={() => { setOauthOpen(null); setOpen(oauthOpen!); }}
                    className="w-full text-xs text-muted-foreground underline mt-2 text-left">
                    Usar outra conta (configuração manual)
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{current?.name}</DialogTitle></DialogHeader>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta integração é configurada na página específica do módulo (Conversões para Meta/Google Ads).</p>
          ) : (
            <form action={(fd) => start(async () => { const r = await saveIntegration(open!, fd); if (r?.ok) { setOpen(null); router.refresh(); } })} className="grid gap-3">
              {fields.map(f => (
                <div key={f.name} className="grid gap-1.5">
                  <Label>{f.label}</Label>
                  <Input name={f.name} type={f.type ?? "text"} placeholder={f.placeholder} defaultValue={state[open!]?.config?.[f.name] ?? ""} />
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(null)}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Conectar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
