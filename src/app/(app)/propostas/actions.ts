"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

function s(v: FormDataEntryValue | null) { return v == null ? null : String(v).trim() || null; }

function buildData(fd: FormData) {
  return {
    name: String(fd.get("name") ?? "Modelo de proposta"),
    coverUrl: s(fd.get("coverUrl")),
    closingUrl: s(fd.get("closingUrl")),
    closingImages: s(fd.get("closingImages")),
    primaryColor: s(fd.get("primaryColor")) ?? "#F97316",
    institutionalText: s(fd.get("institutionalText")),
    commercialTerms: s(fd.get("commercialTerms")),
    validityDays: Number(fd.get("validityDays") ?? 15),
    footer: s(fd.get("footer")),
    active: fd.get("active") !== "off",
  };
}

export async function createProposalTemplate(formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.proposalTemplate.create({ data: { tenantId, ...buildData(formData) } });
  revalidatePath("/propostas");
  return { ok: true };
}

export async function updateProposalTemplate(id: string, formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.proposalTemplate.update({ where: { id, tenantId }, data: buildData(formData) });
  revalidatePath("/propostas");
  return { ok: true };
}

export async function deleteProposalTemplate(id: string) {
  const { tenantId } = await getTenant();
  await prisma.proposalTemplate.delete({ where: { id, tenantId } });
  revalidatePath("/propostas");
}

type ItemInput = { productId?: string; quantity: number; unitPrice: number; discount: number; customName?: string; customDescription?: string };

export async function saveDealItems(dealId: string, payload: { items: ItemInput[]; notes?: string }) {
  const { tenantId } = await getTenant();
  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });
  if (!deal) return { error: "deal not found" };

  // Limpa itens existentes
  await prisma.dealItem.deleteMany({ where: { dealId } });

  // Garante produto custom para itens sem productId
  for (const it of payload.items) {
    let productId = it.productId;
    if (!productId && it.customName) {
      // procura ou cria um produto avulso (rotulado como custom)
      const existing = await prisma.product.findFirst({ where: { tenantId, name: it.customName, sku: "CUSTOM" } });
      if (existing) productId = existing.id;
      else {
        const created = await prisma.product.create({
          data: { tenantId, name: it.customName, description: it.customDescription ?? null, price: it.unitPrice, sku: "CUSTOM", active: false },
        });
        productId = created.id;
      }
    }
    if (!productId) continue;
    await prisma.dealItem.create({
      data: { dealId, productId, quantity: it.quantity, unitPrice: it.unitPrice, discount: it.discount },
    });
  }

  // Atualiza valor estimado e notas
  const total = payload.items.reduce((a, it) => a + (it.quantity * it.unitPrice - it.discount), 0);
  await prisma.deal.update({ where: { id: dealId }, data: { value: total, notes: payload.notes ?? null } });

  revalidatePath(`/propostas/montar/${dealId}`);
  revalidatePath("/propostas");
  revalidatePath("/funil");
  return { ok: true };
}

// Gera Proposta com link público de aceite. Aceita dealId OU contactId.
export async function sendProposalForAccept(payload: {
  dealId?: string; contactId?: string; templateId?: string;
  title: string; totalValue: number; validUntil: string | null; itemsSnapshot: any[];
}) {
  const { tenantId, userId } = await getTenant();

  // Resolve o deal: por dealId direto, ou pelo contactId achando deal aberto, ou criando um.
  let deal = payload.dealId
    ? await prisma.deal.findFirst({ where: { id: payload.dealId, tenantId } })
    : null;

  if (!deal && payload.contactId) {
    deal = await prisma.deal.findFirst({
      where: { tenantId, contactId: payload.contactId, status: { in: ["ABERTO", "GANHO"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!deal) {
      // Cria deal automático no funil de entrada
      const pipe = await prisma.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        include: { stages: { orderBy: { order: "asc" }, take: 1 } },
      });
      if (pipe?.stages[0]) {
        const ct = await prisma.contact.findFirst({ where: { id: payload.contactId, tenantId } });
        deal = await prisma.deal.create({
          data: {
            tenantId,
            contactId: payload.contactId,
            ownerId: userId,
            pipelineId: pipe.id,
            stageId: pipe.stages[0].id,
            title: payload.title || `Proposta - ${ct?.name ?? "Cliente"}`,
            origin: "WhatsApp",
            value: payload.totalValue,
          },
        });
      }
    }
  }

  if (!deal) return { error: "Não foi possível identificar o cliente. Salve o contato primeiro." };

  const token = randomBytes(18).toString("hex");
  const p = await prisma.proposal.create({
    data: {
      tenantId,
      title: payload.title || "Proposta",
      status: "ENVIADA",
      contactId: deal.contactId,
      dealId: deal.id,
      ownerId: deal.ownerId ?? userId,
      templateId: payload.templateId ?? null,
      totalValue: payload.totalValue,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
      itemsSnapshot: payload.itemsSnapshot as any,
      acceptToken: token,
      number: `ORC-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`,
    },
  });

  // Move o deal para "Proposta enviada"
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: true } });
  const proposalStage = pipeline?.stages.find(s => /proposta\s*enviada/i.test(s.name));
  if (proposalStage && deal.stageId !== proposalStage.id) {
    await prisma.deal.update({ where: { id: deal.id }, data: { stageId: proposalStage.id } });
  }

  // Cria task de follow up 2 dias antes da validade da proposta
  if (payload.validUntil) {
    const validUntilDate = new Date(payload.validUntil);
    const followDate = new Date(validUntilDate.getTime() - 2 * 24 * 3600 * 1000);
    if (followDate > new Date()) {
      await prisma.task.create({
        data: {
          tenantId,
          title: `Follow up proposta — ${payload.title}`,
          description: `Faltam 2 dias para a proposta vencer (${validUntilDate.toLocaleDateString("pt-BR")}).`,
          dueDate: followDate,
          assigneeId: deal.ownerId ?? userId,
          contactId: deal.contactId ?? undefined,
          priority: "alta",
        },
      });
    }
  }

  revalidatePath("/propostas");
  revalidatePath("/funil");
  return { ok: true, id: p.id, token, url: `/aceitar/${token}` };
}
