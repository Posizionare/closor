"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/ui/masked-input";
import { CheckCircle2, Eraser, Pen, ShieldCheck, Type } from "lucide-react";

const SCRIPT_FONTS = [
  { name: "Estilo 1", family: "'Brush Script MT', cursive" },
  { name: "Estilo 2", family: "'Lucida Handwriting', cursive" },
  { name: "Estilo 3", family: "'Segoe Script', cursive" },
  { name: "Estilo 4", family: "'Comic Sans MS', cursive" },
  { name: "Estilo 5", family: "'Pacifico', cursive" },
];

function textToSignatureDataUrl(name: string, family: string): string {
  if (!name) return "";
  const c = document.createElement("canvas");
  c.width = 700; c.height = 180;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0F172A";
  ctx.font = `48px ${family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(name, c.width / 2, c.height / 2);
  return c.toDataURL("image/png");
}

export function ClientSignView({ contract, contact, tenant, ownerName }: any) {
  const sigRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(contract.status === "ASSINADO");
  const [signerName, setSignerName] = useState(contract.signerName ?? contact?.name ?? "");
  const [signerCpf, setSignerCpf] = useState(contract.signerCpf ?? contact?.cpfCnpj ?? "");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"digitar" | "desenhar">("digitar");
  const [typedFont, setTypedFont] = useState(SCRIPT_FONTS[0].family);

  function pos(e: any, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const t = e.touches?.[0];
    const cx = t ? t.clientX : e.clientX;
    const cy = t ? t.clientY : e.clientY;
    return { x: ((cx - r.left) / r.width) * c.width, y: ((cy - r.top) / r.height) * c.height };
  }
  function startDraw(e: any) {
    setDrawing(true);
    const c = sigRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2; ctx.strokeStyle = "#0F172A"; ctx.lineCap = "round";
    const { x, y } = pos(e, c); ctx.beginPath(); ctx.moveTo(x, y);
  }
  function moveDraw(e: any) {
    if (!drawing) return;
    const c = sigRef.current!;
    const ctx = c.getContext("2d")!;
    const { x, y } = pos(e, c); ctx.lineTo(x, y); ctx.stroke();
  }
  function endDraw() { setDrawing(false); }
  function clearSig() {
    const c = sigRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  async function submit() {
    if (!signerName.trim()) { alert("Informe seu nome completo."); return; }
    if (!agreed) { alert("Você precisa aceitar os termos."); return; }
    setSubmitting(true);
    // Se aba "digitar" estiver ativa, gera dataURL a partir da fonte; senão pega do canvas
    const dataUrl = tab === "digitar"
      ? textToSignatureDataUrl(signerName, typedFont)
      : sigRef.current!.toDataURL("image/png");
    const fd = new FormData();
    fd.set("signerName", signerName);
    fd.set("signerCpf", signerCpf);
    fd.set("signatureBase64", dataUrl);
    fd.set("token", contract.signingToken);
    const r = await fetch("/api/contracts/sign-public", { method: "POST", body: fd });
    setSubmitting(false);
    if (r.ok) setSigned(true);
    else alert("Falha ao registrar assinatura. Tente novamente.");
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-8 border border-emerald-200">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Contrato assinado!</h1>
          <p className="text-muted-foreground text-sm">
            Você acabou de assinar <strong>{contract.title}</strong>. {ownerName ?? "Seu atendente"} já foi notificado e em instantes recebe seu contrato com a sua assinatura registrada.
          </p>
          <div className="mt-5 text-left bg-muted/30 rounded-lg p-3 text-xs space-y-1">
            <div><strong>Signatário:</strong> {signerName}</div>
            {signerCpf && <div><strong>CPF/CNPJ:</strong> {signerCpf}</div>}
            <div><strong>Data:</strong> {new Date().toLocaleString("pt-BR")}</div>
            <div className="text-emerald-700">Validade jurídica conforme MP 2.200-2/2001.</div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{tenant.legalName ?? tenant.name}</p>
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

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Você está assinando</div>
          <h1 className="text-2xl font-bold mt-1">{contract.title}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {contract.totalValue && <>Valor: <strong>{Number(contract.totalValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> · </>}
            {contract.expiresAt && <>Vigência até: <strong>{new Date(contract.expiresAt).toLocaleDateString("pt-BR")}</strong></>}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Enviado por: {ownerName ?? "Atendente"} ({tenant.email ?? "—"})
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Conteúdo do contrato</h2>
          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-sans max-h-[420px] overflow-y-auto p-3 rounded border bg-muted/20">{contract.body}</pre>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Pen className="h-4 w-4" /> Sua assinatura</h2>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="grid gap-1.5"><Label className="text-xs">Nome completo *</Label><Input value={signerName} onChange={(e) => setSignerName(e.target.value)} required /></div>
            <div className="grid gap-1.5"><Label className="text-xs">CPF / CNPJ</Label><MaskedInput mask="cpfcnpj" defaultValue={signerCpf} onChange={(e) => setSignerCpf(e.target.value)} /></div>
          </div>
          {/* Tabs Digitar/Desenhar */}
          <div className="flex gap-1 border-b mb-3">
            <button type="button" onClick={() => setTab("digitar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 border-b-2 -mb-px ${tab === "digitar" ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>
              <Type className="h-3.5 w-3.5" /> Digitar
            </button>
            <button type="button" onClick={() => setTab("desenhar")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 border-b-2 -mb-px ${tab === "desenhar" ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>
              <Pen className="h-3.5 w-3.5" /> Desenhar
            </button>
          </div>

          {tab === "digitar" ? (
            <div>
              <div className="border rounded-lg bg-white p-6 flex items-center justify-center min-h-[140px]" style={{ fontFamily: typedFont, fontSize: 44 }}>
                {signerName || "Digite seu nome acima"}
              </div>
              <div className="mt-3">
                <Label className="text-xs mb-1 block">Estilo da assinatura</Label>
                <div className="flex flex-wrap gap-1">
                  {SCRIPT_FONTS.map(f => (
                    <button key={f.name} type="button" onClick={() => setTypedFont(f.family)}
                      className={`text-sm px-3 py-1.5 rounded border ${typedFont === f.family ? "border-foreground bg-muted/40" : "border-border hover:bg-muted/30"}`}
                      style={{ fontFamily: f.family }}>
                      {signerName ? signerName.slice(0, 14) : f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-muted rounded-lg bg-white">
                <canvas
                  ref={sigRef} width={800} height={180}
                  className="w-full h-[180px] touch-none cursor-crosshair"
                  onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <Button variant="outline" size="sm" onClick={clearSig}><Eraser className="h-3 w-3" /> Limpar</Button>
                <span className="text-[11px] text-muted-foreground">Use o dedo ou mouse para assinar dentro da caixa.</span>
              </div>
            </>
          )}

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>Li e concordo com os termos do contrato. Compreendo que esta assinatura tem validade jurídica conforme MP 2.200-2/2001 e será registrada com data, hora e endereço IP.</span>
          </label>

          <Button onClick={submit} disabled={submitting || !agreed} className="w-full mt-4 h-12 text-base">
            <CheckCircle2 className="h-5 w-5" /> {submitting ? "Registrando..." : "Assinar contrato"}
          </Button>
        </div>
      </div>
    </div>
  );
}
