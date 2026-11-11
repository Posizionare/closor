import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { ProposalView } from "./ProposalView";

export default async function GenerateProposalPage({ params, searchParams }: { params: { dealId: string }; searchParams: { tpl?: string } }) {
  await requireModule("PROPOSTAS");
  const { tenantId } = await getTenant();
  const [deal, tenant, template] = await Promise.all([
    prisma.deal.findFirst({
      where: { id: params.dealId, tenantId },
      include: { contact: true, items: { include: { product: true } }, owner: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    searchParams.tpl
      ? prisma.proposalTemplate.findFirst({ where: { id: searchParams.tpl, tenantId } })
      : prisma.proposalTemplate.findFirst({ where: { tenantId, active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!deal || !tenant) notFound();

  return <ProposalView
    deal={JSON.parse(JSON.stringify(deal))}
    tenant={JSON.parse(JSON.stringify(tenant))}
    template={template ? JSON.parse(JSON.stringify(template)) : null}
  />;
}
