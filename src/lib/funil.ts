import { prisma } from "./prisma";

/**
 * Move o deal aberto de um contato para uma etapa específica do funil pelo nome (case-insensitive).
 * Não faz nada se o deal já está naquela etapa ou se a etapa não existe.
 */
export async function moveContactDealToStage(tenantId: string, contactId: string, stageMatcher: string | RegExp) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId, isDefault: true },
    include: { stages: true },
  });
  if (!pipeline) return null;

  const stage = pipeline.stages.find(s =>
    typeof stageMatcher === "string"
      ? s.name.toLowerCase() === stageMatcher.toLowerCase()
      : stageMatcher.test(s.name),
  );
  if (!stage) return null;

  const deal = await prisma.deal.findFirst({
    where: { tenantId, contactId, status: { in: ["ABERTO", "GANHO"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!deal || deal.stageId === stage.id) return null;

  const isWon = stage.type === "won";
  const isLost = stage.type === "lost";

  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: stage.id,
      status: isWon ? "GANHO" : isLost ? "PERDIDO" : "ABERTO",
      ...(isWon ? { wonAt: new Date() } : {}),
      ...(isLost ? { lostAt: new Date() } : {}),
    },
  });
  return stage;
}

/**
 * Garante que existe um deal aberto para o contato. Cria se não existir, na primeira etapa.
 */
export async function ensureDealForContact(opts: { tenantId: string; contactId: string; ownerId: string; title?: string; origin?: string; value?: number }) {
  const exists = await prisma.deal.findFirst({ where: { tenantId: opts.tenantId, contactId: opts.contactId, status: "ABERTO" } });
  if (exists) return exists;
  const pipeline = await prisma.pipeline.findFirst({
    where: { tenantId: opts.tenantId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!pipeline?.stages[0]) return null;
  return prisma.deal.create({
    data: {
      tenantId: opts.tenantId,
      contactId: opts.contactId,
      ownerId: opts.ownerId,
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
      title: opts.title ?? "Lead",
      origin: opts.origin ?? "Manual",
      value: opts.value ?? 0,
    },
  });
}
