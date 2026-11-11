"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";

function fmtBRL(v: any) { const n = Number(v ?? 0); return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function ClientAcceptView({ proposal, contact, tenant, template, ownerName }: any) {
  const primary = template?.primaryColor ?? tenant?.secondaryColor ?? "#F97316";
  const [acceptedBy, setAcceptedBy] = useState(contact?.name ?? "");
  const [done, setDone] = useState<null | "ACEITA" | "RECUSADA">(
    proposal.status === "ACEITA" ? "ACEITA" : proposal.status === "RECUSADA" ? "RECUSADA" : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const items: any[] = Array.isArray(proposal.itemsSnapshot) ? proposal.itemsSnapshot : [];

  async function submit(action: "accept" | "reject") {
    if (action === "accept" && !acceptedBy.trim()) { alert("Informe seu nome."); return; }
    setSubmitting(true);
    const fd = new FormData();
    fd.set("token", proposal.acceptToken);
    fd.set("action", action);
    if (action === "accept") fd.set("acceptedBy", acceptedBy);
    if (action === "reject") fd.set("note", reason);
    const r = await fetch("/api/proposals/accept", { method: "POST", body: fd });
    setSubmitting(false);
    if (r.ok) setDone(action === "accept" ? "ACEITA" : "RECUSADA");
    else alert("Erro ao enviar resposta. Tente novamente.");
  }

  if (done === "ACEITA") {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-8 border border-emerald-200">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Proposta aceita!</h1>
          <p className="text-muted-foreground text-sm">
            Sua aceitação foi registrada. {ownerName ?? "Seu atendente"} já foi notificado e seguirá com a formalização.
          </p>
          <p className="text-xs text-muted-foreground mt-4">{tenant.legalName ?? tenant.name}</p>
        </div>
      </div>
    );
  }
  if (done === "RECUSADA") {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-8 border">
          <ThumbsDown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Resposta enviada</h1>
          <p className="text-muted-foreground text-sm">Obrigado pelo retorno. {ownerName ?? "Seu atendente"} recebeu sua mensagem.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt="" className="h-7" />
              : <div className="h-7 w-7 rounded flex items-center justify-center text-white font-bold text-xs" style={{ background: tenant.secondaryColor || "#F97316" }}>{tenant.systemName?.[0] ?? "C"}</div>}
            <span className="font-semibold text-sm">{tenant.legalName ?? tenant.name}</span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Conexão segura</span>
        </div>
      </div>

      {/* Capa do modelo de orçamento */}
      <div className="relative" style={{ background: primary }}>
        {template?.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={template.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="relative max-w-3xl mx-auto px-4 py-10 text-white">
          <div className="text-xs uppercase tracking-[0.2em] opacity-80">Proposta comercial</div>
          <h1 className="text-3xl font-bold mt-1">{proposal.title}</h1>
          <div className="text-sm mt-2 opacity-90">
            Para {contact?.name ?? "—"}
            {proposal.number && <> · {proposal.number}</>}
            {proposal.validUntil && <> · Validade {new Date(proposal.validUntil).toLocaleDateString("pt-BR")}</>}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Proposta enviada para você</div>
          <h1 className="text-2xl font-bold mt-1">{proposal.title}</h1>
          {proposal.number && <div className="text-xs text-muted-foreground mt-1">{proposal.number}</div>}
          <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-[10px] uppercase text-muted-foreground">Cliente</div><div className="font-medium">{contact?.name ?? "—"}</div></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Validade</div><div className="font-medium">{proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString("pt-BR") : "—"}</div></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Atendente</div><div className="font-medium">{ownerName ?? "—"}</div></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Itens incluídos</h2>
          <div className="divide-y">
            {items.length === 0 ? (
              <div className="py-3 text-sm text-muted-foreground">Sem itens detalhados.</div>
            ) : items.map((it: any, i: number) => (
              <div key={i} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{it.name} {it.billing === "MENSAL" && <span className="text-xs text-muted-foreground">(mensal · {it.durationMonths} meses)</span>}</div>
                  {it.description && <div className="text-xs text-muted-foreground whitespace-pre-line mt-1">{it.description}</div>}
                </div>
                <div className="text-right text-sm">
                  <div>{it.quantity}× {fmtBRL(it.unitPrice)}{it.billing === "MENSAL" && "/mês"}</div>
                  {it.discount > 0 && <div className="text-[10px] text-muted-foreground">desc. {fmtBRL(it.discount)}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor total</span>
            <span className="text-2xl font-bold text-emerald-700">{fmtBRL(proposal.totalValue)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">Sua resposta</h2>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Seu nome (responsável pelo aceite)</Label>
              <Input value={acceptedBy} onChange={(e) => setAcceptedBy(e.target.value)} placeholder="Como você gostaria de ser identificado(a)" />
            </div>
            {!showReject ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowReject(true)}><ThumbsDown className="h-4 w-4" /> Recusar</Button>
                <Button className="h-12 text-base" disabled={submitting} onClick={() => submit("accept")}>
                  <ThumbsUp className="h-5 w-5" /> {submitting ? "Enviando..." : "Aceitar proposta"}
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Motivo (opcional)</Label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                  className="rounded-lg border border-input px-3 py-2 text-sm" placeholder="Conte para o atendente o motivo da recusa..." />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReject(false)}>Voltar</Button>
                  <Button variant="destructive" disabled={submitting} onClick={() => submit("reject")}>
                    {submitting ? "Enviando..." : "Confirmar recusa"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Ao aceitar, sua resposta é registrada com data, hora e endereço IP. Validade conforme MP 2.200-2/2001.</p>
        </div>
      </div>
    </div>
  );
}
