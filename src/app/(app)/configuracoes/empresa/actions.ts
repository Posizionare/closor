"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateTenant(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "unauthorized" };
  const tenantId = (session.user as any).tenantId as string;
  if (!(session.user as any).isAdmin) return { error: "forbidden" };

  const data = {
    name: String(formData.get("name") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    cnpj: String(formData.get("cnpj") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    systemName: String(formData.get("systemName") ?? "Closor"),
    primaryColor: String(formData.get("primaryColor") ?? "#0F172A"),
    secondaryColor: String(formData.get("secondaryColor") ?? "#F97316"),
    accentColor: String(formData.get("accentColor") ?? "#EF4444"),
    logoUrl: String(formData.get("logoUrl") ?? "") || null,
    faviconUrl: String(formData.get("faviconUrl") ?? "") || null,
    bankName: String(formData.get("bankName") ?? "") || null,
    bankAgency: String(formData.get("bankAgency") ?? "") || null,
    bankAccount: String(formData.get("bankAccount") ?? "") || null,
    pixKey: String(formData.get("pixKey") ?? "") || null,
  };

  await prisma.tenant.update({ where: { id: tenantId }, data });
  revalidatePath("/configuracoes/empresa");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveManagerSignature(payload: { signatureBase64: string; signerName: string; signerRole: string }) {
  const session = await auth();
  if (!session?.user) return { error: "unauthorized" };
  const tenantId = (session.user as any).tenantId as string;
  if (!(session.user as any).isAdmin) return { error: "forbidden" };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      managerSignatureUrl: payload.signatureBase64 || null,
      managerSignerName: payload.signerName || null,
      managerSignerRole: payload.signerRole || null,
    },
  });
  revalidatePath("/configuracoes/empresa");
  revalidatePath("/contratos");
  return { ok: true };
}
