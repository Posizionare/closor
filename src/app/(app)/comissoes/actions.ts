"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function setCommissionRate(userId: string, rate: number) {
  const { tenantId, isAdmin } = await getTenant();
  if (!isAdmin) return { error: "Apenas administradores podem alterar comissões." };
  await prisma.user.update({ where: { id: userId, tenantId }, data: { commissionRate: rate } });
  revalidatePath("/comissoes");
  return { ok: true };
}

export async function setMonthlyGoal(userId: string, goal: number) {
  const { tenantId, isAdmin } = await getTenant();
  if (!isAdmin) return { error: "Apenas administradores podem alterar metas." };
  await prisma.user.update({ where: { id: userId, tenantId }, data: { monthlyGoal: goal } });
  revalidatePath("/comissoes");
  revalidatePath("/metas");
  return { ok: true };
}
