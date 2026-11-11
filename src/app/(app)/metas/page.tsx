import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";

export default async function MetasPage() {
  await requireModule("METAS");
  const { tenantId, userId, isAdmin, role } = await getTenant();
  const isManager = isAdmin || role === "GESTOR";

  const startMonth = new Date();
  startMonth.setDate(1); startMonth.setHours(0,0,0,0);

  const users = await prisma.user.findMany({
    where: { tenantId, status: "ATIVO" },
    orderBy: { name: "asc" },
  });

  const sales = await prisma.deal.groupBy({
    by: ["ownerId"],
    where: { tenantId, status: "GANHO", wonAt: { gte: startMonth } },
    _count: true, _sum: { value: true },
  });
  const salesByOwner = Object.fromEntries(sales.filter(s => s.ownerId).map(s => [s.ownerId as string, s]));

  // Calcula % com 1 casa decimal quando muito pequeno (> 0 mas < 1%) para não mostrar "0%" enganoso
  function pctOf(value: number, goal: number): number {
    if (goal <= 0) return 0;
    const raw = (value / goal) * 100;
    if (raw <= 0) return 0;
    if (raw < 1) return Math.round(raw * 10) / 10; // 0.1, 0.5, 0.9
    return Math.min(100, Math.round(raw));
  }

  // Painel atendente
  const me = users.find(u => u.id === userId);
  const myStats = salesByOwner[userId] ?? { _count: 0, _sum: { value: 0 } };
  const myGoal = Number(me?.monthlyGoal ?? 0);
  const myValue = Number(myStats._sum?.value ?? 0);
  const myPct = pctOf(myValue, myGoal);

  // Painel gestor
  const teamGoal = users.reduce((a, u) => a + Number(u.monthlyGoal ?? 0), 0);
  const teamValue = sales.reduce((a, s) => a + Number(s._sum.value ?? 0), 0);
  const teamPct = pctOf(teamValue, teamGoal);

  const ranking = users.map(u => {
    const v = Number(salesByOwner[u.id]?._sum?.value ?? 0);
    const c = Number(salesByOwner[u.id]?._count ?? 0);
    const goal = Number(u.monthlyGoal ?? 0);
    return { id: u.id, name: u.name, role: u.commercialRole, goal, value: v, count: c, pct: pctOf(v, goal) };
  }).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Metas comerciais" description={`Mês de referência: ${startMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`} />

      {isManager ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Meta da equipe" value={formatCurrency(teamGoal)} />
            <Stat label="Realizado" value={formatCurrency(teamValue)} variant="success" />
            <Stat label="Faltam" value={formatCurrency(Math.max(0, teamGoal - teamValue))} />
            <Stat label="Atingimento" value={`${teamPct}%`} sub={teamPct >= 100 ? "Meta batida 🎉" : ""} variant={teamPct >= 100 ? "success" : undefined} />
          </div>

          <Card>
            <CardHeader><CardTitle>Ranking do mês</CardTitle><CardDescription>Por valor vendido (ganho).</CardDescription></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {ranking.map((r, i) => (
                  <li key={r.id} className="grid grid-cols-12 gap-2 p-4 items-center">
                    <span className="col-span-1 font-bold text-muted-foreground">#{i+1}</span>
                    <div className="col-span-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground"><Badge variant="outline">{r.role}</Badge></div>
                    </div>
                    <div className="col-span-2 text-sm"><span className="text-muted-foreground">Meta</span> <strong>{formatCurrency(r.goal)}</strong></div>
                    <div className="col-span-2 text-sm"><span className="text-muted-foreground">Vendido</span> <strong className="text-emerald-600">{formatCurrency(r.value)}</strong></div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${r.pct}%` }} />
                        </div>
                        <Badge variant={r.pct >= 100 ? "success" : "outline"}>{r.pct}%</Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card>
            <CardHeader><CardTitle>Minha meta do mês</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{formatCurrency(myValue)}</div>
              <div className="text-sm text-muted-foreground">de {formatCurrency(myGoal)}</div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-[hsl(var(--brand))]" style={{ width: `${myPct}%` }} /></div>
              <div className="mt-2 text-right"><Badge variant={myPct >= 100 ? "success" : "warning"}>{myPct}%</Badge></div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Vendas no mês</CardTitle></CardHeader><CardContent>
            <div className="text-3xl font-semibold">{myStats._count}</div>
            <p className="text-sm text-muted-foreground">oportunidades ganhas</p>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Falta</CardTitle></CardHeader><CardContent>
            <div className="text-3xl font-semibold">{formatCurrency(Math.max(0, myGoal - myValue))}</div>
            <p className="text-sm text-muted-foreground">para bater a meta</p>
          </CardContent></Card>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, sub, variant }: any) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${variant === "success" ? "text-emerald-600" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent></Card>
  );
}
