import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  MessageCircle, Users, Trophy, CheckCircle2, TrendingUp, FileText,
  Calendar, ArrowRight, Target,
} from "lucide-react";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function DashboardPage() {
  const session = (await auth())!;
  const userId = (session.user as any).id as string;
  const tenantId = (session.user as any).tenantId as string;
  const isManager = (session.user as any).isAdmin || (session.user as any).commercialRole === "GESTOR";

  const baseDeal = isManager ? { tenantId } : { tenantId, ownerId: userId };
  const baseConv = isManager ? { tenantId } : { tenantId, ownerId: userId };
  const baseTask = isManager ? { tenantId } : { tenantId, assigneeId: userId };

  const today = new Date();
  const sixAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [pipeline, openConvs, contactsCount, wonAgg, pendingTasks, proposalsCount, meetingsCount, wonDeals] = await Promise.all([
    prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: { orderBy: { order: "asc" } } } }),
    prisma.conversation.count({ where: { ...baseConv, status: { in: ["NOVO", "EM_ATENDIMENTO", "AGUARDANDO_RESPOSTA", "NEGOCIACAO"] } } }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.deal.aggregate({ where: { ...baseDeal, status: "GANHO" }, _sum: { value: true }, _count: true }),
    prisma.task.count({ where: { ...baseTask, status: "PENDENTE" } }),
    prisma.proposal.count({ where: { tenantId, status: { in: ["ENVIADA", "ACEITA"] } } }),
    prisma.task.count({ where: { ...baseTask, title: { contains: "Reunião", mode: "insensitive" }, status: "PENDENTE", dueDate: { gte: today } } }),
    prisma.deal.findMany({ where: { ...baseDeal, status: "GANHO", wonAt: { gte: sixAgo } }, select: { wonAt: true, value: true } }),
  ]);

  // Deals por etapa (mini-board do funil)
  const dealsByStage = pipeline
    ? await prisma.deal.groupBy({ by: ["stageId"], where: { ...baseDeal }, _count: true, _sum: { value: true } })
    : [];
  const stageMap = Object.fromEntries(dealsByStage.map(d => [d.stageId, d]));

  // Evolução de vendas (6 meses)
  const byMonth: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const total = wonDeals.filter(x => x.wonAt && x.wonAt >= d && x.wonAt < next).reduce((a, x) => a + Number(x.value ?? 0), 0);
    byMonth.push({ label: MONTHS[d.getMonth()], value: total });
  }
  const maxMonth = Math.max(1, ...byMonth.map(m => m.value));
  const wonTotal = Number(wonAgg._sum.value ?? 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${session.user?.name?.split(" ")[0] ?? ""}!`}
        description="Visão geral da sua operação comercial."
        actions={<Badge variant="outline">{isManager ? "Gestor" : "Atendente"}</Badge>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={MessageCircle} label="Conversas em aberto" value={openConvs} />
        <Kpi icon={Trophy} label="Vendas ganhas" value={wonAgg._count ?? 0} sub={formatCurrency(wonTotal)} variant="success" />
        <Kpi icon={FileText} label="Propostas ativas" value={proposalsCount} />
        <Kpi icon={CheckCircle2} label="Tarefas pendentes" value={pendingTasks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de evolução */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[hsl(var(--brand))]" /> Evolução de vendas</CardTitle>
              <CardDescription>Valor ganho nos últimos 6 meses.</CardDescription>
            </div>
            <Link href="/relatorios"><Badge variant="outline" className="cursor-pointer">Ver relatórios <ArrowRight className="h-3 w-3" /></Badge></Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-44">
              {byMonth.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-[10px] text-muted-foreground font-medium">{m.value > 0 ? formatCurrency(m.value).replace("R$", "").trim() : ""}</div>
                  <div className="w-full bg-[hsl(var(--brand))] rounded-t" style={{ height: `${(m.value / maxMonth) * 130}px`, minHeight: 3 }} />
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[hsl(var(--brand))]" /> Hoje</CardTitle>
            <CardDescription>O que precisa de atenção.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ResumoItem icon={Calendar} label="Reuniões agendadas" value={meetingsCount} href="/agenda" />
            <ResumoItem icon={CheckCircle2} label="Tarefas pendentes" value={pendingTasks} href="/tarefas" />
            <ResumoItem icon={MessageCircle} label="Conversas em aberto" value={openConvs} href="/whatsapp" />
            <ResumoItem icon={Users} label="Contatos no CRM" value={contactsCount} href="/contatos" />
          </CardContent>
        </Card>
      </div>

      {/* Mini-board do funil */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Funil de vendas</CardTitle>
            <CardDescription>Distribuição das oportunidades por etapa.</CardDescription>
          </div>
          <Link href="/funil"><Badge variant="outline" className="cursor-pointer">Abrir funil <ArrowRight className="h-3 w-3" /></Badge></Link>
        </CardHeader>
        <CardContent>
          {!pipeline ? (
            <p className="text-sm text-muted-foreground">Funil não configurado.</p>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(pipeline.stages.length, 5)}, minmax(0,1fr))` }}>
              {pipeline.stages.map(s => {
                const agg = stageMap[s.id];
                return (
                  <div key={s.id} className="rounded-lg border p-3 bg-muted/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color ?? "#94A3B8" }} />
                      <span className="text-[11px] font-medium truncate">{s.name}</span>
                    </div>
                    <div className="text-xl font-bold">{agg?._count ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">{formatCurrency(Number(agg?._sum?.value ?? 0))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, variant }: { icon: any; label: string; value: number | string; sub?: string; variant?: "success" }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`text-2xl font-bold mt-1 ${variant === "success" ? "text-emerald-700" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </CardContent></Card>
  );
}

function ResumoItem({ icon: Icon, label, value, href }: { icon: any; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
      <span className="flex items-center gap-2 text-sm"><Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}</span>
      <Badge variant={value > 0 ? "info" : "outline"}>{value}</Badge>
    </Link>
  );
}
