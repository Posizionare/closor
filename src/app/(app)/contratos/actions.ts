"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { registerContractFinance } from "@/lib/finance";

// Cria registro de contrato (status RASCUNHO) com token único e devolve URL pública para o cliente assinar.
// Aceita dealId direto OU contactId (resolve/cria deal).
export async function prepareContractForSigning(payload: {
  dealId?: string; contactId?: string;
  title: string; body: string;
  expiresAt: string | null; totalValue: number;
}) {
  const { tenantId, userId } = await getTenant();

  let deal = payload.dealId
    ? await prisma.deal.findFirst({ where: { id: payload.dealId, tenantId } })
    : null;

  if (!deal && payload.contactId) {
    deal = await prisma.deal.findFirst({
      where: { tenantId, contactId: payload.contactId, status: { in: ["ABERTO", "GANHO"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!deal) {
      const pipe = await prisma.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        include: { stages: { orderBy: { order: "asc" }, take: 1 } },
      });
      if (pipe?.stages[0]) {
        const ct = await prisma.contact.findFirst({ where: { id: payload.contactId, tenantId } });
        deal = await prisma.deal.create({
          data: {
            tenantId, contactId: payload.contactId, ownerId: userId,
            pipelineId: pipe.id, stageId: pipe.stages[0].id,
            title: payload.title || `Contrato — ${ct?.name ?? "Cliente"}`,
            origin: "WhatsApp", value: payload.totalValue,
          },
        });
      }
    }
  }

  if (!deal) return { error: "Não foi possível identificar o cliente. Salve o contato primeiro." };

  const token = randomBytes(18).toString("hex");
  const c = await prisma.contract.create({
    data: {
      tenantId,
      title: payload.title || "Contrato",
      body: payload.body,
      status: "ENVIADO",
      contactId: deal.contactId,
      dealId: deal.id,
      ownerId: deal.ownerId ?? userId,
      startsAt: new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      totalValue: payload.totalValue,
      signingToken: token,
      number: `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    },
  });

  // Move o deal para "Contrato enviado" automaticamente
  const pipeline = await prisma.pipeline.findFirst({ where: { tenantId, isDefault: true }, include: { stages: true } });
  const ctrStage = pipeline?.stages.find(s => /contrato\s*enviado/i.test(s.name));
  if (ctrStage && deal.stageId !== ctrStage.id) {
    await prisma.deal.update({ where: { id: deal.id }, data: { stageId: ctrStage.id } });
  }

  // Lança no Financeiro no dia da criação do contrato
  await registerContractFinance({
    tenantId, contractId: c.id, contactId: deal.contactId, ownerId: deal.ownerId,
    title: payload.title || "Contrato", totalValue: payload.totalValue, dealId: deal.id,
  });

  revalidatePath("/funil");
  revalidatePath("/financeiro");

  return { ok: true, id: c.id, token, url: `/assinar/${token}` };
}

export async function createContractTemplate(formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.contractTemplate.create({
    data: {
      tenantId,
      name: String(formData.get("name") ?? ""),
      body: String(formData.get("body") ?? ""),
      active: formData.get("active") !== "off",
    },
  });
  revalidatePath("/contratos");
  return { ok: true };
}

export async function updateContractTemplate(id: string, formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.contractTemplate.update({
    where: { id, tenantId },
    data: {
      name: String(formData.get("name") ?? ""),
      body: String(formData.get("body") ?? ""),
      active: formData.get("active") !== "off",
    },
  });
  revalidatePath("/contratos");
  return { ok: true };
}

export async function deleteContractTemplate(id: string) {
  const { tenantId } = await getTenant();
  await prisma.contractTemplate.delete({ where: { id, tenantId } });
  revalidatePath("/contratos");
}

// Excluir contrato gerado
export async function deleteContract(id: string) {
  const { tenantId } = await getTenant();
  await prisma.contract.delete({ where: { id, tenantId } });
  revalidatePath("/contratos");
  return { ok: true };
}

// Editar contrato gerado
export async function updateContract(id: string, payload: {
  title?: string; body?: string; expiresAt?: string | null; totalValue?: number;
  startsAt?: string | null;
}) {
  const { tenantId } = await getTenant();
  const data: any = {};
  if (payload.title != null) data.title = payload.title;
  if (payload.body != null) data.body = payload.body;
  if (payload.expiresAt !== undefined) data.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (payload.startsAt !== undefined) data.startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
  if (payload.totalValue != null) data.totalValue = payload.totalValue;
  await prisma.contract.update({ where: { id, tenantId }, data });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  return { ok: true };
}
