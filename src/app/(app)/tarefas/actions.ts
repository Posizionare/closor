"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createTask(formData: FormData) {
  const { tenantId, userId } = await getTenant();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Título obrigatório." };
  const due = String(formData.get("dueDate") ?? "");
  await prisma.task.create({
    data: {
      tenantId, title,
      description: String(formData.get("description") ?? "") || null,
      dueDate: due ? new Date(due) : null,
      priority: String(formData.get("priority") ?? "media"),
      assigneeId: String(formData.get("assigneeId") ?? userId),
      contactId: String(formData.get("contactId") ?? "") || null,
      dealId: String(formData.get("dealId") ?? "") || null,
    },
  });
  revalidatePath("/tarefas");
  return { ok: true };
}

export async function setTaskStatus(id: string, status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA") {
  const { tenantId } = await getTenant();
  await prisma.task.update({ where: { id, tenantId }, data: { status } });
  revalidatePath("/tarefas");
}

export async function deleteTask(id: string) {
  const { tenantId } = await getTenant();
  await prisma.task.delete({ where: { id, tenantId } });
  revalidatePath("/tarefas");
}
