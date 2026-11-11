import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskBoard } from "./TaskBoard";

export default async function TasksPage({ searchParams }: { searchParams: { filter?: string } }) {
  await requireModule("TAREFAS");
  const { tenantId, userId, isAdmin, role } = await getTenant();
  const filter = searchParams.filter ?? "minhas";
  const isManager = isAdmin || role === "GESTOR";

  const where: any = { tenantId };
  if (filter === "minhas" || !isManager) where.assigneeId = userId;
  if (filter === "atrasadas") where.dueDate = { lt: new Date() };

  const [tasks, contacts, users] = await Promise.all([
    prisma.task.findMany({
      where, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 200,
      include: { contact: true, deal: true, assignee: true },
    }),
    prisma.contact.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: 200 }),
    prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Tarefas" description={isManager ? "Atividades do time." : "Suas atividades."} />
      <TaskBoard
        tasks={JSON.parse(JSON.stringify(tasks))}
        contacts={JSON.parse(JSON.stringify(contacts))}
        users={JSON.parse(JSON.stringify(users))}
        currentFilter={filter}
        canSeeAll={isManager}
      />
    </>
  );
}
