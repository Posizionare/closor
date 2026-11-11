import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notifyManagers } from "@/lib/notifications";

export async function POST(req: Request) {
  const fd = await req.formData();
  const token = String(fd.get("token") ?? "");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const c = await prisma.contract.findUnique({ where: { signingToken: token }, include: { contact: true } });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (c.status === "ASSINADO") return NextResponse.json({ ok: true, alreadySigned: true });

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "0.0.0.0";
  await prisma.contract.update({
    where: { id: c.id },
    data: {
      status: "ASSINADO",
      signedAt: new Date(),
      signerName: String(fd.get("signerName") ?? ""),
      signerCpf: String(fd.get("signerCpf") ?? "").replace(/\D/g, "") || null,
      signerIp: ip,
      signatureBase64: String(fd.get("signatureBase64") ?? ""),
    },
  });

  await notifyManagers(c.tenantId, {
    type: "DEAL_WON",
    title: "Contrato assinado pelo cliente",
    body: `${c.contact?.name ?? "Cliente"} assinou ${c.title}.`,
    url: "/contratos",
  });

  // Move o deal para "Contrato assinado" (última etapa)
  if (c.dealId) {
    const pipe = await prisma.pipeline.findFirst({ where: { tenantId: c.tenantId, isDefault: true }, include: { stages: true } });
    const signedStage = pipe?.stages.find(s => /contrato\s*assinado/i.test(s.name));
    if (signedStage) await prisma.deal.update({ where: { id: c.dealId }, data: { stageId: signedStage.id } });
  }

  return NextResponse.json({ ok: true });
}
