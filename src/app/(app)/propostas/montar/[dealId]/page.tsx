import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalBuilder } from "./ProposalBuilder";

export default async function MontarPropostaPage({ params }: { params: { dealId: string } }) {
  await requireModule("PROPOSTAS");
  const { tenantId } = await getTenant();
  const [deal, products, templates] = await Promise.all([
    prisma.deal.findFirst({
      where: { id: params.dealId, tenantId },
      include: { contact: true, items: { include: { product: true } } },
    }),
    prisma.product.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.proposalTemplate.findMany({ where: { tenantId, active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!deal) notFound();

  return (
    <>
      <PageHeader
        title="Montar proposta"
        description={`Liberdade total: edite produtos, valores e descontos antes de enviar — ${deal.title}`}
      />
      <ProposalBuilder
        deal={JSON.parse(JSON.stringify(deal))}
        products={JSON.parse(JSON.stringify(products))}
        templates={JSON.parse(JSON.stringify(templates))}
      />
    </>
  );
}
