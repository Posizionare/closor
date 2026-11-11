import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });
  const u = session.user as any;
  await prisma.notification.updateMany({ where: { tenantId: u.tenantId, userId: u.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
