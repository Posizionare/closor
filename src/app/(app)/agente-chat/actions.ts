"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function saveFlow(formData: FormData) {
  const { tenantId } = await getTenant();
  const id = String(formData.get("id") ?? "");
  const data = {
    tenantId,
    name: String(formData.get("name") ?? ""),
    trigger: String(formData.get("trigger") ?? "keyword"),
    keyword: String(formData.get("keyword") ?? "") || null,
    response: String(formData.get("response") ?? "") || null,
    action: String(formData.get("action") ?? "") || null,
    sectorId: String(formData.get("sectorId") ?? "") || null,
    workingHoursStart: String(formData.get("workingHoursStart") ?? "") || null,
    workingHoursEnd: String(formData.get("workingHoursEnd") ?? "") || null,
    outOfHoursMessage: String(formData.get("outOfHoursMessage") ?? "") || null,
    active: formData.get("active") !== "off",
  };
  if (id) await prisma.chatFlow.update({ where: { id, tenantId }, data });
  else await prisma.chatFlow.create({ data });
  revalidatePath("/agente-chat");
  return { ok: true };
}

export async function deleteFlow(id: string) {
  const { tenantId } = await getTenant();
  await prisma.chatFlow.delete({ where: { id, tenantId } });
  revalidatePath("/agente-chat");
}

// ===== Automações visuais (esteira / fluxograma) =====

export async function createAutomation(name: string, layout: "esteira" | "fluxograma") {
  const { tenantId } = await getTenant();
  // Inicia com um único nó "Boas-vindas"
  const initialNodes = [
    { id: "n1", type: "message", position: { x: 320, y: 40 }, data: { text: "Olá! Bem-vindo. Como posso te ajudar hoje?" } },
  ];
  const a = await prisma.automationFlow.create({
    data: {
      tenantId, name, layout, active: true,
      nodes: initialNodes as any,
      edges: [] as any,
    },
  });
  revalidatePath("/agente-chat");
  return { ok: true, id: a.id };
}

export async function saveAutomation(id: string, payload: { name?: string; layout?: string; nodes: any[]; edges: any[]; active?: boolean }) {
  const { tenantId } = await getTenant();
  await prisma.automationFlow.update({
    where: { id, tenantId },
    data: {
      ...(payload.name != null ? { name: payload.name } : {}),
      ...(payload.layout != null ? { layout: payload.layout } : {}),
      ...(payload.active != null ? { active: payload.active } : {}),
      nodes: payload.nodes as any,
      edges: payload.edges as any,
    },
  });
  revalidatePath("/agente-chat");
  return { ok: true };
}

export async function deleteAutomation(id: string) {
  const { tenantId } = await getTenant();
  await prisma.automationFlow.delete({ where: { id, tenantId } });
  revalidatePath("/agente-chat");
}
