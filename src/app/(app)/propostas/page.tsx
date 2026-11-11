import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalsHub } from "./ProposalsHub";

export default async function PropostasPage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  await requireModule("PROPOSTAS");
  const { tenantId } = await getTenant();

  const q = (searchParams.q ?? "").trim();
  const where: any = { tenantId };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { number: { contains: q, mode: "insensitive" } },
      { contact: { name: { contains: q, mode: "insensitive" } } },
      { contact: { company: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [templates, deals, proposals] = await Promise.all([
    prisma.proposalTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.deal.findMany({
      where: { tenantId, status: "ABERTO" },
      include: { contact: true, items: true, owner: true },
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.proposal.findMany({
      where, include: { contact: true }, orderBy: { createdAt: "desc" }, take: 200,
    }),
  ]);

  return (
    <>
      <PageHeader title="Propostas comerciais" description="Crie modelos, monte propostas e acompanhe os aceites." />
      <ProposalsHub
        templates={JSON.parse(JSON.stringify(templates))}
        deals={JSON.parse(JSON.stringify(deals))}
        proposals={JSON.parse(JSON.stringify(proposals))}
        currentTab={searchParams.tab === "enviadas" ? "enviadas" : "criar"}
        currentQ={q}
      />
    </>
  );
}
