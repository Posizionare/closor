"use server";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createConversionStatus(formData: FormData) {
  const { tenantId } = await getTenant();
  await prisma.conversionStatus.create({
    data: {
      tenantId,
      name: String(formData.get("name") ?? ""),
      origin: String(formData.get("origin") ?? "Manual"),
      component: String(formData.get("component") ?? "") || null,
      triggerMessage: String(formData.get("triggerMessage") ?? "") || null,
      active: formData.get("active") !== "off",
    },
  });
  revalidatePath("/conversoes");
  return { ok: true };
}

export async function deleteConversionStatus(id: string) {
  const { tenantId } = await getTenant();
  await prisma.conversionStatus.delete({ where: { id, tenantId } });
  revalidatePath("/conversoes");
}

export async function saveIntegration(provider: string, formData: FormData) {
  const { tenantId } = await getTenant();
  const config: any = {};
  formData.forEach((v, k) => { if (k !== "_provider") config[k] = String(v); });
  await prisma.integration.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    update: { config, connected: true, lastSyncAt: new Date() },
    create: { tenantId, provider, config, connected: true, lastSyncAt: new Date() },
  });
  revalidatePath("/conversoes");
  revalidatePath("/integracoes");
  return { ok: true };
}

export async function disconnectIntegration(provider: string) {
  const { tenantId } = await getTenant();
  await prisma.integration.updateMany({ where: { tenantId, provider }, data: { connected: false } });
  revalidatePath("/integracoes");
  revalidatePath("/conversoes");
}
