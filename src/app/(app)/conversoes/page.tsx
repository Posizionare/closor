import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConversionPanel } from "./ConversionPanel";
import { formatCurrency } from "@/lib/utils";

export default async function ConversoesPage() {
  await requireModule("CONVERSOES");
  const { tenantId } = await getTenant();
  const [statuses, integrations, deals, contacts] = await Promise.all([
    prisma.conversionStatus.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.integration.findMany({ where: { tenantId, provider: { in: ["meta_ads", "google_ads"] } } }),
    prisma.deal.findMany({ where: { tenantId, status: "GANHO" }, select: { origin: true, value: true } }),
    prisma.contact.groupBy({ by: ["origin"], where: { tenantId }, _count: true }),
  ]);

  // Métricas por origem
  const wonByOrigin: Record<string, { count: number; value: number }> = {};
  deals.forEach(d => {
    const k = d.origin ?? "Manual";
    if (!wonByOrigin[k]) wonByOrigin[k] = { count: 0, value: 0 };
    wonByOrigin[k].count++; wonByOrigin[k].value += Number(d.value);
  });
  const meta = integrations.find(i => i.provider === "meta_ads");
  const google = integrations.find(i => i.provider === "google_ads");

  return (
    <>
      <PageHeader title="Conversões" description="Rastreamento de conversões e ROI por canal." />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        {Object.entries(wonByOrigin).map(([origin, m]) => (
          <Card key={origin}><CardContent className="p-5">
            <div className="text-xs text-muted-foreground">{origin}</div>
            <div className="text-xl font-semibold mt-1">{m.count} ganhos</div>
            <div className="text-sm text-emerald-600 mt-0.5">{formatCurrency(m.value)}</div>
          </CardContent></Card>
        ))}
        {Object.keys(wonByOrigin).length === 0 && (
          <Card className="lg:col-span-4"><CardContent className="p-8 text-center text-sm text-muted-foreground">Sem conversões ganhas ainda. Marque oportunidades como "Ganho" no funil para acompanhar aqui.</CardContent></Card>
        )}
      </div>

      <ConversionPanel
        statuses={JSON.parse(JSON.stringify(statuses))}
        meta={meta ? JSON.parse(JSON.stringify(meta)) : null}
        google={google ? JSON.parse(JSON.stringify(google)) : null}
      />
    </>
  );
}
