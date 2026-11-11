"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Users, FolderOpen, HardDrive } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PLANS = [
  {
    id: "ESSENCIAL", name: "Essencial",
    description: "Para escritórios iniciando a gestão digital de projetos.",
    monthly: 149, annual: 119,
    items: ["Todos os módulos", "Até 2 usuários", "Até 30 projetos ativos", "10 GB de armazenamento"],
    recommended: false,
  },
  {
    id: "PROFISSIONAL", name: "Profissional",
    description: "Para escritórios que precisam de gestão completa e colaboração.",
    monthly: 249, annual: 199,
    items: ["Tudo do Essencial, mais:", "Até 5 usuários", "Até 100 projetos ativos", "25 GB de armazenamento"],
    recommended: true,
  },
  {
    id: "EMPRESARIAL", name: "Empresarial",
    description: "Para operações com múltiplos departamentos e sem limites.",
    monthly: 399, annual: 319,
    items: ["Tudo do Profissional, mais:", "Até 15 usuários", "Projetos ilimitados", "100 GB de armazenamento", "Suporte prioritário"],
    recommended: false,
  },
];

const PLAN_LIMITS: Record<string, { users: number; projects: number; storage: number }> = {
  ESSENCIAL: { users: 2, projects: 30, storage: 10 },
  PROFISSIONAL: { users: 5, projects: 100, storage: 25 },
  EMPRESARIAL: { users: 15, projects: 9999, storage: 100 },
};

export function SubscriptionView({ tenant, subscription, invoices, userCount }: any) {
  const [cycle, setCycle] = useState<"MENSAL" | "ANUAL">(subscription?.cycle ?? "MENSAL");
  const currentPlan = subscription?.plan ?? "ESSENCIAL";
  const isTrialing = subscription?.status === "AVALIACAO" || !subscription;
  const trialEnd = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const trialDays = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 3600 * 1000)));
  const limits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.ESSENCIAL;

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Plano atual</CardTitle>
          <CardDescription>Resumo do plano, cobrança e limites do workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <strong className="text-base">{PLANS.find(p => p.id === currentPlan)?.name ?? "Essencial"}</strong>
                {isTrialing && <Badge variant="warning" className="text-[10px]">Avaliação</Badge>}
              </div>
              {isTrialing && <div className="text-xs text-muted-foreground">{trialDays} dias restantes de avaliação</div>}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Usuários</div>
              <div className="text-2xl font-bold">{userCount}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {limits.users} usuários</div>
            <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-muted-foreground" /> {limits.projects} projetos</div>
            <div className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-muted-foreground" /> {limits.storage} GB</div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-base font-semibold mb-1">Planos disponíveis</h2>
        <p className="text-xs text-muted-foreground">Compare limites, recursos e cobrança para escolher o plano mais adequado.</p>
        <div className="flex justify-center my-3">
          <div className="inline-flex bg-muted rounded-full p-1 text-xs">
            <button onClick={() => setCycle("MENSAL")}
              className={`px-4 py-1.5 rounded-full ${cycle === "MENSAL" ? "bg-white font-medium" : "text-muted-foreground"}`}>Mensal</button>
            <button onClick={() => setCycle("ANUAL")}
              className={`px-4 py-1.5 rounded-full ${cycle === "ANUAL" ? "bg-white font-medium" : "text-muted-foreground"}`}>
              Anual <span className="text-emerald-600 ml-1">-20%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map(p => {
            const isCurrent = p.id === currentPlan;
            const price = cycle === "ANUAL" ? p.annual : p.monthly;
            return (
              <Card key={p.id} className={`${p.recommended ? "border-2 border-indigo-500" : ""} relative`}>
                {p.recommended && (
                  <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">Recomendado</div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold">{p.name}</div>
                    {isCurrent && <Badge variant="outline">Plano atual</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 mb-3 min-h-[36px]">{p.description}</div>
                  <div className="text-2xl font-bold">R$ {price}<span className="text-sm font-normal text-muted-foreground"> /mês</span></div>
                  {cycle === "ANUAL" && <div className="text-[10px] text-emerald-600">Cobrança anual: {formatCurrency(price * 12)}</div>}
                  <Button className={`w-full mt-3 ${p.recommended ? "" : "bg-white text-foreground border border-border hover:bg-muted"}`} disabled={isCurrent} variant={isCurrent ? "outline" : "default"}>
                    {isCurrent ? "Plano atual" : `Assinar ${p.name}`}
                  </Button>
                  <div className="border-t mt-3 pt-3 space-y-1.5">
                    {p.items.map((it, i) => (
                      <div key={i} className="text-xs flex items-start gap-2">
                        <Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{it}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-3">Precisa de mais espaço? Contrate armazenamento extra a partir de R$ 12/mês.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturas recentes</CardTitle>
          <CardDescription>Histórico das cobranças do workspace.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma fatura ainda</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Data</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Plano</th>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Período</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/10">
                    <td className="p-3 text-xs">{new Date(inv.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-xs">{inv.plan} · {inv.cycle}</td>
                    <td className="p-3 text-xs">{new Date(inv.periodStart).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                    <td className="p-3 text-right text-xs font-medium">{formatCurrency(Number(inv.amount))}</td>
                    <td className="p-3 text-center"><Badge variant={inv.status === "PAGA" ? "success" : "outline"} className="text-[10px]">{inv.status}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {inv.invoiceUrl && (
                          <a href={inv.invoiceUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" title="Fatura"><Download className="h-3 w-3" /></Button>
                          </a>
                        )}
                        {inv.receiptUrl && (
                          <a href={inv.receiptUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" title="Nota fiscal">NF</Button>
                          </a>
                        )}
                      </div>
                    </td>
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
