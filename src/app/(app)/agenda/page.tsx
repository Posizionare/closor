import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgendaPanel } from "./AgendaPanel";

export default async function AgendaPage({ searchParams }: { searchParams: { y?: string; m?: string } }) {
  await requireModule("AGENDA");
  const { tenantId, userId, isAdmin, role } = await getTenant();
  const isManager = isAdmin || role === "GESTOR";

  const now = new Date();
  const year = Number(searchParams.y ?? now.getFullYear());
  const month = Number(searchParams.m ?? now.getMonth());
  const start = new Date(year, month, 1, 0, 0, 0);
  const end = new Date(year, month + 1, 1, 0, 0, 0);

  const where: any = {
    tenantId,
    dueDate: { gte: start, lt: end },
    status: { not: "CANCELADA" },
    OR: [
      { title: { contains: "Reunião", mode: "insensitive" } },
      { title: { contains: "Follow up", mode: "insensitive" } },
    ],
  };
  if (!isManager) where.assigneeId = userId;

  const [meetings, contacts, users, integration] = await Promise.all([
    prisma.task.findMany({ where, include: { contact: true, assignee: true }, orderBy: { dueDate: "asc" } }),
    prisma.contact.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: 200 }),
    prisma.user.findMany({ where: { tenantId, status: "ATIVO" } }),
    prisma.integration.findFirst({ where: { tenantId, provider: "google_calendar" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Agenda"
        description={isManager ? "Calendário consolidado — reuniões de todos os atendentes." : "Suas reuniões agendadas."}
        actions={integration?.connected ? <Badge variant="success">Google Agenda conectado</Badge> : <Badge variant="outline">Google Agenda desconectado</Badge>}
      />
      <AgendaPanel
        year={year} month={month}
        isManager={isManager}
        meetings={JSON.parse(JSON.stringify(meetings))}
        contacts={JSON.parse(JSON.stringify(contacts))}
        users={JSON.parse(JSON.stringify(users))}
        googleConnected={!!integration?.connected}
      />
    </>
  );
}
