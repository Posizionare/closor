import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { IntegrationGrid } from "./IntegrationGrid";

const INTEGRATIONS = [
  { provider: "whatsapp", name: "WhatsApp API", description: "Envie e receba mensagens via Cloud API.", category: "Atendimento", color: "#25D366" },
  { provider: "meta_ads", name: "Meta Ads", description: "Pixel + Conversions API.", category: "Mídia", color: "#1877F2" },
  { provider: "google_ads", name: "Google Ads", description: "Importação de conversões offline.", category: "Mídia", color: "#4285F4" },
  { provider: "google_calendar", name: "Google Agenda", description: "Sincronizar reuniões com a agenda do responsável.", category: "Agenda", color: "#4285F4" },
  { provider: "google_meet", name: "Google Meet", description: "Gerar link de reunião automático.", category: "Agenda", color: "#00897B" },
  { provider: "instagram", name: "Instagram", description: "Métricas e conversas do Instagram.", category: "Redes Sociais", color: "#E4405F" },
  { provider: "youtube", name: "YouTube", description: "Métricas do canal e leads.", category: "Redes Sociais", color: "#FF0000" },
  { provider: "tiktok", name: "TikTok", description: "Métricas do perfil e tráfego.", category: "Redes Sociais", color: "#000000" },
  { provider: "smtp", name: "SMTP / E-mail", description: "Envio de propostas e notificações.", category: "Comunicação", color: "#94A3B8" },
  { provider: "webhook", name: "Webhooks", description: "Receba eventos do sistema em uma URL.", category: "API", color: "#475569" },
];

export default async function IntegracoesPage() {
  await requireModule("INTEGRACOES");
  const { tenantId } = await getTenant();
  const integrations = await prisma.integration.findMany({ where: { tenantId } });
  const map = Object.fromEntries(integrations.map(i => [i.provider, i]));

  return (
    <>
      <PageHeader title="Integrações" description="Conecte as ferramentas externas do seu negócio." />
      <IntegrationGrid items={INTEGRATIONS} state={JSON.parse(JSON.stringify(map))} />
    </>
  );
}
