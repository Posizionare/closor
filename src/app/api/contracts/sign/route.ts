import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyManagers } from "@/lib/notifications";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const u = session.user as any;
  const fd = await req.formData();

  const dealId = String(fd.get("dealId") ?? "");
  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId: u.tenantId }, include: { contact: true } });
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const expiresStr = String(fd.get("expiresAt") ?? "");
  const expiresAt = expiresStr ? new Date(expiresStr) : null;
  const totalValue = Number(fd.get("totalValue") ?? 0);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0";

  const contract = await prisma.contract.create({
    data: {
      tenantId: u.tenantId,
      title: String(fd.get("title") ?? "Contrato"),
      body: String(fd.get("body") ?? ""),
      status: "ASSINADO",
      contactId: deal.contactId,
      dealId: deal.id,
      ownerId: deal.ownerId ?? u.id,
      signedAt: new Date(),
      startsAt: new Date(),
      expiresAt,
      totalValue,
      signerName: String(fd.get("signerName") ?? ""),
      signerCpf: String(fd.get("signerCpf") ?? "").replace(/\D/g, "") || null,
      signerIp: ip,
      signatureBase64: String(fd.get("signatureBase64") ?? ""),
      number: `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    },
  });

  // Notifica gestores sobre fechamento de contrato
  await notifyManagers(u.tenantId, {
    type: "DEAL_WON",
    title: "Contrato assinado",
    body: `${deal.contact?.name ?? "Cliente"} assinou ${contract.title}.`,
    url: "/contratos",
  });

  // Move o deal para "Contrato assinado" (etapa final, após Ganho)
  const pipe = await prisma.pipeline.findFirst({ where: { tenantId: u.tenantId, isDefault: true }, include: { stages: true } });
  const signedStage = pipe?.stages.find(s => /contrato\s*assinado/i.test(s.name));
  if (signedStage && deal.stageId !== signedStage.id) {
    await prisma.deal.update({ where: { id: deal.id }, data: { stageId: signedStage.id } });
  }

  return NextResponse.json({ ok: true, id: contract.id });
}
