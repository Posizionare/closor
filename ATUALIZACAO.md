# Atualização — Closor v8

> **Antes de tudo:**
> ```powershell
> cd C:\Users\felip\Desktop\growth-crm
> npx prisma db push
> npx prisma generate
> npm run db:seed
> ```

## Novidades v8

### Cliente — campos obrigatórios para contrato
Ao elaborar contrato pela conversa, se o cliente tiver cadastro simples, o popup pede primeiro: Nome da empresa, CPF/CNPJ, Nome do cliente, Endereço, E-mail, Telefone. Só libera o contrato depois de completar.

### Encerrar atendimento + protocolo (corrigido)
Botão Encerrar agora funciona: gera protocolo `YYYYMMDD-XXXX` na hora, registra mensagem do sistema e fecha a conversa.

### Follow up de prospecção com agendamento
Botão abre modal com sugestões de data (Amanhã, 3 dias, 7 dias, 15 dias) ou data livre. Cria tarefa de follow up e notifica o atendente.

### Mensagem automática de agradecimento
Quando o cliente aceita a proposta, o sistema envia automaticamente uma mensagem de agradecimento pela parceria na conversa.

### Proposta puxa o layout do modelo
A proposta criada na conversa agora grava o modelo escolhido. A tela de aceite do cliente exibe a capa e a cor do modelo de orçamento.

### Bug "Não foi possível gerar o link" (corrigido)
`sendProposalForAccept` e `prepareContractForSigning` agora aceitam contactId — resolvem ou criam o deal automaticamente.

### Visualizar proposta antes de enviar
Botão "👁 Visualizar" no modal de montar proposta abre o preview formatado.

### Financeiro (novo módulo)
- Todo contrato fechado entra automaticamente no Financeiro no dia da criação.
- Duas abas: **Serviços únicos** e **Recorrência** (mensalidades).
- KPIs + gráfico de evolução de vendas dos últimos 6 meses (único vs. recorrente).
- Item mensal detecta automaticamente que é recorrente.

### Dashboard moderno (overview ao entrar)
Tela inicial reformulada: KPIs, gráfico de evolução de vendas, resumo "Hoje" (reuniões/tarefas/conversas/contatos) e mini-board do funil com distribuição por etapa.

---

# Atualização — Closor v7

> **Antes de tudo** (rode dentro de `C:\Users\felip\Desktop\growth-crm`):
>
> ```powershell
> npx prisma db push
> npx prisma generate
> npm run db:seed
> ```
>
> O `db:seed` é importante porque renomeia "Em contato" → "Em atendimento", remove "Negociação" e adiciona as novas etapas (Follow up Prospecção, Follow up Proposta, Contrato enviado).

## Novidades v7 — Funil 100% automático + WhatsApp completo

### Funil — etapas reorganizadas
- **Em contato** → renomeado para **Em atendimento**
- **Negociação** → removida
- Adicionadas: **Follow up Prospecção**, **Follow up Proposta**, **Contrato enviado**
- Sequência final: Novo contato → Em atendimento → Reunião agendada → Follow up Prospecção → Proposta enviada → Follow up Proposta → Ganho → Contrato enviado / Perdido
- Botões **Mover** e **Excluir** **removidos** dos cards. Drag & drop também desativado. Tudo passa a ser automático pelas ações reais.

### WhatsApp dispara funil automaticamente
- Lead chega no WhatsApp → cria contato + deal em "Novo contato".
- Atendente responde ou pega o atendimento → deal vai para "Em atendimento" e contato é atribuído ao vendedor.
- Reunião agendada → deal vai para "Reunião agendada".
- Proposta enviada para aceite → deal vai para "Proposta enviada" + cria task de follow up 2 dias antes da validade.
- Cliente aceita proposta → deal vai para "Ganho" + comissão/meta atualizadas.
- Cliente recusa proposta → deal vai para "Follow up Proposta" (não direto pra Perdido).
- Contrato assinado → deal vai para "Contrato enviado".

### Header da conversa — sem seletor manual de status
- Removido o select de status. O badge de status reflete automaticamente o que aconteceu.
- Status visível no chip ao lado do nome do cliente.
- Setor da conversa (Comercial / Suporte / Financeiro) selecionável só por gestor; outros papéis veem o setor mas não trocam.

### Filas e visualização por papel
- **Gestor/Admin**: visão completa, com filtros por departamento (Todos / Comercial / Suporte / Financeiro).
- **Comercial (SDR/Vendas/Prospecção/Closer/Comercial)**: vê comercial + sem departamento; pode criar proposta, contrato, ganho/perdido.
- **Suporte**: vê só fila Suporte; agenda "Reunião de suporte"; transfere e revisa contratos. Sem ganho/perdido.
- **Financeiro**: vê só fila Financeiro; agenda "Revisão de contrato (financeiro)"; sem ganho/perdido.
- Lista da inbox tem agora seção visível **"⏳ Aguardando atendimento"** com leads novos sem dono.

### Botões dinâmicos por contexto
- **Enviar proposta**: abre modal **inline** dentro da conversa — escolhe modelo de orçamento, adiciona produtos do catálogo, define validade, gera link de aceite e pré-preenche a mensagem para o cliente. Não sai da tela do WhatsApp.
- **Elaborar contrato**: aparece só quando o contato ainda **não tem contrato**. Abre escolha do modelo cadastrado.
- Quando contrato já existe: o botão somem e fica só o badge **"Contrato vence em DD/MM/AAAA"** ao lado do nome.

### Transferência com mensagem automática
- Modal de transferência: escolher por **atendente** (lista) ou **setor** (Comercial / Suporte / Financeiro).
- Ao transferir, o sistema envia mensagem automática (system) na conversa: *"Seu atendimento foi transferido para [atendente/setor]. Em breve entraremos em contato."*

### Mensagens com nome do atendente
- Cada mensagem outbound tem o **nome do atendente** que enviou (snapshot no momento), exibido em pequeno acima do balão. Múltiplos atendentes no mesmo número convivem.

### Anexos, áudio e emojis no WhatsApp
- 📎 Anexar arquivo (imagem, PDF, etc.) com pré-visualização inline.
- 🎤 Gravar áudio direto pelo navegador (MediaRecorder).
- 😊 Picker rápido de emojis comuns.

### Follow up
- 2 estágios diferentes no funil para diferenciar: **Follow up Prospecção** e **Follow up Proposta**.
- Atendente pode marcar manualmente qualquer um pelos botões na conversa.
- Quando proposta é enviada, **task de follow up automática** é criada 2 dias antes da validade.
- Quando proposta é recusada, deal vai para **Follow up Proposta** (não Perdido direto).

### Protocolo de atendimento
- Botão **Encerrar** na conversa. Quando atendente encerra **e** cliente também encerra (`closedByOwner` + `closedByClient`), gera protocolo automático no formato `YYYYMMDD-XXXX` e mensagem do sistema na conversa registrando o protocolo.

### Exclusão de contrato — só CEO/Admin
- Botão Excluir só aparece para admin/CEO.
- Não-admin abre **chamado de exclusão** com motivo obrigatório (modelo `ContractDeletionRequest`).

### Templates de proposta e contrato — agora puxam corretamente
- Página `/contratos/gerar/[dealId]?tpl=<id>` aceita modelo específico via query.
- Página `/propostas/gerar/[dealId]?tpl=<id>` idem.
- Capa da proposta agora tem **página A4 fixa** (210×297mm) — não quebra mais. Imagem ocupa folha inteira com título sobreposto.

### Assinatura digitada (cliente também)
- Tela `/assinar/[token]` agora tem aba **Digitar** + **Desenhar**.
- Em "Digitar", cliente escolhe entre 5 estilos de fonte cursiva (Brush Script, Lucida Handwriting, Segoe Script, Comic Sans, Pacifico). Sistema gera PNG da assinatura automaticamente a partir do nome digitado.

### Logo white label
- Sidebar mostra **"Closor" como nome principal** com símbolo C laranja.
- Quando o cliente sobe seu logo (`logoUrl`), aparece **ao lado** com divisor: `Closor | Logo do Cliente`.
- O nome Closor sempre permanece como sistema principal; o cliente personaliza com seu logo.

---

# Atualização — Closor v6

> **Antes de tudo:**
>
> ```powershell
> cd C:\Users\felip\Desktop\growth-crm
> npx prisma db push
> npx prisma generate
> ```

## Novidades v6

### Bug fixes
- **Erro Prisma `proposal.contact`** corrigido — adicionada relation `Proposal -> Contact`.
- **Bug do % da meta** (mostrar 0% mesmo com vendido > 0) corrigido — agora mostra 1 casa decimal quando < 1%.

### Sidebar reorganizada
Estrutura nova com grupos:
- (topo) Dashboard · Tarefas · Relatórios · Conversões Anúncios
- **Atendimento**: WhatsApp · Clientes (era Contatos) · Agente de Chat · Reuniões (era Agenda)
- **CRM**: Produtos · Contratos · Propostas · Funil de Vendas
- **Comercial**: Metas · Comissões · Atendentes (admin)
- (rodapé) Ajuda · Continuar conhecer o menu · Feedback · Configurações
- Integrações saiu do menu principal e agora vive dentro de Configurações.

### Header
- Avatar voltou ao canto direito com **dropdown**: nome, e-mail, Configurações, Equipe (só admin), Sair.
- **Sino**: ao abrir, badge de não-lidas é zerado automaticamente.

### Configurações reformulada
- Sidebar interna com grupos **Workspace** (Organização, Equipe e permissões, Integrações) e **Conta** (Assinatura).
- Cada item com ícone e indicador de ativo.

### Assinatura / Planos
- Nova rota `/configuracoes/assinatura` com:
  - Plano atual + dias restantes de avaliação + limites (usuários/projetos/storage)
  - Toggle **Mensal / Anual (-20%)**
  - 3 planos lado a lado (Essencial / Profissional / Empresarial) com botão de assinar
  - **Histórico de faturas** com download (NF e fatura)

### Relatórios — 3 abas
- **Visão geral** (gráficos de evolução, comparações, ranking)
- **Contratos gerados** (KPIs + tabela completa, vencendo nos próximos 30d)
- **Chamados** (total, atendentes, evolução mensal)

### Contratos
- **Editar** e **Excluir** disponíveis na lista e na visualização.
- Modo de edição inline na página do contrato (título, valor, vigência, corpo).

### Assinatura digital — gestor
Configurações > Organização > Assinatura do gestor:
- Aba **Digitar** — gera assinatura usando 5 fontes cursivas (Brush Script, Lucida Handwriting, Segoe Script, etc.); o usuário só digita o nome.
- Aba **Desenhar** — canvas tradicional.
- Aba **Subir PNG** — upload de imagem.

### Cancelamento de reunião
Quando atendente cancela uma reunião, abre modal com:
- **Motivo**: Alteração de dia e hora · Imprevisto · Remarcar · Cancelado pelo cliente
- **Mensagem ao cliente** (gerada automaticamente conforme motivo, editável)
- Checkboxes para avisar via **WhatsApp interno**, **e-mail**, e atualizar **Google Agenda**
- A reunião é removida do calendário e a mensagem aparece na conversa do contato no inbox.

---

# Atualização — Closor v5

> **Antes de tudo:**
>
> ```powershell
> cd C:\Users\felip\Desktop\growth-crm
> npx prisma db push
> npx prisma generate
> ```

## Novidades v5

### Bug fix
- **Erro de build** (`Expression expected` em `produtos/ProductList.tsx`) corrigido — chave duplicada removida.

### Funil
- Card mostra **vendedor responsável** com avatar + nome.
- Quando o deal vai para **Ganho**, valor entra automaticamente na **meta** e na **comissão** do vendedor que estiver como `ownerId`.
- Filtro de comissão e meta agora considera **todos os usuários ativos** (não só os com `commercialRole = VENDAS`), assim qualquer um que feche conta entra no relatório.

### Propostas — agora estilo Contratos
- Página `/propostas` com **abas Criar / Enviadas**.
- Aba "Enviadas": tabela com Cliente · Empresa · Título · Enviado em · Validade · Valor · Status · Ações + busca por cliente/número.
- No builder de proposta: novo botão **Enviar para aceite do cliente** que gera link público único `/aceitar/<token>`.
- Cliente acessa o link sem login, vê os itens, valor total e responde **Aceitar** ou **Recusar**.
- **Ao aceitar**, o deal é movido para **Ganho** automaticamente, contando na meta/comissão do atendente. Gestor recebe notificação no sino.
- Detalhe da proposta `/propostas/[id]` com Voltar, info de aceite (data, IP, quem aceitou) e link para reenviar.

### Contrato — assinatura do gestor
- Em **Configurações > Empresa**, novo card **"Assinatura do gestor"**: desenhe no canvas ou suba PNG, defina nome e cargo.
- A assinatura é **anexada automaticamente em todos os contratos**.
- No espelho do contrato: bloco final com duas assinaturas lado a lado — gestor (CONTRATADA) e cliente (CONTRATANTE) — com selo MP 2.200-2/2001.

### Painel de Atendentes (gestor)
- Nova rota `/atendentes` (admin/gestor).
- Cards KPI: Chamados · Reuniões agendadas · Reuniões concluídas · Propostas enviadas · Ganhos · Valor vendido (totais da equipe).
- Tabela linha por atendente: chamados · reuniões agendadas · concluídas · propostas · ganhos · perdas · vendido · meta com barra de progresso.

### Relatórios — gráficos
- Página `/relatorios` reformulada com gráficos de barras SVG.
- KPIs principais (vendas mês, conversão, ticket médio, contatos) com **delta % vs. mês anterior**.
- **Evolução** com pills para alternar métrica (Vendas / Valor / Contatos / Chamados) e período (Mês / Dia).
- **Comparativo** Mês atual vs. Mês anterior em barras.
- **Vendas por origem** e **Ranking por vendedor** em barras horizontais.

### Proposta mensal — detalhamento
- Quando a proposta tem produto **Mensal**, o plano de pagamento gera **N parcelas com data correta** (no dia escolhido pelo atendente — campo `paymentDay`, default dia 5).
- Builder permite escolher data de validade.

---

# Atualização — Closor v4

> **Antes de tudo:**
>
> ```powershell
> cd C:\Users\felip\Desktop\growth-crm
> npx prisma db push
> npx prisma generate
> ```
>
> Para integrações Google, copie `.env.example` → `.env` e preencha:
> - `GOOGLE_OAUTH_CLIENT_ID`
> - `GOOGLE_OAUTH_CLIENT_SECRET`
>
> Crie no [Google Cloud Console](https://console.cloud.google.com/apis/credentials), com redirect URI `http://localhost:3000/api/oauth/google/callback`.

## Novidades v4

### Header / Sidebar
- Avatar do canto superior direito **removido** — só fica o sino de notificações.
- Avatar permanece na sidebar (canto inferior esquerdo) com menu de Sair.

### Proposta — layout Piperun
- ProposalView refeita: cabeçalho com **logo da contratada à esquerda**, **dados da empresa no meio** e **dados do contato/atendente à direita**.
- Boxes "Dados da pessoa" e "Dados da empresa" lado a lado.
- Tabela de produtos: Qtd / Item / Valor unit. / Desconto / Subtotal — com descrição multi-linha.
- Resumo da proposta + **plano de pagamento** (Entrada + parcelas com data e método).
- Itens marcados como **Mensal** (do catálogo) entram automaticamente como mensalidade no plano.
- Botão **Voltar** no topo (não abre mais em nova aba — Salvar e visualizar usa router.push).

### Produtos — Mensal com prazo
- Toggle entre **Pagamento único** e **Mensalidade**.
- Quando Mensal, campo obrigatório **Prazo do serviço (meses)**.
- Cards do catálogo mostram "Mensal · 12 meses" como badge.

### Contatos — vendedor responsável + histórico
- Campo **Vendedor responsável** no formulário.
- Atribuição automática quando: alguém pega atendimento no WhatsApp, responde mensagem, ou cria deal vinculado.
- Aba **Contratos** na ficha do contato listando título, vigência ("Fechado dd/mm até dd/mm"), valor e status.
- Aba **Histórico de atendimento** mostrando todos os vendedores que atenderam, motivo da troca e outcome (ganho/perdido).
- Comissão e meta do vendedor que **fechar** o deal são contabilizadas automaticamente (já existia, agora reforçado).

### Agente de Chat — editor visual de fluxo
- Nova seção **Automações de fluxo** em /agente-chat.
- Cada automação tem **nome próprio** ("Qualificação inicial WhatsApp", etc.).
- Dois formatos: **Esteira** (sequencial linear) ou **Fluxograma** (com ramificações por resposta).
- 4 tipos de nó: **Mensagem** (texto), **Pergunta** (com opções), **Ação** (criar lead, transferir setor), **Espera** (delay).
- Cada opção de pergunta pode ligar a um nó diferente — clique no `→` ao lado da opção e depois no nó destino.
- Drag & drop dos nós no canvas (modo fluxograma).
- Inspector lateral edita o nó selecionado.

### Agenda — WhatsApp interno
- Botão **WhatsApp** na reunião abre conversa interna do CRM (não wa.me).
- Mensagem de lembrete já vai pré-preenchida no campo de resposta.

### Integrações — OAuth Google real
- Conectar Google Calendar / Meet / Ads agora **redireciona para o consentimento oficial do Google**.
- Após aprovação, salva tokens (access + refresh) no banco e mostra a conta conectada.
- Rotas: `/api/oauth/google/start?provider=google_calendar` e `/api/oauth/google/callback`.
- Variáveis necessárias: `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`.
- Outros provedores (Meta, Instagram, TikTok) continuam com o fluxo "1 clique" mock até você habilitar OAuth deles do mesmo jeito.

---

# Atualização — Closor v3

> **Antes de tudo:** rode novamente as migrations
>
> ```powershell
> cd C:\Users\felip\Desktop\growth-crm
> npx prisma db push
> npx prisma generate
> ```

## Novidades v3 (esta rodada)

### Funil
- **Drag & drop** dos cards entre colunas (arraste com o mouse — coluna alvo destaca em laranja).
- Botão WhatsApp do card abre **conversa interna** no inbox.

### Contatos
- Botão "Chamar no WhatsApp" (e o atalho na lista de contatos) agora **abre/cria a conversa dentro do CRM**, não mais wa.me.

### Propostas
- **Builder dedicado** em `/propostas/montar/[dealId]`: o atendente adiciona produtos do catálogo, cria itens personalizados, ajusta quantidade, valor e desconto, salva e visualiza.
- **Preview cheio mesmo sem itens** (gera linha-resumo com o título do deal).
- **Layout dos cards de identificação** ajustado (sem mais quebra estranha em "Razão Social").
- **Todas as imagens em A4 puro** (1240×1754 px). Imagens de encerramento ocupam **uma folha A4 inteira cada**.

### Contratos
- **Botão "Enviar para assinatura"** gera link público único `/assinar/<token>`.
- Página pública sem login para o cliente assinar (canvas, nome, CPF, IP registrado, MP 2.200-2/2001).
- Após assinatura, **gestor recebe notificação** e contrato vai para status ASSINADO.
- Compartilhamento direto do link via WhatsApp / e-mail / copiar.

### Agenda
- Tela completa **em formato calendário mensal** (navegação por mês, hoje destacado).
- **Cor por atendente** — admin vê quem atende cada reunião com legenda.
- Clicar no evento abre painel com **botões de Lembrete via WhatsApp** e **Lembrete via e-mail** para o cliente.
- Sino notifica o atendente automaticamente **2h antes** (e novamente 30min antes), com dedupe diário.

---

# Atualização — Closor v2

Esta rodada inclui mudanças de schema (vencimento de contrato, comissões, notificações, conexão WhatsApp, fluxos visuais, capa/encerramentos da proposta como upload). Antes de subir o servidor, rode:

```bash
npx prisma db push
npx prisma generate
npm run db:seed   # atualiza etapas do funil e renomeia para "Closor"
```

## O que mudou

### Geral
- **Renomeado para Closor** (sistema, login, e-mail).
- **Bug fix de hidratação corrigido** (Badge dentro de `<p>` em `CardDescription`).
- **Logo da sidebar agora é clicável** e leva ao Dashboard.
- **Sino de notificações funcional** (sino no canto direito): novos fechamentos para gestores, vencimento de contrato, lembrete de reunião, metas atrasadas. Polling a cada 30s.

### Funil de Vendas
- **Etapas atualizadas**: Novo contato → Em contato → Reunião agendada → Negociação → Proposta enviada → Ganho/Perdido (removidas Apresentação e Aguardando resposta).
- **Origens novas**: Site, WhatsApp, Evento (em todos os formulários).
- **Bug “Nova oportunidade”** corrigido — o formulário agora usa máscara de moeda (vírgulas conforme digita) e validação robusta.
- Lead que chega pelo WhatsApp já vai para o funil automaticamente.

### Contatos
- **Máscaras automáticas** em CPF/CNPJ (000.000.000-00 ou 00.000.000/0000-00) e telefone ((11) 99999-0000).
- Botão **“Editar”** no lugar de “Em contato” + botão **“Chamar no WhatsApp”** abrindo wa.me/55…

### WhatsApp
- **Tela de conexão** antes do inbox: escolha QR Code ou Cloud API (Meta).
- **Ações inteligentes na conversa** (mudam pelo contexto):
  - Padrão: Enviar proposta · Enviar contrato · Agendar reunião · Ganho · Perdido.
  - Após **Ganho** com contrato vigente: só **Agendar reunião**.
  - Após **Ganho** com contrato vencido: Proposta · **Renovar contrato** · Agendar reunião · Ganho · Perdido.
- **Nome do cliente exibe a data de vencimento** do contrato vigente ao lado.
- **Botão Salvar contato** dentro da conversa atualiza contato + funil de uma vez.
- **Agendar reunião** cria tarefa, link Meet (placeholder), move o deal para “Reunião agendada” e habilita botão de **Enviar lembrete** com texto pronto: `Olá {{nome_cliente}}, nossa reunião agendada para 10:00h está confirmada?`.

### Contratos
- Cabeçalho com **logo da contratada à esquerda + logo do cliente à direita**.
- **Banner de vigência** (vencimento explícito).
- **Bloco de assinatura digital**: nome, CPF, canvas para desenhar a assinatura, IP registrado, data/hora. Salva em `Contract` com status ASSINADO.
- **Sistema avisa o gestor** automaticamente 30, 15 e 7 dias antes do vencimento via sino.

### Propostas
- **Formato A4** (210×297mm).
- **Sem vídeo**.
- **Upload real de imagens** (capa + encerramentos) via base64. Mostra **medidas recomendadas** (capa: 1240×1750 px / encerramento: 1240×620 px).
- **Quantidade de imagens de encerramento** configurável (0 a 4).
- **Botão de visualização** do modelo na lista — abre mockup A4 antes de gerar.

### Comissões
- Nova página **/comissoes**:
  - Vendedor: vê quantos contratos fechou, valor total e sua comissão do mês.
  - Admin: tabela com todos os vendedores; edita o **% de comissão** inline; vê total de contratos fechados, valor total em vendas e comissão a pagar.

### Integrações
- Botão **“Conectar com 1 clique”** para Google (Calendar, Meet, Ads), Meta Ads, Instagram, YouTube, TikTok — abre modal **escolher conta** estilo OAuth.
- Mantém configuração manual avançada como fallback.

### Reuniões
- Quando agendar pelo WhatsApp, o link do Meet é **espelhado** na conversa como mensagem automática.

## Próximas iterações sugeridas (precisam de libs adicionais)
- **Drag & drop dos blocos** no Kanban (precisa `@dnd-kit/core`).
- **Editor visual de fluxo** (esteira/fluxograma) no Agente de Chat (precisa `reactflow`).
- **Upload real (S3/R2)** das imagens de proposta — hoje grava data URL no banco (funciona, mas pesa em modelos com várias imagens).
- **OAuth real** (Google/Meta) — hoje a tela de “1 clique” é mock que persiste a conta escolhida; falta o handshake real.
