import type { AppModule } from "@prisma/client";

export type ModulePermission = {
  module: AppModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canConfigure: boolean;
};

/**
 * Regra fixa: WhatsApp sempre é permitido para qualquer usuário,
 * independente da configuração do administrador.
 */
const WHATSAPP_ALWAYS_ON = true;

export function can(
  permissions: ModulePermission[] | undefined,
  module: AppModule,
  action: "view" | "create" | "edit" | "delete" | "export" | "configure" = "view",
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  if (module === "WHATSAPP" && WHATSAPP_ALWAYS_ON) return true;

  const p = permissions?.find((x) => x.module === module);
  if (!p) return false;
  switch (action) {
    case "view": return p.canView;
    case "create": return p.canCreate;
    case "edit": return p.canEdit;
    case "delete": return p.canDelete;
    case "export": return p.canExport;
    case "configure": return p.canConfigure;
  }
}

export const ALL_MODULES: AppModule[] = [
  "WHATSAPP",
  "CONVERSOES",
  "REDES_SOCIAIS",
  "AGENTE_CHAT",
  "PRODUTOS",
  "CONTRATOS",
  "PROPOSTAS",
  "TAREFAS",
  "FUNIL",
  "CONTATOS",
  "AGENDA",
  "METAS",
  "RELATORIOS",
  "INTEGRACOES",
  "CONFIGURACOES",
] as AppModule[];

export const MODULE_LABELS: Record<AppModule, string> = {
  WHATSAPP: "WhatsApp",
  CONVERSOES: "Conversões",
  REDES_SOCIAIS: "Redes Sociais",
  AGENTE_CHAT: "Agente de Chat",
  PRODUTOS: "Produtos",
  CONTRATOS: "Contratos",
  PROPOSTAS: "Propostas",
  TAREFAS: "Tarefas",
  FUNIL: "Funil de Vendas",
  CONTATOS: "Contatos",
  AGENDA: "Agenda",
  METAS: "Metas",
  RELATORIOS: "Relatórios",
  INTEGRACOES: "Integrações",
  CONFIGURACOES: "Configurações",
} as Record<AppModule, string>;
