"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function startQrConnection() {
  const { tenantId } = await getTenant();
  // Mock: gera um QR fake e fica em estado AGUARDANDO_QR
  const fakeQr = `closor-whatsapp-${tenantId}-${Date.now()}`;
  await prisma.whatsappConnection.upsert({
    where: { tenantId },
    update: { mode: "QR_CODE", status: "AGUARDANDO_QR", qrCodeData: fakeQr },
    create: { tenantId, mode: "QR_CODE", status: "AGUARDANDO_QR", qrCodeData: fakeQr },
  });
  revalidatePath("/whatsapp");
}

export async function confirmConnection(formData: FormData) {
  // Em produção seria callback do webhook QR, aqui simulamos clique do usuário
  const { tenantId } = await getTenant();
  const phone = String(formData.get("phoneNumber") ?? "").trim();
  const name = String(formData.get("displayName") ?? "").trim();
  await prisma.whatsappConnection.upsert({
    where: { tenantId },
    update: { status: "CONECTADO", phoneNumber: phone || null, displayName: name || null, lastConnectedAt: new Date() },
    create: { tenantId, mode: "QR_CODE", status: "CONECTADO", phoneNumber: phone || null, displayName: name || null, lastConnectedAt: new Date() },
  });
  revalidatePath("/whatsapp");
  return { ok: true };
}

export async function saveCloudApi(formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.whatsappConnection.upsert({
    where: { tenantId },
    update: {
      mode: "CLOUD_API", status: "CONECTADO",
      apiUrl: String(formData.get("apiUrl") ?? "") || null,
      apiToken: String(formData.get("apiToken") ?? "") || null,
      phoneId: String(formData.get("phoneId") ?? "") || null,
      businessId: String(formData.get("businessId") ?? "") || null,
      phoneNumber: String(formData.get("phoneNumber") ?? "") || null,
      displayName: String(formData.get("displayName") ?? "") || null,
      lastConnectedAt: new Date(),
    },
    create: {
      tenantId, mode: "CLOUD_API", status: "CONECTADO",
      apiUrl: String(formData.get("apiUrl") ?? "") || null,
      apiToken: String(formData.get("apiToken") ?? "") || null,
      phoneId: String(formData.get("phoneId") ?? "") || null,
      businessId: String(formData.get("businessId") ?? "") || null,
      phoneNumber: String(formData.get("phoneNumber") ?? "") || null,
      displayName: String(formData.get("displayName") ?? "") || null,
      lastConnectedAt: new Date(),
    },
  });
  revalidatePath("/whatsapp");
  return { ok: true };
}

export async function disconnectWhatsapp() {
  const { tenantId } = await getTenant();
  await prisma.whatsappConnection.updateMany({ where: { tenantId }, data: { status: "DESCONECTADO", qrCodeData: null } });
  revalidatePath("/whatsapp");
}

// Salva/atualiza contato a partir da conversa
export async function saveContactFromConversation(conversationId: string, formData: FormData) {
  const { tenantId } = await getTenant();
  const conv = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId }, include: { contact: true } });
  if (!conv) return { error: "not found" };
  const data = {
    name: String(formData.get("name") ?? "").trim() || conv.contact?.name || "Lead",
    company: String(formData.get("company") ?? "").trim() || null,
    cpfCnpj: String(formData.get("cpfCnpj") ?? "").replace(/\D/g, "") || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  };
  if (conv.contactId) {
    await prisma.contact.update({ where: { id: conv.contactId }, data });
  } else {
    const created = await prisma.contact.create({ data: { tenantId, ...data, origin: "WhatsApp" } });
    await prisma.conversation.update({ where: { id: conv.id }, data: { contactId: created.id } });
  }

  // Cria deal automático no funil de entrada se ainda não existir
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: { orderBy: { order: "asc" }, take: 1 } } });
  if (pipeline?.stages[0]) {
    const ctc = await prisma.conversation.findUnique({ where: { id: conv.id } });
    if (ctc?.contactId) {
      const exists = await prisma.deal.findFirst({ where: { tenantId, contactId: ctc.contactId, status: "ABERTO" } });
      if (!exists) {
        await prisma.deal.create({
          data: { tenantId, title: `Lead WhatsApp - ${data.name}`, pipelineId: pipeline.id, stageId: pipeline.stages[0].id, contactId: ctc.contactId, ownerId: conv.ownerId, origin: "WhatsApp", value: 0 },
        });
      }
    }
  }
  revalidatePath("/whatsapp");
  revalidatePath("/funil");
  revalidatePath("/contatos");
  return { ok: true };
}
