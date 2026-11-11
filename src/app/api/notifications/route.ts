import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRecurringNotifications } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const u = session.user as any;

  // Gera as recorrentes (idempotente em prática pois usa janelas de tempo)
  await generateRecurringNotifications(u.tenantId).catch(() => {});

  const items = await prisma.notification.findMany({
    where: { tenantId: u.tenantId, userId: u.id },
    orderBy: { createdAt: "desc" }, take: 30,
  });
  return NextResponse.json(items);
}
