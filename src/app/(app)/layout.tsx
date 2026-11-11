import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/providers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [tenant, perms] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: (session.user as any).tenantId } }),
    prisma.userPermission.findMany({ where: { userId: (session.user as any).id } }),
  ]);

  return (
    <Providers>
      <div className="min-h-screen p-0 md:p-3" style={{ background: "hsl(var(--app-bg))" }}>
        {/* Container flutuante em card */}
        <div className="flex min-h-screen md:min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-none md:rounded-2xl bg-white cl-shadow-lg border border-border">
          <Sidebar
            systemName={tenant?.systemName ?? "Closor"}
            brandColor={tenant?.secondaryColor}
            logoUrl={tenant?.logoUrl}
            user={{ name: session.user.name, email: session.user.email }}
            permissions={perms.map((p) => ({
              module: p.module,
              canView: p.canView,
              canCreate: p.canCreate,
              canEdit: p.canEdit,
              canDelete: p.canDelete,
              canExport: p.canExport,
              canConfigure: p.canConfigure,
            }))}
            isAdmin={(session.user as any).isAdmin}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <Header user={{ name: session.user.name, email: session.user.email }} isAdmin={(session.user as any).isAdmin} />
            <main className="flex-1 overflow-y-auto cl-scroll p-5 md:p-7" style={{ background: "hsl(var(--app-bg))" }}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </Providers>
  );
}
