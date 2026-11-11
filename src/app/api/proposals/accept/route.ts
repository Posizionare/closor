import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notifyManagers } from "@/lib/notifications";
import { setAssignmentOutcome } from "@/lib/assignments";

export async function POST(req: Request) {
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  const action = String(fd.get("action") ?? "accept"); // accept | reject
  const acceptedBy = String(fd.get("acceptedBy") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();

  const p = await prisma.proposal.findUnique({ where: { acceptToken: token }, include: { contact: true } });
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (p.status === "ACEITA") return NextResponse.json({ ok: true, alreadyAccepted: true });

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0";

  if (action === "reject") {
    await prisma.proposal.update({
      where: { id: p.id },
      data: { status: "RECUSADA", rejectedAt: new Date(), rejectionNote: note || null },
    });
    // Move deal para "Follow up Proposta" (em vez de Perdido direto) — atendente decide depois
    if (p.dealId) {
      const deal = await prisma.deal.findUnique({ where: { id: p.dealId } });
      if (deal && deal.contactId) {
        const pipe = await prisma.pipeline.findFirst({ where: { tenantId: p.tenantId, isDefault: true }, include: { stages: true } });
        const fStage = pipe?.stages.find(s => /follow\s*up\s*proposta/i.test(s.name));
        if (fStage) await prisma.deal.update({ where: { id: deal.id }, data: { stageId: fStage.id } });
      }
    }
    await notifyManagers(p.tenantId, {
      type: "DEAL_LOST", title: "Proposta recusada — fazer follow up",
      body: `${p.contact?.name ?? "Cliente"} recusou ${p.title}.${note ? ` Motivo: ${note}` : ""}`,
      url: "/propostas?tab=enviadas",
    });
    return NextResponse.json({ ok: true, status: "RECUSADA" });
  }

  // ACEITAR — move deal para Ganho automaticamente
  await prisma.proposal.update({
    where: { id: p.id },
    data: { status: "ACEITA", acceptedAt: new Date(), acceptedBy: acceptedBy || p.contact?.name || null, acceptedIp: ip },
  });

  if (p.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: p.dealId } });
    if (deal && deal.status !== "GANHO") {
      const pipeline = await prisma.pipeline.findFirst({ where: { tenantId: p.tenantId, isDefault: true }, include: { stages: true } });
      const winStage = pipeline?.stages.find(s => s.type === "won");
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          status: "GANHO", wonAt: new Date(),
          ...(winStage ? { stageId: winStage.id } : {}),
        },
      });
      // Atualiza histórico de atribuição: outcome=ganho para o owner
      if (deal.contactId && deal.ownerId) {
        await setAssignmentOutcome(p.tenantId, deal.contactId, deal.ownerId, "ganho");
      }
      // Histórico do deal
      await prisma.dealHistory.create({
        data: { dealId: deal.id, fromStage: null, toStage: winStage?.name ?? "Ganho", message: "Proposta aceita pelo cliente", userId: deal.ownerId ?? "system" },
      }).catch(() => {});
    }
  }

  await notifyManagers(p.tenantId, {
    type: "DEAL_WON", title: "Proposta aceita",
    body: `${p.contact?.name ?? "Cliente"} aceitou ${p.title}. Deal foi para Ganho.`,
    url: "/propostas?tab=enviadas",
  });

  // Mensagem automática de agradecimento na conversa do cliente
  if (p.contactId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: p.tenantId }, select: { name: true } });
    let conv = await prisma.conversation.findFirst({
      where: { tenantId: p.tenantId, contactId: p.contactId, channel: "whatsapp" },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { tenantId: p.tenantId, contactId: p.contactId, channel: "whatsapp", status: "GANHO", origin: "Manual", lastMessageAt: new Date() },
      });
    }
    const firstName = (p.contact?.name ?? "").split(" ")[0] || "";
    await prisma.message.create({
      data: {
        conversationId: conv.id, direction: "outbound", isSystem: true,
        body: `Olá ${firstName}! Que alegria ter você como parceiro(a). Agradecemos a confiança e em breve daremos os próximos passos. Conte com a gente! — Equipe ${tenant?.name ?? ""}`.trim(),
      },
    });
    await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } });
  }

  return NextResponse.json({ ok: true, status: "ACEITA" });
}
