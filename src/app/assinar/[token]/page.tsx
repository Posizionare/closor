import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientSignView } from "./ClientSignView";

export default async function AssinarPage({ params }: { params: { token: string } }) {
  const c = await prisma.contract.findUnique({
    where: { signingToken: params.token },
    include: { contact: true, tenant: true, owner: { select: { name: true, email: true } } },
  });
  if (!c) notFound();

  return (
    <ClientSignView
      contract={JSON.parse(JSON.stringify(c))}
      contact={c.contact ? JSON.parse(JSON.stringify(c.contact)) : null}
      tenant={JSON.parse(JSON.stringify(c.tenant))}
      ownerName={c.owner?.name ?? null}
    />
  );
}
