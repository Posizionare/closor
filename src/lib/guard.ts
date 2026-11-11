import { auth } from "./auth";
import { prisma } from "./prisma";
import { can } from "./permissions";
import type { AppModule } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireModule(module: AppModule, action: "view" | "create" | "edit" | "delete" | "export" | "configure" = "view") {
  const session = await requireSession();
  const user = session.user as any;
  const perms = await prisma.userPermission.findMany({ where: { userId: user.id } });
  const allowed = can(perms.map((p) => ({
    module: p.module,
    canView: p.canView,
    canCreate: p.canCreate,
    canEdit: p.canEdit,
    canDelete: p.canDelete,
    canExport: p.canExport,
    canConfigure: p.canConfigure,
  })), module, action, user.isAdmin);
  if (!allowed) redirect("/dashboard?denied=" + module.toLowerCase());
  return session;
}
