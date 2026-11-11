import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { FlowEditor } from "./FlowEditor";

export default async function AutomationEditorPage({ params }: { params: { id: string } }) {
  await requireModule("AGENTE_CHAT");
  const { tenantId } = await getTenant();
  const auto = await prisma.automationFlow.findFirst({ where: { id: params.id, tenantId } });
  if (!auto) notFound();
  const sectors = await prisma.sector.findMany({ where: { tenantId } });
  return (
    <>
      <PageHeader title={auto.name} description={`Editor visual de fluxo · ${auto.layout === "fluxograma" ? "Fluxograma" : "Esteira"}`} />
      <FlowEditor
        automation={JSON.parse(JSON.stringify(auto))}
        sectors={JSON.parse(JSON.stringify(sectors))}
      />
    </>
  );
}
