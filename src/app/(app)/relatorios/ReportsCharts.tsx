"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, AlertCircle, Users, Calendar, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Bucket = { label: string; count: number; value: number };

export function ReportsCharts({ kpis, dealsByMonth, dealsByDay, contactsByMonth, contactsByDay, convsByMonth, byOrigin, byOwner }: {
  kpis: any;
  dealsByMonth: Bucket[]; dealsByDay: Bucket[];
  contactsByMonth: Bucket[]; contactsByDay: Bucket[];
  convsByMonth: Bucket[];
  byOrigin: { origin: string; count: number; value: number }[];
  byOwner: { name: string; count: number; value: number }[];
}) {
  const [period, setPeriod] = useState<"mes" | "dia">("mes");
  const [metric, setMetric] = useState<"vendas" | "valor" | "contatos" | "chamados">("vendas");

  const data: Bucket[] = (() => {
    if (metric === "contatos") return period === "mes" ? contactsByMonth : contactsByDay;
    if (metric === "chamados") return period === "mes" ? convsByMonth : []; // sem dia ainda
    if (metric === "valor") return period === "mes" ? dealsByMonth : dealsByDay;
    return period === "mes" ? dealsByMonth : dealsByDay;
  })();

  return (
    <>
      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Trophy} label="Vendas no mês" value={kpis.mesAtualCount}
          sub={formatCurrency(kpis.mesAtualValor)}
          delta={kpis.monthDelta}
          variant="success" />
        <Kpi icon={TrendingUp} label="Taxa de conversão" value={`${kpis.conversao.toFixed(1)}%`}
          sub={`Ticket médio: ${formatCurrency(kpis.ticketMedio)}`} />
        <Kpi icon={AlertCircle} label="Em aberto" value={kpis.abertos} />
        <Kpi icon={Users} label="Contatos" value={kpis.contatos} />
      </div>

      {/* Gráfico principal */}
      <Card className="mb-4">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Evolução</CardTitle>
            <CardDescription>Compare {metric === "vendas" ? "número de vendas ganhas" : metric === "valor" ? "valor vendido" : metric === "contatos" ? "novos contatos" : "chamados recebidos"} {period === "mes" ? "ao longo dos últimos 6 meses" : "nos últimos 30 dias"}.</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Pill active={metric === "vendas"} onClick={() => setMetric("vendas")} icon={Trophy}>Vendas</Pill>
            <Pill active={metric === "valor"} onClick={() => setMetric("valor")}>Valor</Pill>
            <Pill active={metric === "contatos"} onClick={() => setMetric("contatos")} icon={Users}>Contatos</Pill>
            <Pill active={metric === "chamados"} onClick={() => setMetric("chamados")} icon={Phone}>Chamados</Pill>
            <span className="border-l mx-1" />
            <Pill active={period === "mes"} onClick={() => setPeriod("mes")} icon={Calendar}>Mês</Pill>
            <Pill active={period === "dia"} onClick={() => setPeriod("dia")}>Dia</Pill>
          </div>
        </CardHeader>
        <CardContent>
          <BarChart data={data} valueKey={metric === "valor" ? "value" : "count"} formatValue={metric === "valor" ? formatCurrency : (n) => String(n)} />
        </CardContent>
      </Card>

      {/* Comparação mês atual x anterior */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Mês atual vs. mês anterior</CardTitle>
          <CardDescription>Comparativo direto de fechamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonBars
            currentLabel="Mês atual"
            currentValue={kpis.mesAtualValor}
            previousLabel="Mês anterior"
            previousValue={kpis.mesAnteriorValor}
            delta={kpis.monthDelta}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle>Vendas por origem</CardTitle></CardHeader>
          <CardContent>
            {byOrigin.length === 0 ? <Empty /> : (
              <HorizontalBars data={byOrigin.map(o => ({ label: o.origin, value: o.value, count: o.count }))} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ranking por vendedor</CardTitle></CardHeader>
          <CardContent>
            {byOwner.length === 0 ? <Empty /> : (
              <HorizontalBars data={byOwner.map(o => ({ label: o.name, value: o.value, count: o.count }))} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, delta, variant }: any) {
  const isUp = delta != null && delta >= 0;
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`text-2xl font-bold mt-1 ${variant === "success" ? "text-emerald-700" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {delta != null && (
        <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-red-600"}`}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% vs. mês anterior
        </div>
      )}
    </CardContent></Card>
  );
}

function Pill({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors ${active ? "bg-foreground text-background border-foreground" : "bg-white hover:bg-muted/30"}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </button>
  );
}

function BarChart({ data, valueKey, formatValue }: { data: Bucket[]; valueKey: "count" | "value"; formatValue: (n: number) => string }) {
  if (!data.length) return <Empty />;
  const max = Math.max(1, ...data.map(d => Number(d[valueKey] ?? 0)));
  const chartH = 220;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full" style={{ minWidth: data.length > 12 ? data.length * 30 : "100%" }}>
        <div className="flex items-end gap-1.5" style={{ height: chartH }}>
          {data.map((d, i) => {
            const v = Number(d[valueKey] ?? 0);
            const h = (v / max) * (chartH - 30);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                <div className="text-[10px] font-semibold text-foreground mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5">
                  {formatValue(v)}
                </div>
                <div
                  className="w-full bg-[hsl(var(--brand))] rounded-t transition-all hover:opacity-80 min-w-[8px]"
                  style={{ height: Math.max(2, h) }}
                  title={`${d.label}: ${formatValue(v)}`}
                />
                <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ComparisonBars({ currentLabel, currentValue, previousLabel, previousValue, delta }: any) {
  const max = Math.max(1, currentValue, previousValue);
  return (
    <div className="space-y-3">
      <Bar label={previousLabel} value={previousValue} max={max} color="#94A3B8" />
      <Bar label={currentLabel} value={currentValue} max={max} color="#F97316" />
      <div className={`text-sm font-medium flex items-center gap-1 ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {Math.abs(delta).toFixed(1)}% {delta >= 0 ? "de crescimento" : "de queda"}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: any) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{formatCurrency(value)}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function HorizontalBars({ data }: { data: { label: string; value: number; count: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium truncate">{d.label}</span>
            <span className="text-muted-foreground text-xs">{d.count} · {formatCurrency(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() { return <div className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</div>; }
