import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatFlowPanel } from "./ChatFlowPanel";
import { AutomationsPanel } from "./AutomationsPanel";

export default async function AgenteChatPage() {
  await requireModule("AGENTE_CHAT");
  const { tenantId } = await getTenant();
  const [flows, sectors, automations] = await Promise.all([
    prisma.chatFlow.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.sector.findMany({ where: { tenantId } }),
    prisma.automationFlow.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader title="Agente de Chat" description="Crie automações com fluxos visuais — o cliente responde X, segue para Y." />
      <AutomationsPanel automations={JSON.parse(JSON.stringify(automations))} sectors={JSON.parse(JSON.stringify(sectors))} />
      <div className="mt-6">
        <ChatFlowPanel flows={JSON.parse(JSON.stringify(flows))} sectors={JSON.parse(JSON.stringify(sectors))} />
      </div>
    </>
  );
}
