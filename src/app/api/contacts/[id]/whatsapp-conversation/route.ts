import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Encontra ou cria uma conversa WhatsApp para o contato e devolve o id.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const u = session.user as any;

  const contact = await prisma.contact.findFirst({ where: { id: params.id, tenantId: u.tenantId } });
  if (!contact) return NextResponse.json({ error: "contact not found" }, { status: 404 });

  let conv = await prisma.conversation.findFirst({
    where: { tenantId: u.tenantId, contactId: contact.id, channel: "whatsapp" },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        tenantId: u.tenantId, contactId: contact.id, channel: "whatsapp",
        status: "NOVO", origin: contact.origin ?? "Manual",
        ownerId: u.id, lastMessageAt: new Date(),
      },
    });
  }
  return NextResponse.json({ id: conv.id });
}
