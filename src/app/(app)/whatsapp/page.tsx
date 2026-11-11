import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { Inbox } from "./Inbox";
import { ConnectionGate } from "./ConnectionGate";

const COMMERCIAL_ROLES = ["SDR", "VENDAS", "PROSPECCAO", "CLOSER", "COMERCIAL"];

function roleToView(role: string, isAdmin: boolean): "manager" | "comercial" | "suporte" | "financeiro" {
  if (isAdmin || role === "GESTOR") return "manager";
  if (COMMERCIAL_ROLES.includes(role)) return "comercial";
  if (role === "SUPORTE") return "suporte";
  if (role === "FINANCEIRO") return "financeiro";
  return "comercial";
}

export default async function WhatsappPage({ searchParams }: { searchParams: { c?: string; status?: string; q?: string; dept?: string } }) {
  await requireSession();
  const { tenantId, userId, isAdmin, role } = await getTenant();
  const view = roleToView(role, isAdmin);

  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } });
  if (!conn || conn.status !== "CONECTADO") {
    return (
      <>
        <PageHeader title="WhatsApp" description="Conecte seu WhatsApp para começar a atender." />
        <ConnectionGate connection={conn ? JSON.parse(JSON.stringify(conn)) : null} />
      </>
    );
  }

  const showClosed = searchParams.status === "ENCERRADA";
  // Filtros base
  const where: any = { tenantId, channel: "whatsapp" };
  where.status = showClosed ? "ENCERRADA" : { not: "ENCERRADA" as any };

  // Departamento por papel
  if (view === "suporte") where.department = "suporte";
  else if (view === "financeiro") where.department = "financeiro";
  else if (view === "comercial") where.department = { in: ["comercial", null] };

  if (searchParams.dept && view === "manager") where.department = searchParams.dept;
  if (searchParams.q) {
    where.contact = {
      OR: [
        { name: { contains: searchParams.q, mode: "insensitive" } },
        { whatsapp: { contains: searchParams.q } },
        { company: { contains: searchParams.q, mode: "insensitive" } },
      ],
    };
  }

  const [conversations, users, sectors, productList, proposalTemplates, contractTemplates] = await Promise.all([
    prisma.conversation.findMany({
      where, orderBy: { lastMessageAt: "desc" }, take: 100,
      include: { contact: true, owner: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, orderBy: { name: "asc" } }),
    prisma.sector.findMany({ where: { tenantId } }),
    prisma.product.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.proposalTemplate.findMany({ where: { tenantId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.contractTemplate.findMany({ where: { tenantId, active: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const selectedId = searchParams.c ?? conversations[0]?.id;
  let selected: any = null;
  let selectedContract: any = null;
  let selectedHasProposal = false;
  if (selectedId) {
    selected = await prisma.conversation.findFirst({
      where: { id: selectedId, tenantId },
      include: { contact: true, owner: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (selected?.contactId) {
      selectedContract = await prisma.contract.findFirst({
        where: { tenantId, contactId: selected.contactId },
        orderBy: { createdAt: "desc" },
      });
      const propCount = await prisma.proposal.count({
        where: { tenantId, contactId: selected.contactId, status: { in: ["ENVIADA", "ACEITA", "RECUSADA"] } },
      });
      selectedHasProposal = propCount > 0;
    }
  }

  return (
    <>
      <PageHeader title="WhatsApp" description={`Conectado: ${conn.phoneNumber ?? conn.displayName ?? conn.mode}`} />
      <Inbox
        view={view}
        showClosed={showClosed}
        conversations={JSON.parse(JSON.stringify(conversations))}
        selected={selected ? JSON.parse(JSON.stringify(selected)) : null}
        selectedContract={selectedContract ? JSON.parse(JSON.stringify(selectedContract)) : null}
        selectedHasProposal={selectedHasProposal}
        users={JSON.parse(JSON.stringify(users))}
        sectors={JSON.parse(JSON.stringify(sectors))}
        products={JSON.parse(JSON.stringify(productList))}
        proposalTemplates={JSON.parse(JSON.stringify(proposalTemplates))}
        contractTemplates={JSON.parse(JSON.stringify(contractTemplates))}
        currentUserId={userId}
      />
    </>
  );
}
