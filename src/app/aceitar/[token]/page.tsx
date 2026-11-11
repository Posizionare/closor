import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientAcceptView } from "./ClientAcceptView";

export default async function AceitarPage({ params }: { params: { token: string } }) {
  const p = await prisma.proposal.findUnique({
    where: { acceptToken: params.token },
    include: { contact: true, tenant: true },
  });
  if (!p) notFound();
  const [owner, template] = await Promise.all([
    p.ownerId ? prisma.user.findUnique({ where: { id: p.ownerId }, select: { name: true, email: true } }) : null,
    p.templateId ? prisma.proposalTemplate.findUnique({ where: { id: p.templateId } }) : null,
  ]);
  return (
    <ClientAcceptView
      proposal={JSON.parse(JSON.stringify(p))}
      contact={p.contact ? JSON.parse(JSON.stringify(p.contact)) : null}
      tenant={JSON.parse(JSON.stringify(p.tenant))}
      template={template ? JSON.parse(JSON.stringify(template)) : null}
      ownerName={owner?.name ?? null}
    />
  );
}
