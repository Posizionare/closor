"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import type { PaymentMethod, ProductBilling } from "@prisma/client";

function pms(formData: FormData): PaymentMethod[] {
  const all: PaymentMethod[] = ["PIX", "BOLETO", "CARTAO", "AVISTA"];
  return all.filter(p => formData.get(`pm_${p}`) === "on");
}

function billingData(formData: FormData) {
  const billing = (String(formData.get("billing") ?? "UNICO") as ProductBilling);
  const months = Number(formData.get("durationMonths") ?? 0);
  return {
    billing,
    durationMonths: billing === "MENSAL" && months > 0 ? months : null,
  };
}

export async function createProduct(formData: FormData) {
  const { tenantId } = await getTenant();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome obrigatório." };
  await prisma.product.create({
    data: {
      tenantId, name,
      description: String(formData.get("description") ?? "") || null,
      category: String(formData.get("category") ?? "") || null,
      imageUrl: String(formData.get("imageUrl") ?? "") || null,
      price: Number(formData.get("price") ?? 0),
      installments: formData.get("installments") === "on",
      maxInstallments: Number(formData.get("maxInstallments") ?? 1) || 1,
      paymentMethods: pms(formData),
      maxDiscount: Number(formData.get("maxDiscount") ?? 0) || null,
      commission: Number(formData.get("commission") ?? 0) || null,
      active: formData.get("active") !== "off",
      ...billingData(formData),
    },
  });
  revalidatePath("/produtos");
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.product.update({
    where: { id, tenantId },
    data: {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      category: String(formData.get("category") ?? "") || null,
      imageUrl: String(formData.get("imageUrl") ?? "") || null,
      price: Number(formData.get("price") ?? 0),
      installments: formData.get("installments") === "on",
      maxInstallments: Number(formData.get("maxInstallments") ?? 1) || 1,
      paymentMethods: pms(formData),
      maxDiscount: Number(formData.get("maxDiscount") ?? 0) || null,
      commission: Number(formData.get("commission") ?? 0) || null,
      active: formData.get("active") !== "off",
      ...billingData(formData),
    },
  });
  revalidatePath("/produtos");
  return { ok: true };
}

export async function deleteProduct(id: string) {
  const { tenantId } = await getTenant();
  await prisma.product.delete({ where: { id, tenantId } });
  revalidatePath("/produtos");
  return { ok: true };
}

export async function toggleProduct(id: string, active: boolean) {
  const { tenantId } = await getTenant();
  await prisma.product.update({ where: { id, tenantId }, data: { active } });
  revalidatePath("/produtos");
}
