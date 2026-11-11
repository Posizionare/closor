"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MessageCircle, BarChart3, Bot, Package, FileText, ScrollText,
  CheckSquare, Kanban, Users, Calendar, Target, PieChart, Settings,
  Trophy, UserCog, HelpCircle, Compass, MessageSquare, Wallet,
  LayoutDashboard, ChevronDown, ChevronsLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppModule } from "@prisma/client";
import { can, type ModulePermission } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

type NavItem = {
  module: AppModule;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type Group = { title: string; items: NavItem[]; defaultOpen?: boolean };

const GROUPS: Group[] = [
  {
    title: "Visão geral",
    defaultOpen: true,
    items: [
      { module: "RELATORIOS" as AppModule, href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { module: "TAREFAS" as AppModule, href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { module: "RELATORIOS" as AppModule, href: "/relatorios", label: "Relatórios", icon: PieChart },
      { module: "CONVERSOES" as AppModule, href: "/conversoes", label: "Conversões Anúncios", icon: BarChart3 },
    ],
  },
  {
    title: "Atendimento",
    defaultOpen: true,
    items: [
      { module: "WHATSAPP" as AppModule, href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { module: "CONTATOS" as AppModule, href: "/contatos", label: "Clientes", icon: Users },
      { module: "AGENTE_CHAT" as AppModule, href: "/agente-chat", label: "Agente de Chat", icon: Bot },
      { module: "AGENDA" as AppModule, href: "/agenda", label: "Agenda", icon: Calendar },
    ],
  },
  {
    title: "CRM",
    defaultOpen: true,
    items: [
      { module: "PRODUTOS" as AppModule, href: "/produtos", label: "Produtos", icon: Package },
      { module: "CONTRATOS" as AppModule, href: "/contratos", label: "Contratos", icon: ScrollText },
      { module: "PROPOSTAS" as AppModule, href: "/propostas", label: "Propostas", icon: FileText },
      { module: "FUNIL" as AppModule, href: "/funil", label: "Funil de Vendas", icon: Kanban },
    ],
  },
  {
    title: "Comercial",
    defaultOpen: true,
    items: [
      { module: "METAS" as AppModule, href: "/metas", label: "Metas", icon: Target },
      { module: "METAS" as AppModule, href: "/comissoes", label: "Comissões", icon: Trophy },
      { module: "RELATORIOS" as AppModule, href: "/financeiro", label: "Financeiro", icon: Wallet },
      { module: "RELATORIOS" as AppModule, href: "/atendentes", label: "Atendentes", icon: UserCog, adminOnly: true },
    ],
  },
];

const BOTTOM_NAV = [
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
  { href: "/onboarding", label: "Conhecer o menu", icon: Compass },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

type Props = {
  systemName: string;
  brandColor?: string | null;
  logoUrl?: string | null;
  user: { name?: string | null; email?: string | null };
  permissions: ModulePermission[];
  isAdmin: boolean;
};

export function Sidebar({ systemName, brandColor, logoUrl, user, permissions, isAdmin }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(title: string) {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
  }

  const renderItem = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return null;
    const allowed = can(permissions, item.module, "view", isAdmin);
    if (!allowed) return null;
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors",
          active
            ? "bg-[hsl(var(--app-bg))] text-foreground font-medium"
            : "text-muted-foreground hover:bg-[hsl(var(--app-bg))] hover:text-foreground",
        )}
      >
        <Icon className={cn("h-[16px] w-[16px] shrink-0", active ? "text-[hsl(var(--brand))]" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="truncate flex-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:w-[228px] md:flex-col border-r border-border bg-white shrink-0">
      {/* Marca */}
      <div className="flex h-[60px] items-center justify-between gap-2 px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0" title="Ir para o painel">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold shrink-0"
            style={{ background: brandColor ?? "hsl(var(--brand))" }}
          >
            C
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-[14px] leading-tight truncate">Closor</div>
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={systemName} className="h-3.5 max-w-[90px] object-contain mt-0.5" />
            ) : (
              <div className="text-[11px] text-muted-foreground leading-tight truncate">{systemName}</div>
            )}
          </div>
        </Link>
        <ChevronsLeft className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto cl-scroll px-2.5 py-3 space-y-1">
        {GROUPS.map((group) => {
          const visibleItems = group.items.map(renderItem).filter(Boolean);
          if (visibleItems.length === 0) return null;
          const isCollapsed = collapsed[group.title];
          return (
            <div key={group.title} className="pb-1">
              <button
                onClick={() => toggle(group.title)}
                className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground"
              >
                {group.title}
                <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed && <div className="flex flex-col gap-0.5">{visibleItems}</div>}
            </div>
          );
        })}
      </nav>

      {/* Rodapé: ações + user card */}
      <div className="border-t border-border px-2.5 py-2 space-y-0.5">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors",
                active
                  ? "bg-[hsl(var(--app-bg))] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-[hsl(var(--app-bg))] hover:text-foreground",
              )}
            >
              <Icon className="h-[16px] w-[16px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-[11px]">{initials(user.name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium truncate">{user.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
