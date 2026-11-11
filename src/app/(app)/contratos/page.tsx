import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractsHub } from "./ContractsHub";

const DEFAULT_BODY = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado:

CONTRATADA: {{nome_empresa}}, inscrita no CNPJ {{cnpj_empresa}}, com sede em {{endereco_empresa}};

E de outro lado:

CONTRATANTE: {{nome_cliente}}, inscrito(a) no CPF/CNPJ {{cpf_cnpj}}, residente em {{endereco_cliente}}, e-mail {{email_cliente}}, telefone {{telefone_cliente}};

Resolvem celebrar o presente contrato, regido pelas seguintes cláusulas:

CLÁUSULA 1ª — OBJETO
A CONTRATADA prestará à CONTRATANTE os seguintes serviços/produtos:
{{produtos}}

CLÁUSULA 2ª — VALOR E PAGAMENTO
O valor total do presente contrato é de {{valor_total}}, com pagamento via {{forma_pagamento}}.

CLÁUSULA 3ª — VIGÊNCIA
O presente contrato entra em vigor na data de assinatura ({{data_emissao}}) e tem validade de {{validade}}.

CLÁUSULA 4ª — DISPOSIÇÕES GERAIS
Eventuais alterações deverão ser firmadas por meio de aditivo contratual.

E, por estarem assim justos e acordados, firmam o presente em via eletrônica.

{{data_emissao}}

____________________________
{{nome_empresa}} (CONTRATADA)

____________________________
{{nome_cliente}} (CONTRATANTE)`;

export default async function ContratosPage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  await requireModule("CONTRATOS");
  const { tenantId } = await getTenant();

  const q = (searchParams.q ?? "").trim();
  const where: any = { tenantId };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { number: { contains: q, mode: "insensitive" } },
      { contact: { name: { contains: q, mode: "insensitive" } } },
      { contact: { company: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [templates, deals, contracts] = await Promise.all([
    prisma.contractTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.deal.findMany({
      where: { tenantId, status: { in: ["ABERTO", "GANHO"] } },
      include: { contact: true },
      orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.contract.findMany({
      where, include: { contact: true, owner: true },
      orderBy: { createdAt: "desc" }, take: 200,
    }),
  ]);

  return (
    <>
      <PageHeader title="Contratos" description="Crie modelos, gere contratos a partir do funil e acompanhe vencimentos." />
      <ContractsHub
        defaultBody={DEFAULT_BODY}
        templates={JSON.parse(JSON.stringify(templates))}
        deals={JSON.parse(JSON.stringify(deals))}
        contracts={JSON.parse(JSON.stringify(contracts))}
        currentTab={searchParams.tab === "gerados" ? "gerados" : "criar"}
        currentQ={q}
      />
    </>
  );
}
