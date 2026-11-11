import { PrismaClient, AppModule, CommercialRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const allModules: AppModule[] = [
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

async function main() {
  console.log("Seeding Closor...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { systemName: "Closor" },
    create: {
      slug: "demo",
      name: "Empresa Demo",
      legalName: "Empresa Demo LTDA",
      systemName: "Closor",
      primaryColor: "#0F172A",
      secondaryColor: "#F97316",
      accentColor: "#EF4444",
    },
  });

  const sectorComercial = await prisma.sector.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Comercial" } },
    update: {},
    create: { tenantId: tenant.id, name: "Comercial", color: "#F97316" },
  });
  await prisma.sector.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Financeiro" } },
    update: {},
    create: { tenantId: tenant.id, name: "Financeiro", color: "#10B981" },
  });
  await prisma.sector.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Suporte" } },
    update: {},
    create: { tenantId: tenant.id, name: "Suporte", color: "#3B82F6" },
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const sellerHash = await bcrypt.hash("vendas123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Administrador",
      email: "admin@demo.com",
      passwordHash: adminHash,
      isAdmin: true,
      commercialRole: CommercialRole.GESTOR,
      jobTitle: "Gestor",
      sectorId: sectorComercial.id,
      monthlyGoal: 100000,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "vendas@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Carlos Vendas",
      email: "vendas@demo.com",
      passwordHash: sellerHash,
      isAdmin: false,
      commercialRole: CommercialRole.VENDAS,
      jobTitle: "Executivo de Vendas",
      sectorId: sectorComercial.id,
      monthlyGoal: 30000,
    },
  });

  // Permissões: admin tudo, vendedor com acesso comercial
  for (const m of allModules) {
    await prisma.userPermission.upsert({
      where: { userId_module: { userId: admin.id, module: m } },
      update: {},
      create: {
        userId: admin.id,
        module: m,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canConfigure: true,
      },
    });

    const sellerCan =
      m === "WHATSAPP" ||
      m === "FUNIL" ||
      m === "CONTATOS" ||
      m === "TAREFAS" ||
      m === "AGENDA" ||
      m === "PROPOSTAS" ||
      m === "CONTRATOS" ||
      m === "METAS" ||
      m === "PRODUTOS";

    await prisma.userPermission.upsert({
      where: { userId_module: { userId: seller.id, module: m } },
      update: {},
      create: {
        userId: seller.id,
        module: m,
        canView: sellerCan,
        canCreate: sellerCan && m !== "PRODUTOS",
        canEdit: sellerCan && m !== "PRODUTOS",
        canDelete: false,
        canExport: false,
        canConfigure: false,
      },
    });
  }

  // Pipeline padrão
  const pipeline = await prisma.pipeline.upsert({
    where: { id: `${tenant.id}-default` },
    update: {},
    create: {
      id: `${tenant.id}-default`,
      tenantId: tenant.id,
      name: "Funil de Vendas",
      isDefault: true,
    },
  });

  const stages = [
    { name: "Novo contato", order: 1, type: "normal", color: "#94A3B8" },
    { name: "Em atendimento", order: 2, type: "normal", color: "#60A5FA" },
    { name: "Reunião agendada", order: 3, type: "normal", color: "#EC4899" },
    { name: "Follow up Prospecção", order: 4, type: "normal", color: "#A855F7" },
    { name: "Proposta enviada", order: 5, type: "normal", color: "#F97316" },
    { name: "Follow up Proposta", order: 6, type: "normal", color: "#FBBF24" },
    { name: "Contrato enviado", order: 7, type: "normal", color: "#14B8A6" },
    { name: "Ganho", order: 8, type: "won", color: "#10B981" },
    { name: "Contrato assinado", order: 9, type: "normal", color: "#059669" },
    { name: "Perdido", order: 10, type: "lost", color: "#EF4444" },
  ];

  // Migra deals de etapas obsoletas
  const obsoleteNames = ["Apresentação", "Aguardando resposta", "Em contato", "Negociação"];
  const obsoleteStages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id, name: { in: obsoleteNames } },
  });
  if (obsoleteStages.length > 0) {
    // Cria/garante "Em atendimento" como fallback
    let fallback = await prisma.pipelineStage.findFirst({ where: { pipelineId: pipeline.id, name: "Em atendimento" } });
    if (!fallback) {
      fallback = await prisma.pipelineStage.create({ data: { pipelineId: pipeline.id, name: "Em atendimento", order: 2, type: "normal", color: "#60A5FA" } });
    }
    await prisma.deal.updateMany({
      where: { stageId: { in: obsoleteStages.map(s => s.id) } },
      data: { stageId: fallback.id },
    });
    await prisma.pipelineStage.deleteMany({ where: { id: { in: obsoleteStages.map(s => s.id) } } });
  }

  for (const s of stages) {
    const existing = await prisma.pipelineStage.findFirst({ where: { pipelineId: pipeline.id, name: s.name } });
    if (existing) {
      await prisma.pipelineStage.update({ where: { id: existing.id }, data: { order: s.order, color: s.color, type: s.type } });
    } else {
      await prisma.pipelineStage.create({ data: { pipelineId: pipeline.id, ...s } });
    }
  }

  console.log("Seed finalizada.");
  console.log("Login admin: admin@demo.com / admin123");
  console.log("Login vendas: vendas@demo.com / vendas123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
