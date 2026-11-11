import { requireModule } from "@/lib/guard";
import { ConfigSidebar } from "./ConfigSidebar";

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  await requireModule("CONFIGURACOES", "view");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <ConfigSidebar />
      <section>{children}</section>
    </div>
  );
}
