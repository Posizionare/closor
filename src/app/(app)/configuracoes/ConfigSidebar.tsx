"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Building2, Users, Plug, CreditCard } from "lucide-react";

const GROUPS = [
  {
    title: "Workspace",
    items: [
      { href: "/configuracoes/empresa", label: "Organização", icon: Building2 },
      { href: "/configuracoes/equipe", label: "Equipe e permissões", icon: Users },
      { href: "/configuracoes/integracoes", label: "Integrações", icon: Plug },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/configuracoes/assinatura", label: "Assinatura", icon: CreditCard },
    ],
  },
];

export function ConfigSidebar() {
  const pathname = usePathname();
  return (
    <aside className="text-sm">
      <Link href="/dashboard" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ChevronLeft className="h-3 w-3" /> Configurações
      </Link>
      <div className="space-y-3">
        {GROUPS.map((g, i) => (
          <div key={i}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">{g.title}</div>
            <div className="flex flex-col gap-0.5">
              {g.items.map(it => {
                const Icon = it.icon;
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link key={it.href} href={it.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors ${active ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
