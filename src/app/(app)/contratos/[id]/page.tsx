import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { ContractMirror } from "./ContractMirror";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  await requireModule("CONTRATOS");
  const { tenantId } = await getTenant();

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, tenantId },
    include: { contact: true, owner: true, tenant: true },
  });
  if (!contract) notFound();

  return (
    <ContractMirror
      contract={JSON.parse(JSON.stringify(contract))}
      tenant={JSON.parse(JSON.stringify(contract.tenant))}
      contact={contract.contact ? JSON.parse(JSON.stringify(contract.contact)) : null}
      owner={contract.owner ? JSON.parse(JSON.stringify(contract.owner)) : null}
    />
  );
}
