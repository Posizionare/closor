import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { Phone, CalendarCheck, CheckCircle2, FileText, Trophy, Target } from "lucide-react";

export default async function AtendentesPage() {
  await requireSession();
  const { tenantId, isAdmin, role } = await getTenant();
  if (!isAdmin && role !== "GESTOR") redirect("/dashboard");

  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
  const endMonth = new Date(startMonth); endMonth.setMonth(endMonth.getMonth() + 1);

  const users = await prisma.user.findMany({
    where: { tenantId, status: "ATIVO" },
    orderBy: { name: "asc" },
  });

  // Conversas (chamados) atribuídas a cada atendente no mês
  const convs = await prisma.conversation.groupBy({
    by: ["ownerId"],
    where: { tenantId, ownerId: { not: null }, createdAt: { gte: startMonth, lt: endMonth } },
    _count: true,
  });

  // Reuniões agendadas (tarefas Reunião com dueDate no mês)
  const meetings = await prisma.task.findMany({
    where: { tenantId, title: { contains: "Reunião", mode: "insensitive" }, dueDate: { gte: startMonth, lt: endMonth }, assigneeId: { not: null } },
    select: { assigneeId: true, status: true, dueDate: true },
  });

  // Propostas enviadas no mês
  const proposals = await prisma.proposal.groupBy({
    by: ["ownerId"],
    where: { tenantId, ownerId: { not: null }, createdAt: { gte: startMonth, lt: endMonth } },
    _count: true,
  });

  // Deals ganhos/perdidos no mês
  const wonByOwner = await prisma.deal.groupBy({
    by: ["ownerId"],
    where: { tenantId, ownerId: { not: null }, status: "GANHO", wonAt: { gte: startMonth, lt: endMonth } },
    _count: true, _sum: { value: true },
  });
  const lostByOwner = await prisma.deal.groupBy({
    by: ["ownerId"],
    where: { tenantId, ownerId: { not: null }, status: "PERDIDO", lostAt: { gte: startMonth, lt: endMonth } },
    _count: true,
  });

  const chamadosMap = Object.fromEntries(convs.map(c => [c.ownerId as string, c._count]));
  const propostasMap = Object.fromEntries(proposals.map(p => [p.ownerId as string, p._count]));
  const wonMap = Object.fromEntries(wonByOwner.map(d => [d.ownerId as string, { count: d._count, value: Number(d._sum.value ?? 0) }]));
  const lostMap = Object.fromEntries(lostByOwner.map(d => [d.ownerId as string, d._count]));

  const rows = users.map(u => {
    const myMeetings = meetings.filter(m => m.assigneeId === u.id);
    const today = new Date();
    const reunioesAgendadas = myMeetings.filter(m => m.status === "PENDENTE" && (!m.dueDate || m.dueDate >= today)).length;
    const reunioesConcluidas = myMeetings.filter(m => m.status === "CONCLUIDA" || (m.dueDate && m.dueDate < today && m.status !== "CANCELADA")).length;
    return {
      id: u.id,
      name: u.name,
      role: u.commercialRole,
      jobTitle: u.jobTitle,
      goal: Number(u.monthlyGoal ?? 0),
      chamados: Number(chamadosMap[u.id] ?? 0),
      reunioesAgendadas,
      reunioesConcluidas,
      propostas: Number(propostasMap[u.id] ?? 0),
      ganhos: Number(wonMap[u.id]?.count ?? 0),
      ganhosValor: Number(wonMap[u.id]?.value ?? 0),
      perdas: Number(lostMap[u.id] ?? 0),
    };
  });

  const total = {
    chamados: rows.reduce((a, r) => a + r.chamados, 0),
    reunioesAgendadas: rows.reduce((a, r) => a + r.reunioesAgendadas, 0),
    reunioesConcluidas: rows.reduce((a, r) => a + r.reunioesConcluidas, 0),
    propostas: rows.reduce((a, r) => a + r.propostas, 0),
    ganhos: rows.reduce((a, r) => a + r.ganhos, 0),
    ganhosValor: rows.reduce((a, r) => a + r.ganhosValor, 0),
  };

  return (
    <>
      <PageHeader
        title="Atendentes"
        description={`Andamento da equipe — ${startMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
      />

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <Kpi icon={Phone} label="Chamados" value={total.chamados} />
        <Kpi icon={CalendarCheck} label="Reuniões agendadas" value={total.reunioesAgendadas} />
        <Kpi icon={CheckCircle2} label="Reuniões concluídas" value={total.reunioesConcluidas} />
        <Kpi icon={FileText} label="Propostas enviadas" value={total.propostas} />
        <Kpi icon={Trophy} label="Ganhos" value={total.ganhos} variant="success" />
        <Kpi icon={Target} label="Valor vendido" value={formatCurrency(total.ganhosValor)} variant="brand" />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum atendente cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Atendente</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground"><Phone className="h-3 w-3 inline" /> Chamados</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground"><CalendarCheck className="h-3 w-3 inline" /> Agendadas</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground"><CheckCircle2 className="h-3 w-3 inline" /> Concluídas</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground"><FileText className="h-3 w-3 inline" /> Propostas</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground text-emerald-700"><Trophy className="h-3 w-3 inline" /> Ganhos</th>
                  <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Perdas</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Vendido</th>
                  <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.goal > 0 ? Math.min(100, Math.round((r.ganhosValor / r.goal) * 100)) : 0;
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/10">
                      <td className="p-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.jobTitle ?? r.role}</div>
                      </td>
                      <td className="p-3 text-center font-medium">{r.chamados}</td>
                      <td className="p-3 text-center font-medium">{r.reunioesAgendadas}</td>
                      <td className="p-3 text-center font-medium">{r.reunioesConcluidas}</td>
                      <td className="p-3 text-center font-medium">{r.propostas}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{r.ganhos}</td>
                      <td className="p-3 text-center text-red-600">{r.perdas}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">{formatCurrency(r.ganhosValor)}</td>
                      <td className="p-3 text-right">
                        <div className="text-xs text-muted-foreground">{formatCurrency(r.goal)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[80px]">
                            <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${pct}%` }} />
                          </div>
                          <Badge variant={pct >= 100 ? "success" : "outline"} className="text-[10px]">{pct}%</Badge>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Kpi({ icon: Icon, label, value, variant }: { icon: any; label: string; value: any; variant?: "success" | "brand" }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={`text-2xl font-bold mt-1 ${variant === "success" ? "text-emerald-700" : variant === "brand" ? "text-[hsl(var(--brand))]" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}
