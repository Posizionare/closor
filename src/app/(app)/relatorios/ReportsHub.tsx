"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartArea, FileText, Phone } from "lucide-react";
import { ReportsCharts } from "./ReportsCharts";
import { formatCurrency } from "@/lib/utils";

export function ReportsHub(props: any) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = props.currentTab ?? "visao";
  function setTab(t: "visao" | "contratos" | "chamados") {
    const u = new URLSearchParams(sp.toString());
    u.set("tab", t);
    router.push(`/relatorios?${u.toString()}`);
  }
  return (
    <>
      <div className="flex gap-1 border-b mb-4">
        <TabBtn active={tab === "visao"} onClick={() => setTab("visao")} icon={ChartArea} label="Visão geral" />
        <TabBtn active={tab === "contratos"} onClick={() => setTab("contratos")} icon={FileText} label="Contratos gerados" />
        <TabBtn active={tab === "chamados"} onClick={() => setTab("chamados")} icon={Phone} label="Chamados" />
      </div>

      {tab === "visao" && (
        <ReportsCharts
          kpis={props.kpis}
          dealsByMonth={props.dealsByMonth}
          dealsByDay={props.dealsByDay}
          contactsByMonth={props.contactsByMonth}
          contactsByDay={props.contactsByDay}
          convsByMonth={props.convsByMonth}
          byOrigin={props.byOrigin}
          byOwner={props.byOwner}
        />
      )}

      {tab === "contratos" && <ContractsTab contracts={props.contracts} expiringIn30={props.expiringIn30} />}
      {tab === "chamados" && <ChamadosTab total={props.totalChamados} byOwner={props.chamadosByOwner} convsByMonth={props.convsByMonth} />}
    </>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ContractsTab({ contracts, expiringIn30 }: { contracts: any[]; expiringIn30: number }) {
  const total = contracts.length;
  const vigentes = contracts.filter(c => c.status === "VIGENTE" || c.status === "ASSINADO").length;
  const totalValor = contracts.reduce((a, c) => a + Number(c.totalValue ?? 0), 0);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Total gerados" value={total} />
        <KPI label="Vigentes" value={vigentes} variant="success" />
        <KPI label="Vencendo (30d)" value={expiringIn30} variant="warning" />
        <KPI label="Valor total" value={formatCurrency(totalValor)} variant="brand" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contratos gerados</CardTitle>
          <CardDescription>Últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {contracts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Sem contratos gerados no período.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Empresa</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Atendente</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Fechamento</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Vencimento</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/10">
                    <td className="p-3"><div className="font-medium">{c.contact?.company ?? c.contact?.name ?? "—"}</div></td>
                    <td className="p-3 text-xs">{c.owner?.name ?? "—"}</td>
                    <td className="p-3 text-xs">{c.signedAt ? new Date(c.signedAt).toLocaleDateString("pt-BR") : (c.startsAt ? new Date(c.startsAt).toLocaleDateString("pt-BR") : "—")}</td>
                    <td className="p-3 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3 text-right text-xs font-medium">{c.totalValue ? formatCurrency(Number(c.totalValue)) : "—"}</td>
                    <td className="p-3 text-center"><Badge variant={c.status === "ASSINADO" || c.status === "VIGENTE" ? "success" : "outline"} className="text-[10px]">{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ChamadosTab({ total, byOwner, convsByMonth }: { total: number; byOwner: any[]; convsByMonth: any[] }) {
  const max = Math.max(1, ...byOwner.map(o => o.count));
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI label="Total chamados" value={total} />
        <KPI label="Atendidos" value={byOwner.reduce((a, o) => a + o.count, 0)} variant="success" />
        <KPI label="Tempo médio resposta" value="—" />
        <KPI label="Convertidos em lead" value="—" />
      </div>
      <Card className="mb-3">
        <CardHeader><CardTitle>Chamados por mês</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {convsByMonth.map((d: any, i: number) => {
              const m = Math.max(1, ...convsByMonth.map((x: any) => x.count));
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-[hsl(var(--brand))] rounded-t" style={{ height: `${(d.count / m) * 100}%`, minHeight: 4 }} title={`${d.label}: ${d.count}`} />
                  <div className="text-[10px] text-muted-foreground mt-1">{d.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Chamados por atendente</CardTitle></CardHeader>
        <CardContent>
          {byOwner.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem chamados.</div>
          ) : byOwner.sort((a, b) => b.count - a.count).map((o, i) => (
            <div key={i} className="flex items-center gap-2 text-sm mb-2">
              <span className="w-24 font-medium">{o.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${(o.count / max) * 100}%` }} /></div>
              <span className="w-20 text-right text-xs text-muted-foreground">{o.count} chamados</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function KPI({ label, value, variant }: { label: string; value: any; variant?: "success" | "warning" | "brand" }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${variant === "success" ? "text-emerald-700" : variant === "warning" ? "text-amber-700" : variant === "brand" ? "text-[hsl(var(--brand))]" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}
