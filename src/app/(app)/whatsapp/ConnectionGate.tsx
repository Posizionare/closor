"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone, QrCode, Plug, CheckCircle2, RefreshCw } from "lucide-react";
import { startQrConnection, confirmConnection, saveCloudApi } from "./connection-actions";

export function ConnectionGate({ connection }: { connection: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"qr" | "api">(connection?.mode === "CLOUD_API" ? "api" : "qr");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[hsl(var(--brand))]" />
            <CardTitle>Conectar WhatsApp</CardTitle>
          </div>
          <CardDescription>Escolha entre escanear QR Code ou usar a API oficial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <button onClick={() => setTab("qr")} className={`w-full text-left rounded-lg border p-3 transition-colors ${tab==="qr" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
            <div className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> QR Code (rápido)</div>
            <div className="text-xs text-muted-foreground mt-1">Conecta seu número pessoal/comercial em segundos.</div>
          </button>
          <button onClick={() => setTab("api")} className={`w-full text-left rounded-lg border p-3 transition-colors ${tab==="api" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
            <div className="flex items-center gap-2 font-medium"><Plug className="h-4 w-4" /> WhatsApp Cloud API</div>
            <div className="text-xs text-muted-foreground mt-1">Indicado para alto volume e múltiplos atendentes.</div>
          </button>
          <div className="pt-2 border-t mt-3">
            <div className="text-xs text-muted-foreground">Status atual</div>
            <Badge variant={connection?.status === "CONECTADO" ? "success" : "outline"} className="mt-1">
              {connection?.status ?? "DESCONECTADO"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        {tab === "qr" ? (
          <QrConnectCard connection={connection} pending={pending} start={start} onDone={() => router.refresh()} />
        ) : (
          <CloudApiCard pending={pending} start={start} />
        )}
      </div>
    </div>
  );
}

function QrConnectCard({ connection, pending, start, onDone }: any) {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(connection?.qrCodeData ?? null);

  async function generate() {
    start(async () => {
      await startQrConnection();
      // hard refresh para vir o QR do servidor
      router.refresh();
    });
  }

  async function confirm(fd: FormData) {
    start(async () => {
      const r = await confirmConnection(fd);
      if (r?.ok) onDone();
    });
  }

  // Sincroniza estado quando connection muda
  useEffect(() => { setQr(connection?.qrCodeData ?? null); }, [connection?.qrCodeData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão via QR Code</CardTitle>
        <CardDescription>Abra o WhatsApp &gt; Configurações &gt; Aparelhos conectados &gt; Conectar um aparelho.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="rounded-xl border-2 border-dashed border-muted p-6 flex flex-col items-center justify-center bg-muted/10 min-h-[280px]">
            {qr ? (
              <>
                {/* QR placeholder visual: gera um padrão a partir do hash da string */}
                <FakeQr value={qr} />
                <div className="text-xs text-muted-foreground mt-3 text-center">Escaneie o código com o app do WhatsApp.</div>
                <Button variant="outline" size="sm" className="mt-3" onClick={generate} disabled={pending}>
                  <RefreshCw className="h-3 w-3" /> Gerar novo
                </Button>
              </>
            ) : (
              <>
                <QrCode className="h-12 w-12 text-muted-foreground" />
                <Button onClick={generate} disabled={pending} className="mt-4">
                  {pending ? "Gerando..." : "Gerar QR Code"}
                </Button>
              </>
            )}
          </div>

          <form action={confirm} className="grid gap-3">
            <div className="text-sm text-muted-foreground">Após escanear, confirme os dados do número conectado.</div>
            <div className="grid gap-1.5"><Label>Número conectado</Label><Input name="phoneNumber" placeholder="+55 11 99999-0000" /></div>
            <div className="grid gap-1.5"><Label>Nome de exibição</Label><Input name="displayName" placeholder="Closor - Atendimento" /></div>
            <Button type="submit" disabled={pending || !qr}>
              <CheckCircle2 className="h-4 w-4" /> Confirmar conexão
            </Button>
            <p className="text-[11px] text-muted-foreground">Em produção essa confirmação vem por callback do provedor (Z-API / Evolution / WhatsApp Cloud).</p>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function CloudApiCard({ pending, start }: any) {
  const router = useRouter();
  async function submit(fd: FormData) {
    start(async () => {
      const r = await saveCloudApi(fd);
      if (r?.ok) router.refresh();
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Cloud API (Meta)</CardTitle>
        <CardDescription>Cole as credenciais do seu app no Meta Business Manager.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Phone Number ID</Label><Input name="phoneId" required /></div>
            <div className="grid gap-1.5"><Label>WhatsApp Business Account ID</Label><Input name="businessId" /></div>
          </div>
          <div className="grid gap-1.5"><Label>API URL</Label><Input name="apiUrl" defaultValue="https://graph.facebook.com/v20.0" /></div>
          <div className="grid gap-1.5"><Label>Access Token</Label><Input name="apiToken" type="password" required /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Número de exibição</Label><Input name="phoneNumber" placeholder="+55 11 99999-0000" /></div>
            <div className="grid gap-1.5"><Label>Nome de exibição</Label><Input name="displayName" /></div>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Conectar via API"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FakeQr({ value }: { value: string }) {
  // Gera um SVG estilizado com squares para parecer um QR
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  const cells: boolean[][] = [];
  for (let r = 0; r < 21; r++) {
    cells[r] = [];
    for (let c = 0; c < 21; c++) {
      const v = ((h * (r + 1) + c * 7919) ^ (r * c)) & 1;
      cells[r][c] = v === 1;
    }
  }
  // Cantos âncora
  const corners: [number, number][] = [[0,0],[0,14],[14,0]];
  for (const [r,c] of corners) {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      cells[r+i][c+j] = i===0||i===6||j===0||j===6 || (i>=2&&i<=4&&j>=2&&j<=4);
    }
  }
  return (
    <svg viewBox="0 0 21 21" className="h-44 w-44">
      <rect width="21" height="21" fill="#fff" />
      {cells.flatMap((row, r) => row.map((on, c) =>
        on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" /> : null
      ))}
    </svg>
  );
}
