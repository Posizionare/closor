import { notFound } from "next/navigation";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { ContractView } from "./ContractView";
import { formatCurrency, formatDate } from "@/lib/utils";

function fillVars(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, k) => vars[k] ?? "");
}

export default async function GenerateContractPage({ params, searchParams }: { params: { dealId: string }; searchParams: { tpl?: string } }) {
  await requireModule("CONTRATOS");
  const { tenantId } = await getTenant();
  const [deal, tenant, template] = await Promise.all([
    prisma.deal.findFirst({ where: { id: params.dealId, tenantId }, include: { contact: true, items: { include: { product: true } } } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    searchParams.tpl
      ? prisma.contractTemplate.findFirst({ where: { id: searchParams.tpl, tenantId } })
      : prisma.contractTemplate.findFirst({ where: { tenantId, active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!deal || !tenant) notFound();

  const total = deal.items.reduce((a, it) => a + Number(it.unitPrice) * it.quantity - Number(it.discount ?? 0), 0) + Number(deal.value || 0);
  const productsList = deal.items.length === 0
    ? deal.title
    : deal.items.map(it => `- ${it.product?.name ?? "Item"} (${it.quantity}x ${formatCurrency(Number(it.unitPrice))})`).join("\n");

  const vars: Record<string, string> = {
    nome_cliente: deal.contact?.name ?? "—",
    cpf_cnpj: deal.contact?.cpfCnpj ?? "—",
    endereco_cliente: deal.contact?.address ?? "—",
    email_cliente: deal.contact?.email ?? "—",
    telefone_cliente: deal.contact?.phone ?? deal.contact?.whatsapp ?? "—",
    nome_empresa: tenant.legalName ?? tenant.name,
    cnpj_empresa: tenant.cnpj ?? "—",
    endereco_empresa: tenant.address ?? "—",
    valor_total: formatCurrency(total),
    forma_pagamento: "À combinar",
    produtos: productsList,
    data_emissao: formatDate(new Date()),
    validade: "12 (doze) meses",
  };

  const body = template ? fillVars(template.body, vars) : `Crie um modelo de contrato em /contratos antes de gerar.\n\nDados disponíveis:\n${JSON.stringify(vars, null, 2)}`;

  // Vigência padrão: 12 meses
  const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 12);

  return (
    <ContractView
      title={template?.name ?? "Contrato"}
      body={body}
      contact={JSON.parse(JSON.stringify(deal.contact))}
      tenant={JSON.parse(JSON.stringify(tenant))}
      dealId={deal.id}
      expiresAt={expiresAt.toISOString()}
      totalValue={total}
      contactLogoUrl={(deal.contact as any)?.logoUrl ?? null}
    />
  );
}
