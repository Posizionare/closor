import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Instagram, Youtube, Music2 } from "lucide-react";

const NETWORKS = [
  { key: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F",
    metrics: [["Seguidores", 12480], ["Alcance", 45200], ["Impressões", 73100], ["Cliques", 1240], ["Engajamento", "5.8%"], ["Leads", 64], ["Conversões", 12]] },
  { key: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000",
    metrics: [["Inscritos", 3420], ["Visualizações", 28700], ["Tempo de exibição", "412h"], ["Cliques", 320], ["Leads", 22], ["Conversões", 4]] },
  { key: "tiktok", name: "TikTok", icon: Music2, color: "#000000",
    metrics: [["Seguidores", 9870], ["Visualizações", 154200], ["Alcance", 71200], ["Engajamento", "7.2%"], ["Cliques", 980], ["Leads", 35], ["Conversões", 6]] },
];

export default async function RedesSociaisPage() {
  await requireModule("REDES_SOCIAIS");
  const { tenantId } = await getTenant();
  const accounts = await prisma.socialAccount.findMany({ where: { tenantId } });
  const map = Object.fromEntries(accounts.map(a => [a.network, a]));

  return (
    <>
      <PageHeader title="Redes Sociais" description="Conecte e acompanhe Instagram, YouTube e TikTok." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {NETWORKS.map(n => {
          const acc = map[n.key];
          const Icon = n.icon;
          const connected = !!acc?.connected;
          return (
            <Card key={n.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: n.color }}><Icon className="h-5 w-5" /></div>
                    <div>
                      <CardTitle>{n.name}</CardTitle>
                      <CardDescription>{acc?.handle ?? "@nao-conectado"}</CardDescription>
                    </div>
                  </div>
                  {connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm">
                  {n.metrics.map(([l, v]) => (
                    <li key={String(l)} className="flex justify-between border-b py-1">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <a href="/integracoes">{connected ? "Reconfigurar" : "Conectar conta"}</a>
                </Button>
                {acc?.lastSyncAt && <div className="text-[11px] text-muted-foreground mt-2 text-center">Última sincronização: {new Date(acc.lastSyncAt).toLocaleString("pt-BR")}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução de leads gerados</CardTitle>
          <CardDescription>Comparativo mensal de leads provenientes de redes sociais. (Dados simulados — refresh ao conectar contas reais.)</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialChart />
        </CardContent>
      </Card>
    </>
  );
}

function SocialChart() {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const ig = [22, 28, 31, 26, 35, 41, 48, 53, 47, 56, 64, 71];
  const yt = [4, 6, 8, 11, 9, 14, 18, 16, 19, 22, 25, 22];
  const tt = [12, 18, 22, 25, 28, 31, 33, 38, 40, 42, 35, 35];
  const max = Math.max(...ig, ...yt, ...tt);
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "#E4405F" }} />Instagram</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "#FF0000" }} />YouTube</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: "#0F172A" }} />TikTok</span>
      </div>
      <div className="grid grid-cols-12 gap-2 h-48 items-end">
        {months.map((m, i) => (
          <div key={m} className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5 items-end h-full w-full">
              <div className="flex-1 rounded-t" style={{ background: "#E4405F", height: `${(ig[i] / max) * 100}%` }} title={`Instagram: ${ig[i]}`} />
              <div className="flex-1 rounded-t" style={{ background: "#FF0000", height: `${(yt[i] / max) * 100}%` }} title={`YouTube: ${yt[i]}`} />
              <div className="flex-1 rounded-t" style={{ background: "#0F172A", height: `${(tt[i] / max) * 100}%` }} title={`TikTok: ${tt[i]}`} />
            </div>
            <span className="text-[10px] text-muted-foreground">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
