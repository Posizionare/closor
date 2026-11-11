"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Printer, MessageCircle, Mail, Send, Copy, CheckCircle2,
  Calendar, FileSignature, ShieldCheck, Pencil, Trash2, Save,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MaskedInput } from "@/components/ui/masked-input";
import { unmaskCurrency } from "@/lib/masks";
import { deleteContract, updateContract } from "../actions";

const STATUS_COLORS: Record<string, any> = {
  RASCUNHO: "outline",
  ENVIADO: "info",
  ASSINADO: "success",
  VIGENTE: "success",
  ENCERRADO: "outline",
  CANCELADO: "danger",
};

export function ContractMirror({ contract, tenant, contact, owner }: any) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(sp.get("edit") === "1");
  const [editTitle, setEditTitle] = useState(contract.title);
  const [editValue, setEditValue] = useState(Number(contract.totalValue ?? 0));
  const [editExpires, setEditExpires] = useState(contract.expiresAt ? String(contract.expiresAt).slice(0, 10) : "");
  const [editStarts, setEditStarts] = useState(contract.startsAt ? String(contract.startsAt).slice(0, 10) : "");
  const [editBody, setEditBody] = useState(contract.body);

  function saveEdit() {
    start(async () => {
      await updateContract(contract.id, {
        title: editTitle, body: editBody,
        startsAt: editStarts || null, expiresAt: editExpires || null,
        totalValue: editValue,
      });
      setEditing(false);
      router.refresh();
    });
  }
  function delConfirm() {
    if (!confirm("Excluir este contrato? Operação irreversível.")) return;
    start(async () => { await deleteContract(contract.id); router.push("/contratos?tab=gerados"); });
  }

  const expiresAt = contract.expiresAt ? new Date(contract.expiresAt) : null;
  const signedAt = contract.signedAt ? new Date(contract.signedAt) : null;
  const startsAt = contract.startsAt ? new Date(contract.startsAt) : null;
  const expired = expiresAt && expiresAt.getTime() < Date.now();
  const signLink = contract.signingToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/assinar/${contract.signingToken}` : null;

  function copy() {
    if (signLink) { navigator.clipboard.writeText(signLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  async function shareWhatsapp() {
    if (!contact?.id || !signLink) return;
    const msg = `Olá ${contact?.name ?? ""}! Segue o contrato para sua assinatura digital: ${signLink}`;
    try {
      const r = await fetch(`/api/contacts/${contact.id}/whatsapp-conversation`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        window.location.href = `/whatsapp?c=${j.id}&prefill=${encodeURIComponent(msg)}`;
      }
    } catch { alert("Não foi possível abrir o WhatsApp interno."); }
  }
  function shareEmail() {
    if (!contact?.email || !signLink) return;
    const subject = `Contrato para assinatura — ${tenant.name}`;
    const body = `Olá ${contact?.name ?? ""},\n\nClique para assinar: ${signLink}\n\n${tenant.name}`;
    window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; }
        }
        .page { width: 210mm; min-height: 297mm; padding: 24mm; background: white; margin: 16px auto; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b py-3 px-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/contratos?tab=gerados")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <div className="font-semibold flex items-center gap-2">
              {contact?.company ?? contact?.name ?? "Contrato"}
              <Badge variant={STATUS_COLORS[contract.status] ?? "outline"} className="text-[10px]">{contract.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {contract.title} {contract.number && <>· {contract.number}</>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {contract.status !== "ASSINADO" && signLink && !editing && (
            <>
              <Button size="sm" variant="outline" onClick={shareWhatsapp} disabled={!contact?.whatsapp}><MessageCircle className="h-3 w-3" /> WhatsApp</Button>
              <Button size="sm" variant="outline" onClick={shareEmail} disabled={!contact?.email}><Mail className="h-3 w-3" /> E-mail</Button>
              <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar link"}</Button>
            </>
          )}
          {!editing && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /> Editar</Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={delConfirm}><Trash2 className="h-3 w-3" /> Excluir</Button>
            </>
          )}
          {editing && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={saveEdit} disabled={pending}><Save className="h-3 w-3" /> {pending ? "Salvando..." : "Salvar"}</Button>
            </>
          )}
          {!editing && <Button size="sm" onClick={() => window.print()}><Printer className="h-3 w-3" /> Imprimir / PDF</Button>}
        </div>
      </div>

      {/* Painel de edição inline */}
      {editing && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm p-5 mb-4">
            <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Pencil className="h-4 w-4 text-orange-600" /> Editando contrato</div>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div className="grid gap-1.5"><Label>Título</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Valor total</Label><MaskedInput mask="currency" defaultValue={editValue} onChange={(e) => setEditValue(unmaskCurrency(e.target.value))} /></div>
              <div className="grid gap-1.5"><Label>Início</Label><Input type="date" value={editStarts} onChange={(e) => setEditStarts(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Vencimento</Label><Input type="date" value={editExpires} onChange={(e) => setEditExpires(e.target.value)} /></div>
            </div>
            <div className="grid gap-1.5">
              <Label>Corpo do contrato</Label>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10}
                className="w-full rounded-lg border border-input px-3 py-2 text-sm font-mono" />
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho de info do contrato */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Info label="Cliente" value={
              <div>
                <div className="font-semibold">{contact?.company ?? contact?.name ?? "—"}</div>
                {contact?.name && contact?.company && <div className="text-xs text-muted-foreground">{contact.name}</div>}
                {contact?.cpfCnpj && <div className="text-[11px] text-muted-foreground">{contact.cpfCnpj}</div>}
              </div>
            } />
            <Info label="Atendente responsável" value={owner?.name ?? "—"} />
            <Info label="Fechamento" value={signedAt ? signedAt.toLocaleDateString("pt-BR") : (startsAt ? startsAt.toLocaleDateString("pt-BR") : "—")} />
            <Info label="Vencimento" value={
              expiresAt ? (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {expiresAt.toLocaleDateString("pt-BR")}
                  {expired && <Badge variant="danger" className="text-[10px] ml-1">Vencido</Badge>}
                </div>
              ) : "—"
            } />
            {contract.totalValue && <Info label="Valor" value={formatCurrency(Number(contract.totalValue))} />}
            {contract.signerName && <Info label="Assinado por" value={contract.signerName} />}
            {contract.signerCpf && <Info label="CPF do signatário" value={contract.signerCpf} />}
            {contract.signerIp && <Info label="IP" value={contract.signerIp} />}
          </div>
        </div>

        {/* Espelho do contrato em folha A4 */}
        <div className="page">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              {tenant.logoUrl
                ? <img src={tenant.logoUrl} alt="" className="h-12 max-w-[200px] object-contain" />
                : <div className="h-12 w-12 rounded-lg flex items-center justify-center text-xl font-bold text-white" style={{ background: tenant.secondaryColor || "#F97316" }}>{tenant.systemName?.[0] ?? "C"}</div>}
              <div>
                <div className="font-bold text-lg">{tenant.legalName ?? tenant.name}</div>
                <div className="text-[11px] text-muted-foreground">CONTRATADA</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">CONTRATANTE</div>
              <div className="font-bold">{contact?.company ?? contact?.name ?? "Cliente"}</div>
              {contact?.cpfCnpj && <div className="text-xs text-muted-foreground">{contact.cpfCnpj}</div>}
            </div>
          </div>

          {expiresAt && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2 mb-4">
              <Calendar className="h-3.5 w-3.5" />
              Vigência até <strong>{expiresAt.toLocaleDateString("pt-BR")}</strong>.
            </div>
          )}

          <h1 className="text-center font-bold text-base mb-4 uppercase">{contract.title}</h1>
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-sans">{contract.body}</pre>

          {/* Assinaturas: gestor (sempre que cadastrada) + cliente */}
          <div className="mt-10 pt-6 border-t">
            <div className="text-xs uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <FileSignature className="h-3 w-3" /> Assinaturas
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gestor (CONTRATADA) */}
              <div className="border-b border-foreground/30 pb-1">
                {tenant.managerSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.managerSignatureUrl} alt="Assinatura do gestor" className="h-20 mx-auto object-contain" />
                ) : (
                  <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground italic">Cadastre a assinatura do gestor em Configurações &gt; Empresa.</div>
                )}
                <div className="text-center text-[11px] mt-1">
                  <div className="font-semibold">{tenant.managerSignerName ?? tenant.legalName ?? tenant.name}</div>
                  <div className="text-muted-foreground">{tenant.managerSignerRole ?? "CONTRATADA"}</div>
                </div>
              </div>
              {/* Cliente (CONTRATANTE) */}
              <div className="border-b border-foreground/30 pb-1">
                {contract.status === "ASSINADO" && contract.signatureBase64 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={contract.signatureBase64} alt="Assinatura do cliente" className="h-20 mx-auto object-contain" />
                    <div className="text-center text-[11px] mt-1">
                      <div className="font-semibold">{contract.signerName ?? "—"}</div>
                      <div className="text-muted-foreground">CONTRATANTE · {signedAt?.toLocaleDateString("pt-BR")}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground italic">Aguardando assinatura do cliente.</div>
                    <div className="text-center text-[11px] mt-1 text-muted-foreground">{contact?.name ?? "CONTRATANTE"}</div>
                  </>
                )}
              </div>
            </div>
            {contract.status === "ASSINADO" && contract.signatureBase64 && (
              <div className="text-[10px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Documento assinado eletronicamente. CPF: {contract.signerCpf ?? "—"} · IP: {contract.signerIp ?? "—"} · Validade conforme MP 2.200-2/2001.
              </div>
            )}
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
