import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { Kanban } from "./Kanban";

export default async function FunilPage() {
  await requireModule("FUNIL");
  const { tenantId, userId, isAdmin, role } = await getTenant();

  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!pipeline) return <div className="text-muted-foreground">Funil não configurado.</div>;

  const isManager = isAdmin || role === "GESTOR";
  const dealWhere: any = { tenantId, pipelineId: pipeline.id };
  if (!isManager) dealWhere.ownerId = userId;

  const [deals, contacts, users] = await Promise.all([
    prisma.deal.findMany({
      where: dealWhere,
      orderBy: { createdAt: "desc" },
      include: {
        contact: true, owner: true, stage: true,
        items: { include: { product: true } },
      },
    }),
    prisma.contact.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: 200 }),
    prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Funil de Vendas"
        description={isManager ? "Visão geral de todas as oportunidades." : "Suas oportunidades."}
      />
      <Kanban
        stages={JSON.parse(JSON.stringify(pipeline.stages))}
        deals={JSON.parse(JSON.stringify(deals))}
        contacts={JSON.parse(JSON.stringify(contacts))}
        users={JSON.parse(JSON.stringify(users))}
      />
    </>
  );
}
