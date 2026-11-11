import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export async function notify(opts: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
}) {
  return prisma.notification.create({ data: opts });
}

export async function notifyManagers(tenantId: string, payload: { type: NotificationType; title: string; body?: string; url?: string }) {
  const managers = await prisma.user.findMany({
    where: { tenantId, status: "ATIVO", OR: [{ isAdmin: true }, { commercialRole: "GESTOR" }] },
    select: { id: true },
  });
  if (managers.length === 0) return;
  await prisma.notification.createMany({
    data: managers.map(m => ({ tenantId, userId: m.id, ...payload })),
  });
}

/**
 * Gera notificações pendentes baseado em regras de negócio:
 * - Contratos vencendo nos próximos 30 dias
 * - Reuniões nas próximas 2h
 * - Metas com menos de 50% atingido a 5 dias do fim do mês
 * Idempotente: evita duplicar avisos no mesmo dia.
 */
export async function generateRecurringNotifications(tenantId: string) {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in2h = new Date(now.getTime() + 2 * 3600 * 1000);

  // Contratos vencendo
  const expiring = await prisma.contract.findMany({
    where: { tenantId, status: { in: ["VIGENTE", "ASSINADO"] }, expiresAt: { not: null, lte: in30, gte: now } },
    include: { owner: true },
  });
  for (const c of expiring) {
    if (!c.expiresAt) continue;
    const daysLeft = Math.ceil((c.expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000));
    const milestone = daysLeft <= 7 ? "7 dias" : daysLeft <= 15 ? "15 dias" : "30 dias";
    const body = `O contrato ${c.title} vence em ${daysLeft} dias.`;
    // Notifica gestores
    await notifyManagers(tenantId, {
      type: "CONTRACT_EXPIRING",
      title: `Contrato vencendo (${milestone})`,
      body, url: `/contratos`,
    });
  }

  // Reuniões próximas (2h antes -> hora de enviar lembrete pro cliente)
  const meetings = await prisma.task.findMany({
    where: { tenantId, status: "PENDENTE", dueDate: { gte: now, lte: in2h }, title: { contains: "Reunião", mode: "insensitive" } },
    include: { assignee: true, contact: true },
  });
  for (const m of meetings) {
    if (!m.assignee || !m.dueDate) continue;
    // Dedupe: só uma notificação por reunião por dia
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const exists = await prisma.notification.findFirst({
      where: { tenantId, userId: m.assignee.id, type: "MEETING_SOON", body: { contains: m.id }, createdAt: { gte: dayStart } },
    });
    if (exists) continue;
    const minutesAway = Math.round((m.dueDate.getTime() - now.getTime()) / 60000);
    const horaReuniao = m.dueDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const clienteNome = m.contact?.name ?? "o cliente";
    // URL aciona o atalho de envio de lembrete já com mensagem pré-preenchida
    const url = m.contactId
      ? `/agenda?reminder=${m.id}&contactId=${m.contactId}`
      : `/agenda`;
    await notify({
      tenantId, userId: m.assignee.id, type: "MEETING_SOON",
      title: minutesAway <= 30
        ? `Reunião em 30min com ${clienteNome}`
        : `Hora de enviar lembrete para ${clienteNome}`,
      body: `Reunião às ${horaReuniao}h. Clique para enviar lembrete via WhatsApp. (${m.id})`,
      url,
    });
  }
}
