import { prisma } from "./prisma";
import type { ContactAssignmentReason } from "@prisma/client";

/**
 * Atribui um contato a um vendedor e registra no histórico.
 * Se já houver uma atribuição "ativa" (endedAt nulo), encerra antes.
 */
export async function assignContactTo(opts: {
  tenantId: string;
  contactId: string;
  userId: string;
  reason: ContactAssignmentReason;
  note?: string;
}) {
  const contact = await prisma.contact.findFirst({
    where: { id: opts.contactId, tenantId: opts.tenantId },
  });
  if (!contact) return;
  if (contact.ownerId === opts.userId) return; // já é responsável

  // Encerra atribuição ativa anterior
  await prisma.contactAssignment.updateMany({
    where: { tenantId: opts.tenantId, contactId: opts.contactId, endedAt: null },
    data: { endedAt: new Date() },
  });
  // Atualiza ownerId atual
  await prisma.contact.update({ where: { id: opts.contactId }, data: { ownerId: opts.userId } });
  // Registra novo
  await prisma.contactAssignment.create({
    data: {
      tenantId: opts.tenantId, contactId: opts.contactId, userId: opts.userId,
      reason: opts.reason, note: opts.note,
    },
  });
}

/**
 * Marca uma atribuição com outcome (ganho/perdido) — usado quando o deal é fechado.
 */
export async function setAssignmentOutcome(tenantId: string, contactId: string, userId: string, outcome: "ganho" | "perdido") {
  await prisma.contactAssignment.updateMany({
    where: { tenantId, contactId, userId, endedAt: null },
    data: { outcome, endedAt: new Date() },
  });
}
