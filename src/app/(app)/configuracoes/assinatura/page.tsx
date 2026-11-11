import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SubscriptionView } from "./SubscriptionView";

export default async function AssinaturaPage() {
  const session = (await auth())!;
  const tenantId = (session.user as any).tenantId as string;
  const [tenant, sub, invoices, userCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.subscription.findUnique({ where: { tenantId } }),
    prisma.invoice.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.user.count({ where: { tenantId, status: "ATIVO" } }),
  ]);

  return (
    <>
      <PageHeader title="Assinatura" description="Plano atual, cobrança e histórico de faturas." />
      <SubscriptionView
        tenant={JSON.parse(JSON.stringify(tenant))}
        subscription={sub ? JSON.parse(JSON.stringify(sub)) : null}
        invoices={JSON.parse(JSON.stringify(invoices))}
        userCount={userCount}
      />
    </>
  );
}
