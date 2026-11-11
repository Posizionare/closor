"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Eye, Upload, X } from "lucide-react";
import { createProposalTemplate, updateProposalTemplate, deleteProposalTemplate } from "./actions";

// Todas as imagens da proposta usam folha A4 (210x297mm). Recomendado 150 DPI.
const A4_SIZE = "1240×1754 px (formato A4 retrato a 150 DPI)";
const COVER_SIZE = A4_SIZE;
const CLOSING_SIZE = A4_SIZE;

export function ProposalTemplates({ templates }: { templates: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  // Estado controlado dos uploads
  const [coverDataUrl, setCoverDataUrl] = useState<string>("");
  const [closingImages, setClosingImages] = useState<string[]>([]);
  const [closingCount, setClosingCount] = useState<number>(1);

  function openNew() {
    setEditing(null);
    setCoverDataUrl("");
    setClosingImages([]);
    setClosingCount(1);
    setOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    setCoverDataUrl(t.coverUrl ?? "");
    const ci = (t.closingImages ? JSON.parse(t.closingImages) : (t.closingUrl ? [t.closingUrl] : [])) as string[];
    setClosingImages(ci);
    setClosingCount(ci.length || 1);
    setOpen(true);
  }

  function readFile(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverDataUrl(await readFile(f));
  }
  async function handleClosingUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const data = await readFile(f);
    setClosingImages(prev => {
      const next = [...prev];
      next[idx] = data;
      return next;
    });
  }

  function changeClosingCount(n: number) {
    setClosingCount(n);
    setClosingImages(prev => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push("");
      return next;
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Modelos</CardTitle>
            <CardDescription>Personalize cores, capa, condições, validade — formato A4.</CardDescription>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="h-3 w-3" /> Novo modelo</Button>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum modelo. Crie o primeiro.</div>
          ) : (
            <ul className="divide-y">
              {templates.map(t => (
                <li key={t.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded" style={{ background: t.primaryColor }} />
                      <span className="font-medium">{t.name}</span>
                      {t.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">Validade: {t.validityDays} dias · A4</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setPreviewing(t)} title="Visualizar"><Eye className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Excluir modelo?")) start(async () => { await deleteProposalTemplate(t.id); router.refresh(); }); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          <form action={(fd) => {
            fd.set("coverUrl", coverDataUrl);
            fd.set("closingImages", JSON.stringify(closingImages.filter(Boolean)));
            // mantém compatibilidade com closingUrl (primeira imagem)
            fd.set("closingUrl", closingImages[0] ?? "");
            start(async () => {
              const r = editing ? await updateProposalTemplate(editing.id, fd) : await createProposalTemplate(fd);
              if (r?.ok) { setOpen(false); router.refresh(); }
            });
          }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1.5 md:col-span-2"><Label>Nome do modelo</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div className="grid gap-1.5"><Label>Cor primária</Label><Input name="primaryColor" type="color" defaultValue={editing?.primaryColor ?? "#F97316"} /></div>
            <div className="grid gap-1.5"><Label>Validade (dias)</Label><Input name="validityDays" type="number" defaultValue={editing?.validityDays ?? 15} /></div>

            <div className="md:col-span-2 grid gap-2 border rounded-lg p-3 bg-muted/20">
              <Label className="flex items-center gap-2">
                Capa da proposta
                <Badge variant="outline" className="font-normal text-[10px]">Recomendado: {COVER_SIZE}</Badge>
              </Label>
              <div className="flex items-center gap-3">
                {coverDataUrl ? (
                  <div className="relative">
                    <img src={coverDataUrl} alt="capa" className="h-32 w-24 object-cover rounded border" />
                    <button type="button" onClick={() => setCoverDataUrl("")} className="absolute -top-2 -right-2 bg-white rounded-full border shadow"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <label className="h-32 w-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Subir imagem</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">A capa ocupa página inteira A4. Use proporção 1:1.41 (formato retrato).</p>
              </div>
            </div>

            <div className="md:col-span-2 grid gap-2 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Imagens de encerramento
                  <Badge variant="outline" className="font-normal text-[10px]">Recomendado: {CLOSING_SIZE}</Badge>
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Quantidade:</span>
                  <select className="h-8 rounded border border-input px-2 text-xs" value={closingCount} onChange={(e) => changeClosingCount(Number(e.target.value))}>
                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {closingCount === 0 ? (
                <p className="text-xs text-muted-foreground">Sem imagens de encerramento.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Array.from({ length: closingCount }).map((_, i) => (
                    <div key={i}>
                      {closingImages[i] ? (
                        <div className="relative">
                          <img src={closingImages[i]} alt="" className="h-24 w-full object-cover rounded border" />
                          <button type="button" onClick={() => setClosingImages(prev => prev.map((p, j) => j === i ? "" : p))} className="absolute -top-2 -right-2 bg-white rounded-full border shadow"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <label className="h-24 w-full border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30">
                          <Upload className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground mt-1">Imagem {i + 1}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleClosingUpload(i, e)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-1.5 md:col-span-2"><Label>Texto institucional</Label>
              <textarea name="institutionalText" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" defaultValue={editing?.institutionalText ?? ""} />
            </div>
            <div className="grid gap-1.5 md:col-span-2"><Label>Termos comerciais</Label>
              <textarea name="commercialTerms" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" defaultValue={editing?.commercialTerms ?? ""} />
            </div>
            <div className="grid gap-1.5 md:col-span-2"><Label>Rodapé</Label><Input name="footer" defaultValue={editing?.footer ?? ""} /></div>

            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Modelo ativo
            </label>
            <DialogFooter className="md:col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b"><DialogTitle>Pré-visualização — {previewing?.name}</DialogTitle></DialogHeader>
          {previewing && <ProposalMockup template={previewing} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProposalMockup({ template }: { template: any }) {
  const closing = (template.closingImages ? JSON.parse(template.closingImages) : (template.closingUrl ? [template.closingUrl] : [])) as string[];
  const color = template.primaryColor ?? "#F97316";
  return (
    <div className="bg-[#F8FAFC] p-4 grid gap-4">
      {/* Capa A4 */}
      <Page>
        <div className="h-full w-full relative" style={{ background: color }}>
          {template.coverUrl && <img src={template.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0" />
          <div className="absolute bottom-12 left-10 right-10 text-white">
            <div className="text-sm uppercase tracking-widest opacity-80">Proposta Comercial</div>
            <div className="text-4xl font-bold mt-2">{template.name}</div>
            <div className="mt-4 text-sm opacity-80">Validade {template.validityDays} dias</div>
          </div>
        </div>
      </Page>

      {/* Página institucional */}
      <Page>
        <div className="p-10 text-sm leading-relaxed">
          <div className="h-1 w-12" style={{ background: color }} />
          <h2 className="text-2xl font-bold mt-3 mb-4">Sobre nós</h2>
          <p className="whitespace-pre-wrap">{template.institutionalText || "Texto institucional do modelo."}</p>
        </div>
      </Page>

      {/* Termos */}
      <Page>
        <div className="p-10 text-sm leading-relaxed">
          <div className="h-1 w-12" style={{ background: color }} />
          <h2 className="text-2xl font-bold mt-3 mb-4">Termos comerciais</h2>
          <p className="whitespace-pre-wrap">{template.commercialTerms || "Termos comerciais."}</p>
        </div>
      </Page>

      {/* Imagens de encerramento */}
      {closing.length > 0 && (
        <Page>
          <div className="p-10 grid gap-3 grid-cols-1">
            <div className="h-1 w-12" style={{ background: color }} />
            <h2 className="text-2xl font-bold">Encerramento</h2>
            <div className={`grid gap-3 ${closing.length === 1 ? "grid-cols-1" : closing.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
              {closing.filter(Boolean).map((src, i) => (
                <img key={i} src={src} alt="" className="w-full rounded object-cover" style={{ height: closing.length === 1 ? 360 : 200 }} />
              ))}
            </div>
            {template.footer && <p className="text-center text-xs text-muted-foreground mt-4">{template.footer}</p>}
          </div>
        </Page>
      )}
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  // 210x297mm em pixels = 794x1123 (96dpi)
  return (
    <div className="mx-auto bg-white shadow-sm" style={{ width: 595, height: 842, overflow: "hidden", borderRadius: 4 }}>
      {children}
    </div>
  );
}
