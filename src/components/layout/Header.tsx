"use client";
import { Search, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

type Props = {
  title?: string;
  user: { name?: string | null; email?: string | null };
  isAdmin?: boolean;
};

const LABELS: Record<string, string> = {
  dashboard: "Dashboard", tarefas: "Tarefas", relatorios: "Relatórios",
  conversoes: "Conversões", whatsapp: "WhatsApp", contatos: "Clientes",
  "agente-chat": "Agente de Chat", agenda: "Agenda", produtos: "Produtos",
  contratos: "Contratos", propostas: "Propostas", funil: "Funil de Vendas",
  metas: "Metas", comissoes: "Comissões", financeiro: "Financeiro",
  atendentes: "Atendentes", configuracoes: "Configurações", ajuda: "Ajuda",
  feedback: "Feedback", onboarding: "Conhecer o menu", novo: "Novo",
  empresa: "Organização", usuarios: "Equipe", setores: "Setores",
  assinatura: "Assinatura", integracoes: "Integrações", gerar: "Gerar",
  montar: "Montar", automacao: "Automação",
};

export function Header({ user, isAdmin = false }: Props) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Monta breadcrumb (ignora segmentos que parecem id)
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += "/" + seg;
    const isId = seg.length > 18 || /^[0-9a-f]{20,}$/.test(seg) || /^c[a-z0-9]{20,}$/.test(seg);
    if (isId) continue;
    crumbs.push({ label: LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1), href: acc });
  }

  return (
    <header className="flex h-[60px] items-center justify-between gap-4 border-b border-border bg-white px-5 md:px-7 shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground shrink-0">Closor</Link>
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            {i === crumbs.length - 1 ? (
              <span className="font-medium truncate">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground truncate">{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Buscar..."
            className="h-9 w-56 rounded-lg border border-border bg-[hsl(var(--app-bg))] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]/20 focus:border-[hsl(var(--brand))]/40"
          />
        </div>
        <NotificationBell />
        <UserMenu user={user} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
