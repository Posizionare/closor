"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createProduct, updateProduct, deleteProduct, toggleProduct } from "./actions";
import { useRouter } from "next/navigation";

const PMS = [
  { v: "PIX", l: "Pix" },
  { v: "BOLETO", l: "Boleto" },
  { v: "CARTAO", l: "Cartão" },
  { v: "AVISTA", l: "À vista" },
];

export function ProductList({ products }: { products: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(p: any) { setEditing(p); setOpen(true); }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>Catálogo</CardTitle>
            <CardDescription>Use o produto em propostas, contratos e oportunidades do funil.</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo produto</Button>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Nenhum produto cadastrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
              {products.map(p => (
                <div key={p.id} className="rounded-xl border bg-card p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.category && <div className="text-xs text-muted-foreground">{p.category}</div>}
                    </div>
                    <Badge variant={p.active ? "success" : "outline"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="text-xl font-semibold">{formatCurrency(Number(p.price))}</div>
                  <div className="flex flex-wrap gap-1">
                    {p.billing === "MENSAL" && <Badge variant="info">Mensal · {p.durationMonths ?? "?"} meses</Badge>}
                    {p.billing !== "MENSAL" && p.installments && <Badge variant="info">{p.maxInstallments}x</Badge>}
                    {p.paymentMethods?.map((m: string) => <Badge key={m} variant="secondary">{m}</Badge>)}
                    {p.commission && <Badge variant="warning">Comissão {p.commission}%</Badge>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Edit2 className="h-3 w-3" /> Editar</Button>
                    <Switch checked={p.active} onCheckedChange={(v) => start(async () => { await toggleProduct(p.id, v); router.refresh(); })} />
                    <span className="text-xs text-muted-foreground self-center">{p.active ? "Disponível" : "Oculto"}</span>
                    <Button variant="ghost" size="sm" className="ml-auto text-red-600" onClick={() => {
                      if (!confirm(`Excluir "${p.name}"?`)) return;
                      start(async () => { await deleteProduct(p.id); router.refresh(); });
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? `Editar: ${editing.name}` : "Novo produto"}</DialogTitle></DialogHeader>
          <ProductForm key={editing?.id ?? "new"} editing={editing} pms={PMS} onSubmit={async (fd) => {
            const r = editing ? await updateProduct(editing.id, fd) : await createProduct(fd);
            if (r?.ok) { setOpen(false); router.refresh(); }
          }} pending={pending} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductForm({ editing, pms, onSubmit, pending, onCancel }: any) {
  const [billing, setBilling] = useState<string>(editing?.billing ?? "UNICO");
  return (
    <form action={(fd) => onSubmit(fd)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="grid gap-1.5 md:col-span-2"><Label>Nome *</Label><Input name="name" defaultValue={editing?.name} required /></div>
      <div className="grid gap-1.5"><Label>Categoria</Label><Input name="category" defaultValue={editing?.category ?? ""} /></div>
      <div className="grid gap-1.5"><Label>Preço (R$) *</Label><Input name="price" type="number" step="0.01" defaultValue={editing?.price ?? 0} required /></div>

      <div className="md:col-span-2 grid gap-2 border rounded-lg p-3 bg-muted/20">
        <div className="grid gap-1.5">
          <Label>Tipo de cobrança</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setBilling("UNICO")}
              className={`flex-1 rounded-lg border p-3 text-left transition-colors ${billing === "UNICO" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
              <div className="font-medium text-sm">Pagamento único</div>
              <div className="text-xs text-muted-foreground">Produto ou serviço pago uma vez (com ou sem parcelas).</div>
            </button>
            <button type="button" onClick={() => setBilling("MENSAL")}
              className={`flex-1 rounded-lg border p-3 text-left transition-colors ${billing === "MENSAL" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
              <div className="font-medium text-sm">Mensalidade</div>
              <div className="text-xs text-muted-foreground">Cobrança recorrente com prazo de contrato.</div>
            </button>
          </div>
          <input type="hidden" name="billing" value={billing} />
        </div>
        {billing === "MENSAL" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="grid gap-1.5">
              <Label>Prazo do serviço (meses) *</Label>
              <Input name="durationMonths" type="number" min="1" max="120" defaultValue={editing?.durationMonths ?? 12} required />
            </div>
            <div className="text-xs text-muted-foreground self-end pb-2">
              Ex.: 12 = 12 mensalidades; 24 = 2 anos.
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-1.5 md:col-span-2"><Label>Descrição</Label>
        <textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className="rounded-lg border border-input px-3 py-2 text-sm"/>
      </div>
      <div className="grid gap-1.5 md:col-span-2"><Label>URL da imagem</Label><Input name="imageUrl" defaultValue={editing?.imageUrl ?? ""} placeholder="https://..." /></div>
      <div className="grid gap-1.5"><Label>Desconto máximo (%)</Label><Input name="maxDiscount" type="number" step="0.01" defaultValue={editing?.maxDiscount ?? ""} /></div>
      <div className="grid gap-1.5"><Label>Comissão do vendedor (%)</Label><Input name="commission" type="number" step="0.01" defaultValue={editing?.commission ?? ""} /></div>

      {billing === "UNICO" && (
        <div className="md:col-span-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="installments" defaultChecked={editing?.installments} /> Permite parcelamento</label>
          <div className="flex items-center gap-2 text-sm"><Label>Máx. parcelas</Label><Input name="maxInstallments" type="number" min="1" max="48" defaultValue={editing?.maxInstallments ?? 12} className="w-20 h-8" /></div>
        </div>
      )}

      <div className="md:col-span-2">
        <Label>Formas de pagamento</Label>
        <div className="flex gap-3 flex-wrap mt-2">
          {pms.map((pm: any) => (
            <label key={pm.v} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`pm_${pm.v}`} defaultChecked={editing?.paymentMethods?.includes(pm.v)} /> {pm.l}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 md:col-span-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Produto ativo
      </label>
      <DialogFooter className="md:col-span-2 mt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}
