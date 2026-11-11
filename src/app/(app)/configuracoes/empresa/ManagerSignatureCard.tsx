"use client";
import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eraser, Pen, Save, Upload, X, Type } from "lucide-react";
import { saveManagerSignature } from "./actions";

const SCRIPT_FONTS = [
  { name: "Estilo 1", family: "'Brush Script MT', cursive" },
  { name: "Estilo 2", family: "'Lucida Handwriting', cursive" },
  { name: "Estilo 3", family: "'Segoe Script', cursive" },
  { name: "Estilo 4", family: "'Comic Sans MS', cursive" },
  { name: "Estilo 5", family: "'Pacifico', cursive" },
];

// Renderiza texto numa fonte cursiva em canvas e devolve dataURL
function textToSignatureDataUrl(name: string, family: string): string {
  if (!name) return "";
  const c = document.createElement("canvas");
  c.width = 600; c.height = 150;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0F172A";
  ctx.font = `42px ${family}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(name, c.width / 2, c.height / 2);
  return c.toDataURL("image/png");
}

export function ManagerSignatureCard({ managerSignatureUrl, managerSignerName, managerSignerRole }: {
  managerSignatureUrl: string | null; managerSignerName: string; managerSignerRole: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [signature, setSignature] = useState<string | null>(managerSignatureUrl);
  const [signerName, setSignerName] = useState(managerSignerName);
  const [signerRole, setSignerRole] = useState(managerSignerRole);
  const [drawing, setDrawing] = useState(false);
  const [tab, setTab] = useState<"digitar" | "desenhar" | "upload">("digitar");
  const [typedFont, setTypedFont] = useState(SCRIPT_FONTS[0].family);
  const sigRef = useRef<HTMLCanvasElement>(null);

  // Atualiza a assinatura digitada sempre que mudar nome ou fonte
  useEffect(() => {
    if (tab === "digitar" && signerName) {
      setSignature(textToSignatureDataUrl(signerName, typedFont));
    }
  }, [tab, signerName, typedFont]);

  function pos(e: any, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const t = e.touches?.[0];
    const cx = t ? t.clientX : e.clientX;
    const cy = t ? t.clientY : e.clientY;
    return { x: ((cx - r.left) / r.width) * c.width, y: ((cy - r.top) / r.height) * c.height };
  }
  function startDraw(e: any) {
    setDrawing(true);
    const c = sigRef.current!; const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2; ctx.strokeStyle = "#0F172A"; ctx.lineCap = "round";
    const { x, y } = pos(e, c); ctx.beginPath(); ctx.moveTo(x, y);
  }
  function moveDraw(e: any) {
    if (!drawing) return;
    const c = sigRef.current!; const ctx = c.getContext("2d")!;
    const { x, y } = pos(e, c); ctx.lineTo(x, y); ctx.stroke();
  }
  function endDraw() { setDrawing(false); }
  function clear() {
    const c = sigRef.current; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSignature(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setSignature(String(reader.result));
    reader.readAsDataURL(f);
  }

  function captureFromCanvas() {
    const c = sigRef.current!;
    const dataUrl = c.toDataURL("image/png");
    setSignature(dataUrl);
  }

  function save() {
    let dataUrl = signature;
    if (!dataUrl && sigRef.current) {
      dataUrl = sigRef.current.toDataURL("image/png");
    }
    start(async () => {
      await saveManagerSignature({ signatureBase64: dataUrl ?? "", signerName, signerRole });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Pen className="h-4 w-4 text-[hsl(var(--brand))]" />
          <CardTitle>Assinatura do gestor</CardTitle>
        </div>
        <CardDescription>
          Esta assinatura é anexada automaticamente em todos os contratos gerados, validando a proposta como representante da empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid lg:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider mb-2 block">Pré-visualização</Label>

          {/* Tabs Digitar / Desenhar / Upload */}
          <div className="flex gap-1 border-b mb-3">
            <button type="button" onClick={() => setTab("digitar")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1 border-b-2 -mb-px ${tab==="digitar" ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))] font-medium" : "border-transparent text-muted-foreground"}`}>
              <Type className="h-3 w-3" /> Digitar
            </button>
            <button type="button" onClick={() => setTab("desenhar")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1 border-b-2 -mb-px ${tab==="desenhar" ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))] font-medium" : "border-transparent text-muted-foreground"}`}>
              <Pen className="h-3 w-3" /> Desenhar
            </button>
            <button type="button" onClick={() => setTab("upload")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1 border-b-2 -mb-px ${tab==="upload" ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))] font-medium" : "border-transparent text-muted-foreground"}`}>
              <Upload className="h-3 w-3" /> Subir PNG
            </button>
          </div>

          {tab === "digitar" && (
            <div>
              <div className="border rounded-lg bg-white p-4 flex items-center justify-center min-h-[120px]" style={{ fontFamily: typedFont, fontSize: 38 }}>
                {signerName || "Digite seu nome"}
              </div>
              <div className="mt-2">
                <Label className="text-xs mb-1 block">Estilo da assinatura</Label>
                <div className="flex flex-wrap gap-1">
                  {SCRIPT_FONTS.map(f => (
                    <button key={f.name} type="button" onClick={() => setTypedFont(f.family)}
                      className={`text-xs px-2 py-1 rounded border ${typedFont === f.family ? "border-[hsl(var(--brand))] bg-orange-50" : "border-border hover:bg-muted/30"}`}
                      style={{ fontFamily: f.family }}>
                      {signerName ? signerName.slice(0, 12) : f.name}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">A assinatura digitada usa fonte cursiva e tem validade jurídica conforme MP 2.200-2/2001.</p>
            </div>
          )}

          {tab === "desenhar" && (
            <div className="grid gap-2">
              <div className="border-2 border-dashed border-muted rounded-lg bg-white">
                <canvas
                  ref={sigRef} width={600} height={150}
                  className="w-full h-[150px] touch-none cursor-crosshair"
                  onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                  onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => { sigRef.current?.getContext("2d")!.clearRect(0, 0, sigRef.current!.width, sigRef.current!.height); }}>
                  <Eraser className="h-3 w-3" /> Limpar
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={captureFromCanvas}>
                  <Pen className="h-3 w-3" /> Usar este desenho
                </Button>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="grid gap-2">
              {signature ? (
                <div className="border rounded-lg bg-white p-4 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signature} alt="Assinatura" className="h-24 mx-auto object-contain" />
                  <button type="button" onClick={() => setSignature(null)} className="absolute top-2 right-2 bg-white rounded-full border shadow p-1"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Clique para subir um PNG/JPG</span>
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleUpload} />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome do gestor</Label>
            <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Ex.: Felipe Rodrigues" />
          </div>
          <div className="grid gap-1.5">
            <Label>Cargo</Label>
            <Input value={signerRole} onChange={(e) => setSignerRole(e.target.value)} placeholder="Ex.: Diretor Comercial" />
          </div>
          <Button onClick={save} disabled={pending} className="self-start">
            <Save className="h-4 w-4" /> {pending ? "Salvando..." : "Salvar assinatura"}
          </Button>
          <p className="text-[11px] text-muted-foreground">A assinatura aparece junto com a do cliente no rodapé do contrato em todos os modelos.</p>
        </div>
      </CardContent>
    </Card>
  );
}
