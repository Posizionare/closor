"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat, FileText, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function FinanceHub({ currentTab, unicos, recorrentes, byMonth, totals }: {
  currentTab: "unico" | "recorrente";
  unicos: any[]; recorrentes: any[];
  byMonth: { label: string; unico: number; recorrente: number; total: number }[];
  totals: { totalUnico: number; totalRecorrenteMes: number; totalRecorrenteContrato: number };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  function setTab(t: "unico" | "recorrente") {
    const u = new URLSearchParams(sp.toString());
    u.set("tab", t);
    router.push(`/financeiro?${u.toString()}`);
  }
  const maxMonth = Math.max(1, ...byMonth.map(m => m.total));

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={FileText} label="Serviços únicos" value={formatCurrency(totals.totalUnico)} />
        <Kpi icon={Repeat} label="Recorrência / mês" value={formatCurrency(totals.totalRecorrenteMes)} variant="brand" />
        <Kpi icon={Wallet} label="Recorrência (valor cheio)" value={formatCurrency(totals.totalRecorrenteContrato)} />
        <Kpi icon={TrendingUp} label="Total no mês" value={formatCurrency((byMonth[byMonth.length-1]?.total) ?? 0)} variant="success" />
      </div>

      {/* Gráfico de evolução */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Evolução de vendas (6 meses)</CardTitle>
          <CardDescription>Comparativo entre serviços únicos e recorrência.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-48">
            {byMonth.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: 170 }}>
                  <div className="w-full bg-[#F97316] rounded-t" style={{ height: `${(m.unico / maxMonth) * 170}px`, minHeight: m.unico > 0 ? 3 : 0 }} title={`Único: ${formatCurrency(m.unico)}`} />
                  <div className="w-full bg-[#14B8A6]" style={{ height: `${(m.recorrente / maxMonth) * 170}px`, minHeight: m.recorrente > 0 ? 3 : 0 }} title={`Recorrente: ${formatCurrency(m.recorrente)}`} />
                </div>
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#F97316]" /> Serviços únicos</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#14B8A6]" /> Recorrência</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4">
        <Tab active={currentTab === "unico"} onClick={() => setTab("unico")} icon={FileText} label="Serviços únicos" count={unicos.length} />
        <Tab active={currentTab === "recorrente"} onClick={() => setTab("recorrente")} icon={Repeat} label="Recorrência" count={recorrentes.length} />
      </div>

      <Card>
        <CardContent className="p-0">
          {currentTab === "unico" ? (
            unicos.length === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Descrição</th>
                    <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Data de entrada</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                    <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unicos.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/10">
                      <td className="p-3 font-medium">{e.description}</td>
                      <td className="p-3 text-xs">{new Date(e.entryDate).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 text-right font-medium text-emerald-700">{formatCurrency(Number(e.amount))}</td>
                      <td className="p-3 text-center"><Badge variant={e.status === "RECEBIDO" ? "success" : "outline"} className="text-[10px]">{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            recorrentes.length === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Descrição</th>
                    <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Início</th>
                    <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Duração</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Mensalidade</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {recorrentes.map((e: any) => (
                    <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/10">
                      <td className="p-3 font-medium">{e.description}</td>
                      <td className="p-3 text-xs">{new Date(e.entryDate).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 text-center text-xs">{e.durationMonths ?? "—"} meses</td>
                      <td className="p-3 text-right font-medium text-[hsl(var(--brand))]">{e.monthlyAmount ? formatCurrency(Number(e.monthlyAmount)) : "—"}/mês</td>
                      <td className="p-3 text-right font-medium text-emerald-700">{formatCurrency(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Tab({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-4 w-4" />
      {label}
      <Badge variant="outline" className="ml-1">{count}</Badge>
    </button>
  );
}

function Kpi({ icon: Icon, label, value, variant }: { icon: any; label: string; value: string; variant?: "brand" | "success" }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`text-xl font-bold mt-1 ${variant === "brand" ? "text-[hsl(var(--brand))]" : variant === "success" ? "text-emerald-700" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function Empty() {
  return <div className="py-12 text-center text-sm text-muted-foreground">Nenhum lançamento. Contratos fechados aparecem aqui automaticamente.</div>;
}
