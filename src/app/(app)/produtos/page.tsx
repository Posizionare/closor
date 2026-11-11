import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductList } from "./ProductList";
import { formatCurrency } from "@/lib/utils";

export default async function ProductsPage() {
  await requireModule("PRODUTOS");
  const { tenantId } = await getTenant();
  const products = await prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  const totalValue = products.reduce((a, p) => a + Number(p.price), 0);
  return (
    <>
      <PageHeader title="Produtos" description="Catálogo usado em propostas, contratos e funil." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Produtos cadastrados" value={products.length.toString()} />
        <Stat label="Ativos" value={products.filter(p => p.active).length.toString()} />
        <Stat label="Valor total do catálogo" value={formatCurrency(totalValue)} />
      </div>
      <ProductList products={JSON.parse(JSON.stringify(products))} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </CardContent></Card>
  );
}
