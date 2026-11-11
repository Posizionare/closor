import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { CommissionPanel } from "./CommissionPanel";
import { formatCurrency } from "@/lib/utils";

export default async function ComissoesPage() {
  await requireModule("METAS");
  const { tenantId, userId, isAdmin, role } = await getTenant();
  const isManager = isAdmin || role === "GESTOR";

  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
  const endMonth = new Date(startMonth); endMonth.setMonth(endMonth.getMonth() + 1);

  // Mostra TODOS os usuários ativos (qualquer um que feche um deal entra na meta dele)
  const users = await prisma.user.findMany({
    where: { tenantId, status: "ATIVO" },
    orderBy: { name: "asc" },
  });

  const sales = await prisma.deal.groupBy({
    by: ["ownerId"],
    where: { tenantId, status: "GANHO", wonAt: { gte: startMonth, lt: endMonth } },
    _count: true, _sum: { value: true },
  });
  const salesByOwner = Object.fromEntries(sales.filter(s => s.ownerId).map(s => [s.ownerId as string, s]));

  const totalDeals = sales.reduce((a, s) => a + s._count, 0);
  const totalValue = sales.reduce((a, s) => a + Number(s._sum.value ?? 0), 0);

  const rows = users.map(u => {
    const v = Number(salesByOwner[u.id]?._sum?.value ?? 0);
    const c = Number(salesByOwner[u.id]?._count ?? 0);
    const rate = Number(u.commissionRate ?? 0);
    const goal = Number(u.monthlyGoal ?? 0);
    return {
      id: u.id, name: u.name, role: u.commercialRole, jobTitle: u.jobTitle,
      rate, count: c, value: v, commission: (v * rate) / 100,
      goal, goalProgress: goal > 0 ? Math.min(100, (v / goal) * 100) : 0,
    };
  });
  const totalCommission = rows.reduce((a, r) => a + r.commission, 0);

  return (
    <>
      <PageHeader
        title="Comissões"
        description={isManager ? "Visão completa do mês — defina o % de cada vendedor." : "Sua comissão neste mês."}
        actions={<Badge variant="info">{startMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Badge>}
      />

      {isManager ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
            <Stat label="Contratos fechados" value={totalDeals.toString()} />
            <Stat label="Valor total em vendas" value={formatCurrency(totalValue)} variant="success" />
            <Stat label="Comissão total" value={formatCurrency(totalCommission)} variant="brand" />
            <Stat label="Comissão / venda média" value={totalDeals > 0 ? formatCurrency(totalCommission / totalDeals) : "—"} />
          </div>
          <CommissionPanel rows={rows} />
        </>
      ) : (
        <MyCommissionView row={rows.find(r => r.id === userId)} />
      )}
    </>
  );
}

function Stat({ label, value, variant }: { label: string; value: string; variant?: "success"|"brand" }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${variant === "success" ? "text-emerald-600" : variant === "brand" ? "text-[hsl(var(--brand))]" : ""}`}>{value}</div>
    </CardContent></Card>
  );
}

function MyCommissionView({ row }: { row: any }) {
  if (!row) return <Card><CardContent className="p-8 text-center text-muted-foreground">Sem dados de comissão.</CardContent></Card>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card><CardHeader><CardTitle>Vendas no mês</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{row.count}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Valor vendido</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold text-emerald-600">{formatCurrency(row.value)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Sua comissão</CardTitle><CardDescription>{row.rate}% sobre o vendido</CardDescription></CardHeader><CardContent><div className="text-3xl font-semibold text-[hsl(var(--brand))]">{formatCurrency(row.commission)}</div></CardContent></Card>
    </div>
  );
}
