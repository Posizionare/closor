"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import type { ConversationStatus } from "@prisma/client";
import { assignContactTo, setAssignmentOutcome } from "@/lib/assignments";
import { moveContactDealToStage } from "@/lib/funil";
import { notify } from "@/lib/notifications";

export async function sendMessage(conversationId: string, body: string, mediaUrl?: string, mediaType?: string, fileName?: string) {
  const { tenantId, userId } = await getTenant();
  if (!body.trim() && !mediaUrl) return { error: "vazio" };
  const c = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId } });
  if (!c) return { error: "not found" };
  // Snapshot do nome do atendente (caso múltiplos usuários compartilhem o mesmo número)
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  await prisma.message.create({
    data: {
      conversationId, direction: "outbound",
      body: body || (mediaType ? `[${mediaType}]` : ""),
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      fileName: fileName ?? null,
      authorUserId: userId,
      authorName: me?.name ?? null,
    },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), status: c.status === "NOVO" ? "EM_ATENDIMENTO" : c.status, ownerId: c.ownerId ?? userId },
  });
  // Quando o vendedor responde, ele se torna o atendente do contato + deal vai para "Em atendimento"
  if (c.contactId) {
    await assignContactTo({
      tenantId, contactId: c.contactId, userId,
      reason: "ATENDIMENTO_WHATSAPP", note: "Respondeu no WhatsApp",
    });
    await moveContactDealToStage(tenantId, c.contactId, /em\s*atendimento/i);
  }
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
  return { ok: true };
}

export async function setConversationStatus(id: string, status: ConversationStatus) {
  const { tenantId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId }, include: { contact: true } });
  await prisma.conversation.update({ where: { id, tenantId }, data: { status } });

  // Se ganhou ou perdeu, sincroniza o deal aberto associado
  if (conv?.contactId && (status === "GANHO" || status === "PERDIDO")) {
    const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: true } });
    const winStage = pipeline?.stages.find(s => s.type === "won");
    const lossStage = pipeline?.stages.find(s => s.type === "lost");
    const targetStage = status === "GANHO" ? winStage : lossStage;
    if (targetStage) {
      await prisma.deal.updateMany({
        where: { tenantId, contactId: conv.contactId, status: "ABERTO" },
        data: { stageId: targetStage.id, status: status === "GANHO" ? "GANHO" : "PERDIDO", wonAt: status === "GANHO" ? new Date() : null, lostAt: status === "PERDIDO" ? new Date() : null },
      });
    }
    // Marca outcome no histórico de atribuição do vendedor responsável
    if (conv.ownerId) {
      await setAssignmentOutcome(tenantId, conv.contactId, conv.ownerId, status === "GANHO" ? "ganho" : "perdido");
    }
  }
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
}

export async function scheduleMeetingFromConversation(id: string, formData: FormData) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId }, include: { contact: true } });
  if (!conv) return { error: "not found" };

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "10:00");
  const title = String(formData.get("title") ?? "Reunião comercial");
  const location = String(formData.get("location") ?? "");
  const when = new Date(`${date}T${time}:00`);
  // Espelho do link Meet (placeholder — a integração real cria via Google API)
  const meetLink = location || `https://meet.google.com/closor-${conv.id.slice(-3)}-${Date.now().toString(36).slice(-4)}`;

  await prisma.conversation.update({
    where: { id }, data: { scheduledMeetingAt: when, scheduledMeetingTitle: title, scheduledMeetingLink: meetLink, status: "NEGOCIACAO" },
  });

  // Cria tarefa "Reunião"
  await prisma.task.create({
    data: { tenantId, title: `Reunião com ${conv.contact?.name ?? "lead"}: ${title}`, dueDate: when, assigneeId: userId, contactId: conv.contactId ?? undefined, priority: "alta" },
  });

  // Move deal para etapa "Reunião agendada" se existir
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: true } });
  const meetingStage = pipeline?.stages.find(s => s.name.toLowerCase().includes("reuni"));
  if (meetingStage && conv.contactId) {
    await prisma.deal.updateMany({
      where: { tenantId, contactId: conv.contactId, status: "ABERTO" },
      data: { stageId: meetingStage.id },
    });
  }

  // Mensagem automática informando o agendamento
  await prisma.message.create({
    data: {
      conversationId: id, direction: "outbound", authorUserId: userId,
      body: `Reunião agendada para ${when.toLocaleString("pt-BR")}.\nLink: ${meetLink}`,
    },
  });

  revalidatePath("/whatsapp");
  revalidatePath("/agenda");
  revalidatePath("/funil");
  return { ok: true };
}

export async function sendMeetingReminder(id: string, body: string) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conv) return { error: "not found" };
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.message.create({ data: { conversationId: id, direction: "outbound", authorUserId: userId, authorName: me?.name ?? null, body } });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
  revalidatePath("/whatsapp");
  return { ok: true };
}

export async function transferConversation(id: string, opts: { toUserId?: string; toDepartment?: string }) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conv) return { error: "not found" };

  const data: any = {};
  let targetLabel = "";
  if (opts.toUserId) {
    const target = await prisma.user.findFirst({ where: { id: opts.toUserId, tenantId } });
    if (!target) return { error: "user not found" };
    data.ownerId = target.id;
    targetLabel = target.name;
  } else if (opts.toDepartment) {
    data.department = opts.toDepartment;
    data.ownerId = null;
    data.status = "NOVO";
    targetLabel = `setor ${opts.toDepartment}`;
  }
  await prisma.conversation.update({ where: { id, tenantId }, data });

  // Mensagem automática para o cliente (sistema)
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.message.create({
    data: {
      conversationId: id, direction: "outbound",
      isSystem: true, authorUserId: userId, authorName: me?.name ?? null,
      body: `Seu atendimento foi transferido para ${targetLabel}. Em breve entraremos em contato.`,
    },
  });
  revalidatePath("/whatsapp");
  return { ok: true };
}

// Encerra conversa (atendente) e gera protocolo de atendimento imediatamente.
export async function closeConversation(id: string) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conv) return { error: "not found" };
  if (conv.protocol) return { ok: true, protocol: conv.protocol };

  const now = new Date();
  const protocol = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  await prisma.conversation.update({
    where: { id, tenantId },
    data: {
      closedByOwner: true,
      closedByClient: true,
      closedAt: now,
      protocol,
      status: "ENCERRADA",
    },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.message.create({
    data: {
      conversationId: id, direction: "outbound", isSystem: true,
      authorUserId: userId, authorName: me?.name ?? null,
      body: `Atendimento encerrado. Protocolo: ${protocol}. Obrigado pelo contato!`,
    },
  });
  revalidatePath("/whatsapp");
  return { ok: true, protocol };
}

// Marca a conversa como encerrada do lado do cliente (botão de teste / webhook)
export async function clientCloseConversation(id: string) {
  const { tenantId } = await getTenant();
  await prisma.conversation.update({ where: { id, tenantId }, data: { closedByClient: true } });
  // Se atendente já tinha encerrado, gera protocolo
  return closeConversation(id);
}

// Reabre uma conversa encerrada — mantém o protocolo no histórico e informa que foi reaberta a partir dele
export async function reopenConversation(id: string) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conv) return { error: "not found" };
  const oldProtocol = conv.protocol;

  await prisma.conversation.update({
    where: { id, tenantId },
    data: {
      status: "EM_ATENDIMENTO",
      closedByOwner: false,
      closedByClient: false,
      closedAt: null,
      ownerId: conv.ownerId ?? userId,
      lastMessageAt: new Date(),
    },
  });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.message.create({
    data: {
      conversationId: id, direction: "outbound", isSystem: true,
      authorUserId: userId, authorName: me?.name ?? null,
      body: oldProtocol
        ? `Chamado reaberto a partir do protocolo ${oldProtocol}.`
        : "Chamado reaberto.",
    },
  });
  revalidatePath("/whatsapp");
  return { ok: true, oldProtocol };
}

// Atualiza departamento da conversa
export async function setConversationDepartment(id: string, department: "comercial" | "suporte" | "financeiro") {
  const { tenantId } = await getTenant();
  await prisma.conversation.update({ where: { id, tenantId }, data: { department } });
  revalidatePath("/whatsapp");
  return { ok: true };
}

// Marca follow up de prospecção + cria tarefa na data escolhida pelo atendente
export async function markFollowUpProspeccao(id: string, followDate?: string) {
  const { tenantId, userId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId }, include: { contact: true } });
  if (!conv?.contactId) return { error: "sem contato" };
  await moveContactDealToStage(tenantId, conv.contactId, /follow\s*up\s*prospec/i);

  // Cria tarefa de follow up na data escolhida
  if (followDate) {
    const when = new Date(`${followDate}T09:00:00`);
    await prisma.task.create({
      data: {
        tenantId,
        title: `Follow up prospecção — ${conv.contact?.name ?? "lead"}`,
        description: "Retomar contato para tentar avançar a negociação.",
        dueDate: when,
        assigneeId: conv.ownerId ?? userId,
        contactId: conv.contactId,
        priority: "media",
      },
    });
    // Notifica o atendente
    await notify({
      tenantId, userId: conv.ownerId ?? userId, type: "TASK_DUE",
      title: "Follow up agendado", body: `Follow up de ${conv.contact?.name ?? "lead"} em ${when.toLocaleDateString("pt-BR")}.`,
      url: "/agenda",
    });
  }
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
  revalidatePath("/agenda");
  return { ok: true };
}

// Marca como follow up de proposta (move deal)
export async function markFollowUpProposta(id: string) {
  const { tenantId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conv?.contactId) return { error: "sem contato" };
  await moveContactDealToStage(tenantId, conv.contactId, /follow\s*up\s*proposta/i);
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
  return { ok: true };
}

// Pedido de exclusão de contrato (não-admin)
export async function requestContractDeletion(contractId: string, reason: string) {
  const { tenantId, userId, isAdmin } = await getTenant();
  if (isAdmin) return { error: "admin pode excluir direto" };
  if (!reason.trim()) return { error: "Motivo obrigatório" };
  await prisma.contractDeletionRequest.create({
    data: { tenantId, contractId, requestedBy: userId, reason: reason.trim() },
  });
  return { ok: true };
}

export async function takeConversation(id: string) {
  const { tenantId, userId } = await getTenant();
  const c = await prisma.conversation.update({ where: { id, tenantId }, data: { ownerId: userId, status: "EM_ATENDIMENTO" } });
  if (c.contactId) {
    await assignContactTo({
      tenantId, contactId: c.contactId, userId,
      reason: "ATENDIMENTO_WHATSAPP", note: "Pegou o atendimento",
    });
    await moveContactDealToStage(tenantId, c.contactId, /em\s*atendimento/i);
  }
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
}

export async function simulateInbound(formData: FormData) {
  // Simula um lead chegando pelo WhatsApp - cria contato + conversa + mensagem + tarefa
  const { tenantId, userId } = await getTenant();
  const name = String(formData.get("name") ?? "").trim() || "Lead WhatsApp";
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim() || "Olá, gostaria de saber mais.";
  const origin = String(formData.get("origin") ?? "Manual");

  // 1. Cria/atualiza contato
  let contact = whatsapp ? await prisma.contact.findFirst({ where: { tenantId, whatsapp } }) : null;
  if (!contact) {
    contact = await prisma.contact.create({
      data: { tenantId, name, whatsapp: whatsapp || null, origin },
    });
  }

  // 2. Cria conversa (ou pega ativa)
  let conv = await prisma.conversation.findFirst({
    where: { tenantId, contactId: contact.id, status: { not: "ENCERRADA" } },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { tenantId, contactId: contact.id, channel: "whatsapp", status: "NOVO", origin, lastMessageAt: new Date() },
    });
  }

  // 3. Cria mensagem
  await prisma.message.create({
    data: { conversationId: conv.id, direction: "inbound", body: message },
  });

  // 4. Cria tarefa de atendimento se ninguém pegou ainda
  if (!conv.ownerId) {
    await prisma.task.create({
      data: {
        tenantId, title: `Atender ${name}`, contactId: contact.id,
        assigneeId: userId, priority: "alta",
        dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
  }

  // 5. Cria deal no funil de entrada
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: { orderBy: { order: "asc" }, take: 1 } } });
  if (pipeline?.stages[0]) {
    const exists = await prisma.deal.findFirst({ where: { tenantId, contactId: contact.id, status: "ABERTO" } });
    if (!exists) {
      await prisma.deal.create({
        data: {
          tenantId, title: `Lead WhatsApp - ${name}`,
          pipelineId: pipeline.id, stageId: pipeline.stages[0].id,
          contactId: contact.id, ownerId: userId, origin, value: 0,
        },
      });
    }
  }

  revalidatePath("/whatsapp");
  return { ok: true };
}
