"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Mail, Copy, ThumbsUp, ThumbsDown, Send, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, any> = {
  RASCUNHO: "outline",
  ENVIADA: "info",
  ACEITA: "success",
  RECUSADA: "danger",
  EXPIRADA: "outline",
};

export function ProposalMirror({ proposal, contact, tenant, owner }: any) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const items: any[] = Array.isArray(proposal.itemsSnapshot) ? proposal.itemsSnapshot : [];
  const acceptLink = proposal.acceptToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/aceitar/${proposal.acceptToken}` : null;

  function copy() { if (acceptLink) { navigator.clipboard.writeText(acceptLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } }
  async function shareWhatsapp() {
    if (!contact?.id || !acceptLink) return;
    const msg = `Olá ${contact?.name ?? ""}! Sua proposta ${proposal.title} está pronta. Acesse e aceite por aqui: ${acceptLink}`;
    try {
      const r = await fetch(`/api/contacts/${contact.id}/whatsapp-conversation`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        window.location.href = `/whatsapp?c=${j.id}&prefill=${encodeURIComponent(msg)}`;
      }
    } catch { alert("Não foi possível abrir o WhatsApp interno."); }
  }
  function shareEmail() {
    if (!contact?.email || !acceptLink) return;
    const subject = `Proposta ${proposal.number ?? ""} — ${tenant.name}`;
    const body = `Olá ${contact?.name ?? ""},\n\nSua proposta está pronta. Clique para visualizar e aceitar:\n${acceptLink}\n\n${tenant.name}`;
    window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="bg-white border-b sticky top-0 z-10 py-3 px-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/propostas?tab=enviadas")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <div className="font-semibold flex items-center gap-2">
              {contact?.company ?? contact?.name ?? "Proposta"}
              <Badge variant={STATUS_COLORS[proposal.status] ?? "outline"} className="text-[10px]">
                {proposal.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {proposal.title} {proposal.number && <>· {proposal.number}</>}
            </div>
          </div>
        </div>
        {proposal.status === "ENVIADA" && acceptLink && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={shareWhatsapp} disabled={!contact?.whatsapp}><MessageCircle className="h-3 w-3" /> WhatsApp</Button>
            <Button size="sm" variant="outline" onClick={shareEmail} disabled={!contact?.email}><Mail className="h-3 w-3" /> E-mail</Button>
            <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar link"}</Button>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Info label="Cliente" value={
              <div>
                <div className="font-semibold">{contact?.company ?? contact?.name ?? "—"}</div>
                {contact?.name && contact?.company && <div className="text-xs text-muted-foreground">{contact.name}</div>}
              </div>
            } />
            <Info label="Atendente" value={owner?.name ?? "—"} />
            <Info label="Enviado em" value={new Date(proposal.createdAt).toLocaleDateString("pt-BR")} />
            <Info label="Validade" value={proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("pt-BR") : "—"} />
            {proposal.acceptedAt && <Info label="Aceita em" value={new Date(proposal.acceptedAt).toLocaleString("pt-BR")} />}
            {proposal.acceptedBy && <Info label="Aceita por" value={proposal.acceptedBy} />}
            {proposal.acceptedIp && <Info label="IP" value={proposal.acceptedIp} />}
            {proposal.rejectedAt && <Info label="Recusada em" value={new Date(proposal.rejectedAt).toLocaleString("pt-BR")} />}
            {proposal.rejectionNote && <Info label="Motivo" value={proposal.rejectionNote} />}
          </div>
          {proposal.status === "ACEITA" && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Proposta aceita. O deal foi automaticamente movido para <strong>Ganho</strong> e contou na meta/comissão do atendente.
            </div>
          )}
          {proposal.status === "RECUSADA" && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-center gap-2">
              <ThumbsDown className="h-4 w-4" /> Cliente recusou esta proposta.
            </div>
          )}
          {proposal.status === "ENVIADA" && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
              <Send className="h-4 w-4" /> Aguardando o cliente acessar o link e aceitar.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Itens enviados</h3>
          <div className="divide-y">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground py-3">Sem itens detalhados.</div>
            ) : items.map((it: any, i: number) => (
              <div key={i} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{it.name} {it.billing === "MENSAL" && <Badge variant="info" className="ml-1 text-[10px]">Mensal · {it.durationMonths}m</Badge>}</div>
                  {it.description && <div className="text-xs text-muted-foreground whitespace-pre-line mt-1">{it.description}</div>}
                </div>
                <div className="text-right text-sm">
                  <div>{it.quantity}× {formatCurrency(Number(it.unitPrice))}{it.billing === "MENSAL" && "/mês"}</div>
                  {it.discount > 0 && <div className="text-[10px] text-muted-foreground">desc. {formatCurrency(Number(it.discount))}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor total</span>
            <span className="text-2xl font-bold text-emerald-700">{proposal.totalValue ? formatCurrency(Number(proposal.totalValue)) : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
