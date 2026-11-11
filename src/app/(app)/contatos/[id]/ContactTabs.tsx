"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, FileSignature, History, ListTodo, MessageCircle, UserCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const REASON_LABEL: Record<string, string> = {
  CRIACAO: "Criação do contato",
  TROCA_MANUAL: "Atribuição manual",
  ATENDIMENTO_WHATSAPP: "Atendimento WhatsApp",
  GANHO: "Fechamento ganho",
  PERDIDO: "Fechamento perdido",
  REDISTRIBUICAO: "Redistribuição",
};

export function ContactTabs({ contact, users, setOwnerAction }: { contact: any; users: any[]; setOwnerAction: (uid: string) => Promise<any> }) {
  const router = useRouter();
  const [tab, setTab] = useState<"deals" | "contracts" | "tasks" | "history">("deals");
  const [pending, start] = useTransition();

  const tabs = [
    { id: "deals", label: "Oportunidades", icon: Briefcase, count: contact.deals.length },
    { id: "contracts", label: "Contratos", icon: FileSignature, count: contact.contracts.length },
    { id: "tasks", label: "Tarefas", icon: ListTodo, count: contact.tasks.length },
    { id: "history", label: "Histórico de atendimento", icon: History, count: contact.assignments.length },
  ] as const;

  return (
    <>
      {/* Card de responsável atual */}
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Vendedor responsável</div>
              <div className="font-semibold">{contact.owner?.name ?? <span className="text-muted-foreground italic">Não atribuído</span>}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={contact.ownerId ?? ""}
              onChange={(e) => start(async () => { await setOwnerAction(e.target.value); router.refresh(); })}
              className="h-9 rounded-lg border border-input px-2 text-sm"
              disabled={pending}
            >
              <option value="">— sem responsável —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <span className="text-[10px] text-muted-foreground max-w-[200px]">A meta de fechamento conta para o vendedor que estiver nesta atribuição quando o deal for ganho.</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <Badge variant="outline" className="ml-1">{t.count}</Badge>
            </button>
          );
        })}
      </div>

      {tab === "deals" && (
        <Card><CardContent className="p-0">
          {contact.deals.length === 0 ? <Empty text="Nenhuma oportunidade ainda." /> : (
            <ul className="divide-y">
              {contact.deals.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/funil`} className="font-medium hover:underline">{d.title}</Link>
                    <div className="text-xs text-muted-foreground">{d.stage?.name} · {d.owner?.name ?? "Sem responsável"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(Number(d.value ?? 0))}</div>
                    <Badge variant={d.status === "GANHO" ? "success" : d.status === "PERDIDO" ? "danger" : "outline"}>{d.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "contracts" && (
        <Card><CardContent className="p-0">
          {contact.contracts.length === 0 ? <Empty text="Nenhum contrato ainda." /> : (
            <ul className="divide-y">
              {contact.contracts.map((c: any) => {
                const start = c.startsAt ? new Date(c.startsAt) : (c.signedAt ? new Date(c.signedAt) : null);
                const end = c.expiresAt ? new Date(c.expiresAt) : null;
                const today = new Date();
                const expired = end && end.getTime() < today.getTime();
                const expiringSoon = end && !expired && (end.getTime() - today.getTime()) / (24*3600*1000) <= 30;
                return (
                  <li key={c.id} className="flex items-center justify-between p-4 gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <Badge variant={c.status === "ASSINADO" || c.status === "VIGENTE" ? "success" : c.status === "ENCERRADO" || c.status === "CANCELADO" ? "outline" : "info"}>{c.status}</Badge>
                        {expired && <Badge variant="danger">Vencido</Badge>}
                        {expiringSoon && <Badge variant="warning">Vence em breve</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {start && <>Fechado {start.toLocaleDateString("pt-BR")}</>}
                        {start && end && " · "}
                        {end && <>até {end.toLocaleDateString("pt-BR")}</>}
                        {c.owner && <> · Atendente: {c.owner.name}</>}
                      </div>
                    </div>
                    <div className="text-right">
                      {c.totalValue && <div className="font-semibold">{formatCurrency(Number(c.totalValue))}</div>}
                      {c.number && <div className="text-[10px] text-muted-foreground">{c.number}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "tasks" && (
        <Card><CardContent className="p-0">
          {contact.tasks.length === 0 ? <Empty text="Nenhuma tarefa." /> : (
            <ul className="divide-y">
              {contact.tasks.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.dueDate ? `Vence em ${formatDate(t.dueDate)}` : "Sem vencimento"}</div>
                  </div>
                  <Badge variant={t.status === "CONCLUIDA" ? "success" : "outline"}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}

      {tab === "history" && (
        <Card><CardContent className="p-0">
          {contact.assignments.length === 0 ? <Empty text="Sem histórico de atendimento ainda." /> : (
            <ul className="divide-y">
              {contact.assignments.map((a: any) => (
                <li key={a.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{a.user?.name ?? "—"}</span>
                      <Badge variant={a.outcome === "ganho" ? "success" : a.outcome === "perdido" ? "danger" : "outline"}>
                        {a.outcome === "ganho" ? "Ganho" : a.outcome === "perdido" ? "Perdido" : "Em andamento"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{REASON_LABEL[a.reason] ?? a.reason}</span>
                    </div>
                    {a.note && <div className="text-xs text-muted-foreground mt-1">{a.note}</div>}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Início: {new Date(a.createdAt).toLocaleString("pt-BR")}
                      {a.endedAt && <> · Fim: {new Date(a.endedAt).toLocaleString("pt-BR")}</>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{text}</div>;
}
