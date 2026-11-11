import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { ReportsHub } from "./ReportsHub";

const MONTHS_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function RelatoriosPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireModule("RELATORIOS");
  const { tenantId } = await getTenant();
  const tab = searchParams.tab === "contratos" || searchParams.tab === "chamados" ? searchParams.tab : "visao";

  const today = new Date();
  // Janela: últimos 6 meses
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1, 0, 0, 0);
  // Janela: últimos 30 dias
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 3600 * 1000);

  // Mês atual
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  // Mês anterior
  const startPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endPrevMonth = startMonth;

  const [
    deals, dealsByOrigin, dealsByOwner, contacts,
    monthlyDealsRaw, dailyDealsRaw, monthlyContactsRaw, dailyContactsRaw,
    monthlyConvsRaw, currentMonthAgg, prevMonthAgg,
  ] = await Promise.all([
    prisma.deal.groupBy({ by: ["status"], where: { tenantId }, _count: true, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ["origin"], where: { tenantId, status: "GANHO" }, _count: true, _sum: { value: true } }),
    prisma.deal.groupBy({ by: ["ownerId"], where: { tenantId, status: "GANHO", ownerId: { not: null } }, _count: true, _sum: { value: true } }),
    prisma.contact.count({ where: { tenantId } }),
    // Deals por mês (últimos 6 meses)
    prisma.deal.findMany({
      where: { tenantId, status: "GANHO", wonAt: { gte: sixMonthsAgo } },
      select: { wonAt: true, value: true },
    }),
    // Deals por dia (últimos 30 dias)
    prisma.deal.findMany({
      where: { tenantId, status: "GANHO", wonAt: { gte: thirtyDaysAgo } },
      select: { wonAt: true, value: true },
    }),
    // Contatos por mês
    prisma.contact.findMany({ where: { tenantId, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    // Contatos por dia
    prisma.contact.findMany({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    // Chamados (conversas) por mês
    prisma.conversation.findMany({ where: { tenantId, channel: "whatsapp", createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
    // Mês atual
    prisma.deal.aggregate({ where: { tenantId, status: "GANHO", wonAt: { gte: startMonth, lt: endMonth } }, _count: true, _sum: { value: true } }),
    // Mês anterior
    prisma.deal.aggregate({ where: { tenantId, status: "GANHO", wonAt: { gte: startPrevMonth, lt: endPrevMonth } }, _count: true, _sum: { value: true } }),
  ]);

  const owners = await prisma.user.findMany({ where: { id: { in: dealsByOwner.map(d => d.ownerId).filter(Boolean) as string[] } } });
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]));

  // Extras para abas Contratos e Chamados
  const contracts = await prisma.contract.findMany({
    where: { tenantId, createdAt: { gte: sixMonthsAgo } },
    include: { contact: { select: { name: true, company: true } }, owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  const expiringIn30 = await prisma.contract.count({ where: { tenantId, expiresAt: { gte: today, lte: new Date(today.getTime() + 30 * 24 * 3600 * 1000) }, status: { in: ["VIGENTE", "ASSINADO"] } } });
  const allConvs = await prisma.conversation.count({ where: { tenantId, channel: "whatsapp", createdAt: { gte: sixMonthsAgo } } });
  const convsByOwner = await prisma.conversation.groupBy({
    by: ["ownerId"], where: { tenantId, channel: "whatsapp", ownerId: { not: null }, createdAt: { gte: sixMonthsAgo } }, _count: true,
  });
  const ownerNames = await prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, select: { id: true, name: true } });
  const ownerNamesMap = Object.fromEntries(ownerNames.map(o => [o.id, o.name]));

  // Agrupa por mês
  function bucketByMonth<T>(arr: T[], pickDate: (x: T) => Date | null | undefined, pickValue?: (x: T) => number) {
    const out: { label: string; count: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      const items = arr.filter(x => {
        const xd = pickDate(x); return xd && xd >= d && xd < next;
      });
      out.push({
        label: MONTHS_LABEL[d.getMonth()],
        count: items.length,
        value: pickValue ? items.reduce((a, x) => a + Number(pickValue(x) ?? 0), 0) : 0,
      });
    }
    return out;
  }
  // Agrupa por dia (últimos 30)
  function bucketByDay<T>(arr: T[], pickDate: (x: T) => Date | null | undefined, pickValue?: (x: T) => number) {
    const out: { label: string; count: number; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const items = arr.filter(x => { const xd = pickDate(x); return xd && xd >= d && xd < next; });
      out.push({
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth()+1).padStart(2, "0")}`,
        count: items.length,
        value: pickValue ? items.reduce((a, x) => a + Number(pickValue(x) ?? 0), 0) : 0,
      });
    }
    return out;
  }

  const dealsByMonth = bucketByMonth(monthlyDealsRaw, d => d.wonAt, d => Number(d.value ?? 0));
  const dealsByDay = bucketByDay(dailyDealsRaw, d => d.wonAt, d => Number(d.value ?? 0));
  const contactsByMonth = bucketByMonth(monthlyContactsRaw, c => c.createdAt);
  const contactsByDay = bucketByDay(dailyContactsRaw, c => c.createdAt);
  const convsByMonth = bucketByMonth(monthlyConvsRaw, c => c.createdAt);

  const wonAgg = deals.find(d => d.status === "GANHO");
  const lostAgg = deals.find(d => d.status === "PERDIDO");
  const openAgg = deals.find(d => d.status === "ABERTO");
  const totalDeals = deals.reduce((a, d) => a + d._count, 0);
  const conversionRate = totalDeals > 0 ? ((wonAgg?._count ?? 0) / totalDeals) * 100 : 0;
  const ticketMedio = (wonAgg?._count ?? 0) > 0 ? Number(wonAgg?._sum.value ?? 0) / (wonAgg?._count ?? 1) : 0;

  const currentMonthValue = Number(currentMonthAgg._sum.value ?? 0);
  const prevMonthValue = Number(prevMonthAgg._sum.value ?? 0);
  const monthDelta = prevMonthValue > 0 ? ((currentMonthValue - prevMonthValue) / prevMonthValue) * 100 : (currentMonthValue > 0 ? 100 : 0);

  return (
    <>
      <PageHeader title="Relatórios" description="Métricas, evolução e comparações da operação comercial." />

      <ReportsHub
        currentTab={tab as "visao" | "contratos" | "chamados"}
        kpis={{
          ganhos: wonAgg?._count ?? 0,
          ganhosValor: Number(wonAgg?._sum.value ?? 0),
          perdas: lostAgg?._count ?? 0,
          abertos: openAgg?._count ?? 0,
          conversao: conversionRate,
          ticketMedio,
          contatos: contacts,
          mesAtualValor: currentMonthValue,
          mesAtualCount: currentMonthAgg._count,
          mesAnteriorValor: prevMonthValue,
          monthDelta,
        }}
        dealsByMonth={dealsByMonth}
        dealsByDay={dealsByDay}
        contactsByMonth={contactsByMonth}
        contactsByDay={contactsByDay}
        convsByMonth={convsByMonth}
        byOrigin={dealsByOrigin.map(d => ({ origin: d.origin ?? "Manual", count: d._count, value: Number(d._sum.value ?? 0) }))}
        byOwner={dealsByOwner
          .map(d => ({ name: ownerMap[d.ownerId ?? ""] ?? "—", count: d._count, value: Number(d._sum.value ?? 0) }))
          .sort((a, b) => b.value - a.value)}
        contracts={JSON.parse(JSON.stringify(contracts))}
        expiringIn30={expiringIn30}
        totalChamados={allConvs}
        chamadosByOwner={convsByOwner.map(c => ({ name: ownerNamesMap[c.ownerId ?? ""] ?? "—", count: c._count }))}
      />
    </>
  );
}
