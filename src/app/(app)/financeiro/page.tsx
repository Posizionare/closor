import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceHub } from "./FinanceHub";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default async function FinanceiroPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireSession();
  const { tenantId } = await getTenant();
  const tab = searchParams.tab === "recorrente" ? "recorrente" : "unico";

  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [unicos, recorrentes, allRecent] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { tenantId, kind: "UNICO" }, orderBy: { entryDate: "desc" }, take: 100,
    }),
    prisma.financeEntry.findMany({
      where: { tenantId, kind: "RECORRENTE" }, orderBy: { entryDate: "desc" }, take: 100,
    }),
    prisma.financeEntry.findMany({
      where: { tenantId, entryDate: { gte: sixMonthsAgo } },
      select: { entryDate: true, amount: true, monthlyAmount: true, kind: true },
    }),
  ]);

  // Evolução mensal
  const byMonth: { label: string; unico: number; recorrente: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const inMonth = allRecent.filter(e => e.entryDate >= d && e.entryDate < next);
    const unico = inMonth.filter(e => e.kind === "UNICO").reduce((a, e) => a + Number(e.amount), 0);
    const recorrente = inMonth.filter(e => e.kind === "RECORRENTE").reduce((a, e) => a + Number(e.monthlyAmount ?? e.amount), 0);
    byMonth.push({ label: MONTHS[d.getMonth()], unico, recorrente, total: unico + recorrente });
  }

  const totalUnico = unicos.reduce((a, e) => a + Number(e.amount), 0);
  const totalRecorrenteMes = recorrentes.reduce((a, e) => a + Number(e.monthlyAmount ?? 0), 0);
  const totalRecorrenteContrato = recorrentes.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <>
      <PageHeader title="Financeiro" description="Contratos fechados entram automaticamente no financeiro." />
      <FinanceHub
        currentTab={tab as "unico" | "recorrente"}
        unicos={JSON.parse(JSON.stringify(unicos))}
        recorrentes={JSON.parse(JSON.stringify(recorrentes))}
        byMonth={byMonth}
        totals={{ totalUnico, totalRecorrenteMes, totalRecorrenteContrato }}
      />
    </>
  );
}
