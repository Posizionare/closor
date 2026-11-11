"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assignContactTo } from "@/lib/assignments";

async function ctx() {
  const s = await auth();
  if (!s?.user) throw new Error("unauthorized");
  return { tenantId: (s.user as any).tenantId as string, userId: (s.user as any).id as string };
}

export async function createContact(formData: FormData) {
  const { tenantId, userId } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome obrigatório." };
  const ownerId = String(formData.get("ownerId") ?? userId) || userId;
  const created = await prisma.contact.create({
    data: {
      tenantId,
      name,
      company: String(formData.get("company") ?? "") || null,
      cpfCnpj: String(formData.get("cpfCnpj") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      whatsapp: String(formData.get("whatsapp") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      origin: String(formData.get("origin") ?? "Manual") || "Manual",
      notes: String(formData.get("notes") ?? "") || null,
      ownerId,
    },
  });
  await prisma.contactAssignment.create({
    data: { tenantId, contactId: created.id, userId: ownerId, reason: "CRIACAO", note: "Criado manualmente" },
  });
  revalidatePath("/contatos");
  return { ok: true };
}

export async function updateContact(id: string, formData: FormData) {
  const { tenantId } = await ctx();
  const ownerId = String(formData.get("ownerId") ?? "") || null;
  await prisma.contact.update({
    where: { id, tenantId },
    data: {
      name: String(formData.get("name") ?? ""),
      company: String(formData.get("company") ?? "") || null,
      cpfCnpj: String(formData.get("cpfCnpj") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      whatsapp: String(formData.get("whatsapp") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      origin: String(formData.get("origin") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  if (ownerId) {
    await assignContactTo({ tenantId, contactId: id, userId: ownerId, reason: "TROCA_MANUAL", note: "Atualização manual" });
  }
  revalidatePath("/contatos");
  revalidatePath(`/contatos/${id}`);
  return { ok: true };
}

export async function setContactOwner(contactId: string, userId: string) {
  const { tenantId } = await ctx();
  if (!userId) {
    await prisma.contact.update({ where: { id: contactId, tenantId }, data: { ownerId: null } });
  } else {
    await assignContactTo({ tenantId, contactId, userId, reason: "TROCA_MANUAL", note: "Troca de responsável" });
  }
  revalidatePath(`/contatos/${contactId}`);
  return { ok: true };
}

export async function deleteContact(id: string) {
  const { tenantId } = await ctx();
  await prisma.contact.delete({ where: { id, tenantId } });
  revalidatePath("/contatos");
  return { ok: true };
}
