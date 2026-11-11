"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { AppModule, CommercialRole } from "@prisma/client";
import { ALL_MODULES } from "@/lib/permissions";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  if (!(session.user as any).isAdmin) throw new Error("forbidden");
  return session;
}

export async function createUser(formData: FormData) {
  const session = await ensureAdmin();
  const tenantId = (session.user as any).tenantId as string;

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !name || password.length < 6) {
    return { error: "Dados inválidos. Senha precisa ter ao menos 6 caracteres." };
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "E-mail já cadastrado." };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      tenantId,
      name,
      email,
      passwordHash,
      phone: String(formData.get("phone") ?? "") || null,
      jobTitle: String(formData.get("jobTitle") ?? "") || null,
      sectorId: (String(formData.get("sectorId") ?? "") || null) || null,
      commercialRole: (String(formData.get("commercialRole") ?? "NENHUM") as CommercialRole),
      monthlyGoal: Number(formData.get("monthlyGoal") ?? 0) || null,
      isAdmin: formData.get("isAdmin") === "on",
      status: "ATIVO",
    },
  });

  // Permissões padrão: WhatsApp sempre, demais módulos só leitura
  for (const m of ALL_MODULES as AppModule[]) {
    await prisma.userPermission.create({
      data: {
        userId: user.id,
        module: m,
        canView: m === "WHATSAPP",
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canConfigure: false,
      },
    });
  }

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

export async function updateUserStatus(userId: string, status: "ATIVO" | "INATIVO") {
  await ensureAdmin();
  await prisma.user.update({ where: { id: userId }, data: { status } });
  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

export async function updatePermissions(userId: string, formData: FormData) {
  await ensureAdmin();
  for (const m of ALL_MODULES as AppModule[]) {
    const can = (k: string) => formData.get(`${m}_${k}`) === "on";
    await prisma.userPermission.upsert({
      where: { userId_module: { userId, module: m } },
      update: {
        canView: m === "WHATSAPP" ? true : can("view"),
        canCreate: can("create"),
        canEdit: can("edit"),
        canDelete: can("delete"),
        canExport: can("export"),
        canConfigure: can("configure"),
      },
      create: {
        userId,
        module: m,
        canView: m === "WHATSAPP" ? true : can("view"),
        canCreate: can("create"),
        canEdit: can("edit"),
        canDelete: can("delete"),
        canExport: can("export"),
        canConfigure: can("configure"),
      },
    });
  }
  revalidatePath(`/configuracoes/usuarios/${userId}`);
  return { ok: true };
}
