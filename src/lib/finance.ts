import { prisma } from "./prisma";

/**
 * Registra um lançamento financeiro a partir de um contrato fechado.
 * Detecta se é recorrente (mensal) ou único pelos itens do deal.
 */
export async function registerContractFinance(opts: {
  tenantId: string;
  contractId: string;
  contactId?: string | null;
  ownerId?: string | null;
  title: string;
  totalValue: number;
  dealId?: string | null;
}) {
  // Evita duplicar se já existir lançamento para o contrato
  const exists = await prisma.financeEntry.findFirst({ where: { tenantId: opts.tenantId, contractId: opts.contractId } });
  if (exists) return exists;

  // Detecta recorrência olhando os itens do deal
  let kind: "UNICO" | "RECORRENTE" = "UNICO";
  let monthlyAmount: number | null = null;
  let durationMonths: number | null = null;

  if (opts.dealId) {
    const items = await prisma.dealItem.findMany({
      where: { dealId: opts.dealId },
      include: { product: true },
    });
    const monthlyItems = items.filter(it => it.product?.billing === "MENSAL");
    if (monthlyItems.length > 0) {
      kind = "RECORRENTE";
      monthlyAmount = monthlyItems.reduce((a, it) => a + Number(it.unitPrice) * it.quantity, 0);
      durationMonths = Math.max(...monthlyItems.map(it => it.product?.durationMonths ?? 12));
    }
  }

  return prisma.financeEntry.create({
    data: {
      tenantId: opts.tenantId,
      kind,
      description: opts.title,
      amount: opts.totalValue,
      contractId: opts.contractId,
      contactId: opts.contactId ?? null,
      ownerId: opts.ownerId ?? null,
      monthlyAmount,
      durationMonths,
      entryDate: new Date(),
      status: "EM_ABERTO",
    },
  });
}
