import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { ProposalMirror } from "./ProposalMirror";

export default async function ProposalDetailPage({ params }: { params: { id: string } }) {
  await requireModule("PROPOSTAS");
  const { tenantId } = await getTenant();
  const p = await prisma.proposal.findFirst({
    where: { id: params.id, tenantId },
    include: { contact: true, tenant: true },
  });
  if (!p) notFound();
  const owner = p.ownerId ? await prisma.user.findUnique({ where: { id: p.ownerId }, select: { name: true, email: true } }) : null;
  return (
    <ProposalMirror
      proposal={JSON.parse(JSON.stringify(p))}
      contact={p.contact ? JSON.parse(JSON.stringify(p.contact)) : null}
      tenant={JSON.parse(JSON.stringify(p.tenant))}
      owner={owner ? JSON.parse(JSON.stringify(owner)) : null}
    />
  );
}
