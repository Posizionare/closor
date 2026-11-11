"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { notifyManagers } from "@/lib/notifications";
import { assignContactTo, setAssignmentOutcome } from "@/lib/assignments";

export async function createDeal(formData: FormData) {
  const { tenantId, userId } = await getTenant();
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: { orderBy: { order: "asc" }, take: 1 } } });
  if (!pipeline) return { error: "Pipeline não encontrado." };
  const firstStage = pipeline.stages[0];
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Título obrigatório." };
  const contactId = String(formData.get("contactId") ?? "") || null;
  const ownerId = String(formData.get("ownerId") ?? userId);
  await prisma.deal.create({
    data: {
      tenantId, title,
      value: Number(formData.get("value") ?? 0),
      contactId,
      ownerId,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      origin: String(formData.get("origin") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  // Atribui o contato ao responsável do deal
  if (contactId) {
    await assignContactTo({ tenantId, contactId, userId: ownerId, reason: "TROCA_MANUAL", note: "Criou oportunidade no funil" });
  }
  revalidatePath("/funil");
  return { ok: true };
}

export async function moveDeal(dealId: string, toStageId: string) {
  const { tenantId, userId } = await getTenant();
  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId }, include: { stage: true } });
  if (!deal) return { error: "not found" };
  const toStage = await prisma.pipelineStage.findUnique({ where: { id: toStageId } });
  if (!toStage) return { error: "stage" };
  const status = toStage.type === "won" ? "GANHO" : toStage.type === "lost" ? "PERDIDO" : "ABERTO";
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stageId: toStageId,
      status,
      wonAt: status === "GANHO" ? new Date() : null,
      lostAt: status === "PERDIDO" ? new Date() : null,
    },
  });
  await prisma.dealHistory.create({
    data: {
      dealId, fromStage: deal.stage?.name, toStage: toStage.name,
      message: `Movido por ${userId}`, userId,
    },
  });

  // Notifica gestores em fechamentos
  if (status === "GANHO" || status === "PERDIDO") {
    await notifyManagers(tenantId, {
      type: status === "GANHO" ? "DEAL_WON" : "DEAL_LOST",
      title: status === "GANHO" ? "Novo fechamento" : "Oportunidade perdida",
      body: `${deal.title} (${Number(deal.value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
      url: "/funil",
    });
    // Marca outcome no histórico do contato
    if (deal.contactId && deal.ownerId) {
      await setAssignmentOutcome(tenantId, deal.contactId, deal.ownerId, status === "GANHO" ? "ganho" : "perdido");
    }
  }

  revalidatePath("/funil");
  revalidatePath("/comissoes");
  return { ok: true, status };
}

export async function deleteDeal(dealId: string) {
  const { tenantId } = await getTenant();
  await prisma.deal.delete({ where: { id: dealId, tenantId } });
  revalidatePath("/funil");
  return { ok: true };
}
