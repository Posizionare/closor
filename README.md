# Growth CRM — SaaS comercial white label

Plataforma SaaS de CRM com WhatsApp, funil de vendas, propostas, contratos, metas e relatórios. Inspirada visualmente em Bolten/PipeRun.

## Stack

- **Next.js 14** (App Router, Server Actions)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn-style** (componentes inline em `src/components/ui`)
- **Prisma** + **PostgreSQL**
- **Auth.js v5 (NextAuth)** com Credentials + JWT
- **Lucide** ícones
- Estrutura preparada para integrações externas: WhatsApp API, Meta Ads, Google Ads, Google Agenda/Meet, Instagram, YouTube, TikTok, SMTP, Webhooks

## Como rodar

```bash
# 1. Variáveis de ambiente
cp .env.example .env
# defina DATABASE_URL e AUTH_SECRET

# 2. Instalar
npm install

# 3. Banco de dados
npm run db:push    # sincroniza schema
npm run db:seed    # cria tenant demo, admin e vendedor

# 4. Dev
npm run dev
```

Acesse http://localhost:3000

**Credenciais demo:**

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@demo.com | admin123 |
| Vendas | vendas@demo.com | vendas123 |

## Estrutura de pastas

```
src/
  app/
    (app)/                  # área autenticada
      dashboard/            # painel inicial (gestor x atendente)
      whatsapp/ ...         # 14 módulos com placeholders
      configuracoes/
        empresa/            # White label
        usuarios/[id]/      # Permissões por módulo
        setores/
    login/                  # tela de login
    api/auth/[...nextauth]/ # Auth.js
  components/
    ui/                     # button, input, card, badge, ...
    layout/                 # Sidebar, Header, PageHeader
    auth/LoginForm.tsx
  lib/
    auth.ts                 # NextAuth config
    prisma.ts
    permissions.ts          # can(), módulos, regra fixa do WhatsApp
    guard.ts                # requireSession / requireModule
prisma/
  schema.prisma             # modelos multi-tenant white label
  seed.ts                   # tenant + admin + vendedor + funil
```

## Roadmap (etapas)

| Etapa | Conteúdo | Status |
|---|---|---|
| **1** | **Estrutura, autenticação, layout, dashboard, usuários, permissões, white label** | ✅ |
| 2 | Contatos, Produtos, Funil de Vendas (Kanban), Tarefas | 🔜 |
| 3 | WhatsApp completo (mock + estrutura para API real), tags, filas, transferência, lead automático, Agente de Chat | 🔜 |
| 4 | Propostas, Contratos, geração de PDF, modelos de e-mail e WhatsApp | 🔜 |
| 5 | Conversões, Meta Ads, Google Ads, página de Integrações | 🔜 |
| 6 | Redes Sociais, Relatórios e dashboards | 🔜 |
| 7 | Google Agenda + Meet, Metas, painel do gestor refinado | 🔜 |

## O que a Etapa 1 entrega

1. **Multi-tenant** com modelo `Tenant` (slug, branding, dados comerciais).
2. **Autenticação** Auth.js v5 + Credentials + middleware de proteção de rotas.
3. **Layout SaaS** com sidebar fixa à esquerda, logo, 15 itens de menu, item ativo com fundo cinza claro, header com busca, avatar e sino — alinhado à referência Bolten.
4. **Dashboard** com KPIs reais (conversas, tarefas, vendas, contatos, meta), e visão diferenciada para Gestor x Atendente.
5. **Usuários** com nome, e-mail, telefone, cargo, setor, função comercial (SDR, Vendas, Prospecção, Closer, Comercial, Financeiro, Suporte, Gestor, Admin), meta mensal e status.
6. **Permissões por módulo** (ver/criar/editar/excluir/exportar/configurar) com regra fixa: **WhatsApp sempre liberado para todos**.
7. **White label** em `Configurações → Empresa`: nome do sistema, logo, favicon, 3 cores, dados comerciais, dados bancários.
8. **Setores** para organizar atendimento e fluxos.
9. **Schema Prisma completo** já com todas as entidades das próximas etapas (Conversation, Deal, Pipeline, ProposalTemplate, ContractTemplate, Goal, Integration, etc.) — permite construir as próximas etapas sem refazer migrations.

## Convenções e decisões

- **Server Actions** para escrita (em vez de API routes manuais) — código mais enxuto e tipado.
- **Permissões avaliadas no servidor** via `requireModule()` antes de renderizar páginas, com queda para `/dashboard?denied=…` em rotas proibidas.
- **WhatsApp** é tratado como módulo "system": ver fica travado em `true` na UI e forçado em `can()`.
- **Branding** lido do tenant a cada request — trocas no White label refletem após reload da página.
