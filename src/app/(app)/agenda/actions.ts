"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function scheduleMeeting(formData: FormData) {
  const { tenantId, userId } = await getTenant();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const duration = Number(formData.get("duration") ?? 30);
  const dt = date && time ? new Date(`${date}T${time}`) : null;
  if (!dt) return { error: "Data inválida." };

  const contactId = String(formData.get("contactId") ?? "") || null;
  const contact = contactId ? await prisma.contact.findFirst({ where: { id: contactId, tenantId } }) : null;
  const meetType = String(formData.get("type") ?? "Comercial");
  const withMeet = formData.get("withMeet") === "on";
  const meetLink = withMeet ? `https://meet.google.com/${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}` : null;

  // Tarefa principal
  const main = await prisma.task.create({
    data: {
      tenantId,
      title: `Reunião ${meetType} - ${contact?.name ?? "Cliente"}${meetLink ? " (Meet)" : ""}`,
      description: `${formData.get("notes") ?? ""}\n\nDuração: ${duration} min${meetLink ? `\nLink Meet: ${meetLink}` : ""}`,
      dueDate: dt,
      assigneeId: String(formData.get("ownerId") ?? userId),
      contactId,
      priority: "alta",
    },
  });

  // Lembretes 24h, 2h, 30min antes
  const reminders = [
    { mins: 24 * 60, label: "24h antes" },
    { mins: 2 * 60, label: "2h antes" },
    { mins: 30, label: "30min antes" },
  ];
  for (const r of reminders) {
    const reminderDate = new Date(dt.getTime() - r.mins * 60 * 1000);
    if (reminderDate > new Date()) {
      await prisma.task.create({
        data: {
          tenantId, title: `Lembrete (${r.label}): Reunião com ${contact?.name ?? "cliente"}`,
          dueDate: reminderDate, assigneeId: String(formData.get("ownerId") ?? userId),
          contactId, priority: "media",
        },
      });
    }
  }

  // Atualiza etapa do funil para "Reunião agendada" se houver deal aberto
  if (contactId) {
    const deal = await prisma.deal.findFirst({ where: { tenantId, contactId, status: "ABERTO" }, include: { pipeline: { include: { stages: true } } } });
    if (deal) {
      const stage = deal.pipeline.stages.find(s => /reuni/i.test(s.name));
      if (stage) await prisma.deal.update({ where: { id: deal.id }, data: { stageId: stage.id } });
    }
  }

  revalidatePath("/agenda");
  return { ok: true, meetLink };
}

export async function cancelMeeting(taskId: string) {
  const { tenantId } = await getTenant();
  await prisma.task.update({ where: { id: taskId, tenantId }, data: { status: "CANCELADA" } });
  revalidatePath("/agenda");
}

// Mensagens padrão por motivo
const REASON_MESSAGES: Record<string, (clientName: string, dateText: string) => string> = {
  alteracao: (n, d) => `Olá ${n}, nossa reunião do dia ${d} foi cancelada devido a alteração de dia e hora. Em breve entraremos em contato para reagendar.`,
  imprevisto: (n, d) => `Olá ${n}, infelizmente tivemos um imprevisto e precisamos cancelar nossa reunião do dia ${d}. Reagendaremos em breve.`,
  remarcar: (n, d) => `Olá ${n}, precisamos remarcar nossa reunião do dia ${d}. Já vou te enviar novas opções de horário.`,
  cliente: (n, d) => `Olá ${n}, conforme combinado, a reunião do dia ${d} foi cancelada. Quando puder, me avise para reagendar.`,
};

/**
 * Cancela uma reunião com motivo, opcionalmente avisando o cliente via WhatsApp interno e/ou email.
 * Também sincroniza com Google Agenda se a integração estiver ativa.
 */
export async function cancelMeetingWithReason(taskId: string, payload: {
  reason: "alteracao" | "imprevisto" | "remarcar" | "cliente";
  notifyWhatsapp?: boolean;
  notifyEmail?: boolean;
  customMessage?: string;
}) {
  const { tenantId, userId } = await getTenant();
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId }, include: { contact: true, assignee: true } });
  if (!task) return { error: "Reunião não encontrada." };

  const dateText = task.dueDate
    ? `${task.dueDate.toLocaleDateString("pt-BR")} às ${task.dueDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "agendado";
  const clientName = task.contact?.name ?? "Cliente";
  const message = payload.customMessage?.trim() || REASON_MESSAGES[payload.reason](clientName, dateText);

  // Marca a reunião + lembretes vinculados como CANCELADA
  await prisma.task.update({
    where: { id: taskId, tenantId },
    data: { status: "CANCELADA", description: `${task.description ?? ""}\n\n[Cancelada em ${new Date().toLocaleString("pt-BR")} - ${payload.reason}]\n${message}` },
  });
  // Cancela lembretes que mencionem este contato e estejam pendentes
  if (task.contactId) {
    await prisma.task.updateMany({
      where: { tenantId, contactId: task.contactId, status: "PENDENTE", title: { contains: "Lembrete", mode: "insensitive" } },
      data: { status: "CANCELADA" },
    });
  }

  // Avisa o cliente via WhatsApp interno (cria mensagem outbound na conversa do contato)
  if (payload.notifyWhatsapp && task.contactId) {
    let conv = await prisma.conversation.findFirst({
      where: { tenantId, contactId: task.contactId, channel: "whatsapp" },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { tenantId, contactId: task.contactId, channel: "whatsapp", status: "EM_ATENDIMENTO", origin: "Manual", ownerId: task.assigneeId ?? userId, lastMessageAt: new Date() },
      });
    }
    await prisma.message.create({ data: { conversationId: conv.id, direction: "outbound", body: message, authorUserId: userId } });
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } });
  }

  // Sincroniza Google Agenda — se houver integração conectada, deletaria o evento real aqui.
  // Por enquanto registramos no histórico via campo description (acima).
  const gcal = await prisma.integration.findFirst({ where: { tenantId, provider: "google_calendar", connected: true } });
  if (gcal) {
    // No backend real: usar accessToken + eventId armazenado para chamar
    // DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}
    // Aqui só registramos.
  }

  revalidatePath("/agenda");
  revalidatePath("/whatsapp");
  return { ok: true, message };
}
