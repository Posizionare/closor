"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/ui/masked-input";
import { Printer, MessageCircle, Mail, Pen, Eraser, CheckCircle2, Calendar, Send, Copy } from "lucide-react";
import { prepareContractForSigning } from "../../actions";

export function ContractView({ title, body, contact, tenant, dealId, expiresAt, totalValue, contactLogoUrl }: {
  title: string; body: string; contact: any; tenant: any; dealId?: string;
  expiresAt?: string | null; totalValue?: number | null; contactLogoUrl?: string | null;
}) {
  const sigRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState(contact?.name ?? "");
  const [signerCpf, setSignerCpf] = useState(contact?.cpfCnpj ?? "");

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setDrawing(true);
    const c = sigRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2; ctx.strokeStyle = "#0F172A"; ctx.lineCap = "round";
    const { x, y } = pos(e, c);
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const c = sigRef.current!;
    const ctx = c.getContext("2d")!;
    const { x, y } = pos(e, c);
    ctx.lineTo(x, y); ctx.stroke();
  }
  function endDraw() { setDrawing(false); }
  function clearSig() {
    const c = sigRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  }
  function pos(e: any, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const t = e.touches?.[0];
    const cx = t ? t.clientX : e.clientX;
    const cy = t ? t.clientY : e.clientY;
    return { x: ((cx - r.left) / r.width) * c.width, y: ((cy - r.top) / r.height) * c.height };
  }

  async function confirmSignature() {
    const c = sigRef.current!;
    const dataUrl = c.toDataURL("image/png");
    if (!dealId) { alert("Assinatura registrada localmente."); setSigned(true); return; }
    const fd = new FormData();
    fd.set("signerName", signerName);
    fd.set("signerCpf", signerCpf);
    fd.set("signatureBase64", dataUrl);
    fd.set("body", body);
    fd.set("title", title);
    fd.set("dealId", dealId);
    if (totalValue != null) fd.set("totalValue", String(totalValue));
    if (expiresAt) fd.set("expiresAt", expiresAt);
    const r = await fetch("/api/contracts/sign", { method: "POST", body: fd });
    if (r.ok) setSigned(true);
    else alert("Falha ao registrar assinatura.");
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

      <div className="no-print sticky top-0 z-10 bg-white border-b py-3 px-6 flex items-center justify-between">
        <div className="font-semibold">{title} — {contact?.name ?? "Cliente"}</div>
        <div className="flex gap-2 flex-wrap">
          <SendForSignatureButton dealId={dealId!} title={title} body={body} expiresAt={expiresAt ?? null} totalValue={totalValue ?? 0} contact={contact} tenant={tenant} />
          <Button variant="outline" onClick={() => {
            const email = contact?.email ?? "";
            const subject = `Contrato — ${tenant.name}`;
            const bodyText = `Olá ${contact?.name ?? ""},\n\nSegue contrato: ${window.location.href}\n\n${tenant.name}`;
            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`);
          }}><Mail className="h-4 w-4" /> E-mail</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
        </div>
      </div>

      <div className="page">
        {/* Cabeçalho com logo da CONTRATADA + logo do CLIENTE */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt="" className="h-12 max-w-[200px] object-contain" />
              : <div className="h-12 w-12 rounded-lg flex items-center justify-center text-xl font-bold text-white" style={{ background: tenant.secondaryColor || "#F97316" }}>{tenant.systemName?.[0] ?? "C"}</div>
            }
            <div>
              <div className="font-bold text-lg">{tenant.legalName ?? tenant.name}</div>
              <div className="text-[11px] text-muted-foreground">CONTRATADA</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">CONTRATANTE</div>
            <div className="flex items-center gap-2 justify-end">
              <div>
                <div className="font-bold">{contact?.company ?? contact?.name ?? "Cliente"}</div>
                {contact?.cpfCnpj && <div className="text-xs text-muted-foreground">{contact.cpfCnpj}</div>}
              </div>
              {contactLogoUrl
                ? <img src={contactLogoUrl} alt="" className="h-12 max-w-[120px] object-contain" />
                : <div className="h-12 w-12 rounded-lg border-2 border-dashed border-muted flex items-center justify-center text-muted-foreground font-bold">{(contact?.company ?? contact?.name ?? "C")[0]}</div>
              }
            </div>
          </div>
        </div>

        {/* Banner de vencimento */}
        {expiresAt && (
          <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2 mb-4">
            <Calendar className="h-3.5 w-3.5" />
            Vigência até <strong>{new Date(expiresAt).toLocaleDateString("pt-BR")}</strong>. O sistema avisará automaticamente o gestor 30, 15 e 7 dias antes do vencimento.
          </div>
        )}

        <h1 className="text-center font-bold text-base mb-4 uppercase">{title}</h1>
        <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-sans">{body}</pre>

        {/* Bloco de assinatura digital */}
        <div className="mt-10 pt-6 border-t">
          <div className="text-xs uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <Pen className="h-3 w-3" /> Assinatura digital do CONTRATANTE
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="grid gap-1.5"><Label className="text-xs">Nome completo</Label><Input value={signerName} onChange={(e) => setSignerName(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">CPF / CNPJ</Label><MaskedInput mask="cpfcnpj" defaultValue={signerCpf} onChange={(e) => setSignerCpf(e.target.value)} /></div>
          </div>
          <div className="border-2 border-dashed border-muted rounded-lg bg-white">
            <canvas
              ref={sigRef} width={600} height={150}
              className="w-full h-[150px] touch-none cursor-crosshair"
              onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center justify-between mt-2 no-print">
            <Button variant="outline" size="sm" onClick={clearSig}><Eraser className="h-3 w-3" /> Limpar</Button>
            {signed ? (
              <span className="flex items-center gap-2 text-sm text-emerald-700 font-medium"><CheckCircle2 className="h-4 w-4" /> Assinado em {new Date().toLocaleString("pt-BR")}</span>
            ) : (
              <Button onClick={confirmSignature}><CheckCircle2 className="h-4 w-4" /> Confirmar assinatura</Button>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-3">
            Ao confirmar, você concorda com os termos deste contrato. A assinatura é registrada com data, IP e identificador único, conforme MP 2.200-2/2001.
          </div>
        </div>
      </div>
    </div>
  );
}

function SendForSignatureButton({ dealId, title, body, expiresAt, totalValue, contact, tenant }: any) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    const r = await prepareContractForSigning({ dealId, title, body, expiresAt, totalValue });
    setPending(false);
    if (r?.url) {
      const fullUrl = `${window.location.origin}${r.url}`;
      setGenerated(fullUrl);
      setContractId(r.id);
    } else alert("Não foi possível gerar o link.");
  }

  async function shareWhatsapp() {
    if (!contact?.id) return;
    const msg = `Olá ${contact?.name ?? ""}! Segue o contrato para sua assinatura digital: ${generated}`;
    // Cria/encontra conversa interna e navega
    try {
      const r = await fetch(`/api/contacts/${contact.id}/whatsapp-conversation`, { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        window.location.href = `/whatsapp?c=${j.id}&prefill=${encodeURIComponent(msg)}`;
      }
    } catch {
      alert("Não foi possível abrir o WhatsApp interno.");
    }
  }
  function shareEmail() {
    const email = contact?.email ?? "";
    const subject = `Contrato para assinatura — ${tenant.name}`;
    const bodyText = `Olá ${contact?.name ?? ""},\n\nClique no link abaixo para assinar digitalmente o contrato:\n${generated}\n\n${tenant.name}`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`);
  }
  function copy() { if (generated) { navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 2000); } }

  if (generated) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 flex-wrap">
        <span className="text-xs text-emerald-800">Link gerado · contrato salvo em <strong>Contratos gerados</strong></span>
        <Button size="sm" variant="outline" onClick={shareWhatsapp}><MessageCircle className="h-3 w-3" /> WhatsApp</Button>
        <Button size="sm" variant="outline" onClick={shareEmail}><Mail className="h-3 w-3" /> E-mail</Button>
        <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /> {copied ? "Copiado!" : "Copiar"}</Button>
        {contractId && (
          <a href={`/contratos/${contractId}`}>
            <Button size="sm"><Send className="h-3 w-3" /> Abrir contrato</Button>
          </a>
        )}
      </div>
    );
  }
  return (
    <Button onClick={generate} disabled={pending}>
      <Send className="h-4 w-4" /> {pending ? "Gerando..." : "Enviar para assinatura"}
    </Button>
  );
}
