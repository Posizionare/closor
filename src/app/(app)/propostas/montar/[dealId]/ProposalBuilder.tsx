"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MaskedInput } from "@/components/ui/masked-input";
import { Plus, Trash2, Eye, Save, Send } from "lucide-react";
import { unmaskCurrency } from "@/lib/masks";
import { formatCurrency } from "@/lib/utils";
import { saveDealItems, sendProposalForAccept } from "../../actions";

type Item = { id?: string; productId?: string; name: string; description?: string; quantity: number; unitPrice: number; discount: number; billing?: "UNICO" | "MENSAL"; durationMonths?: number; paymentDay?: number };

export function ProposalBuilder({ deal, products, templates }: { deal: any; products: any[]; templates: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<Item[]>(
    (deal.items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      name: it.product?.name ?? "Item personalizado",
      description: it.product?.description ?? "",
      quantity: it.quantity ?? 1,
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount ?? 0),
      billing: it.product?.billing ?? "UNICO",
      durationMonths: it.product?.durationMonths ?? undefined,
      paymentDay: 5,
    })),
  );
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [notes, setNotes] = useState<string>(deal.notes ?? "");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [acceptLink, setAcceptLink] = useState<string | null>(null);

  const subtotal = items.reduce((a, it) => a + it.quantity * it.unitPrice, 0);
  const discount = items.reduce((a, it) => a + it.discount, 0);
  const total = Math.max(0, subtotal - discount);

  function addProduct(productId: string) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    setItems(prev => [...prev, {
      productId: p.id, name: p.name, description: p.description ?? "",
      quantity: 1, unitPrice: Number(p.price ?? 0), discount: 0,
      billing: p.billing ?? "UNICO", durationMonths: p.durationMonths ?? undefined, paymentDay: 5,
    }]);
  }
  function addCustom() {
    setItems(prev => [...prev, { name: "Serviço personalizado", description: "", quantity: 1, unitPrice: 0, discount: 0, billing: "UNICO", paymentDay: 5 }]);
  }
  function update(i: number, patch: Partial<Item>) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function remove(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  function save(redirect: "preview" | null) {
    start(async () => {
      const r = await saveDealItems(deal.id, {
        items: items.map(it => ({
          productId: it.productId, quantity: it.quantity,
          unitPrice: it.unitPrice, discount: it.discount,
          customName: it.name, customDescription: it.description,
        })),
        notes,
      });
      if (r?.ok) {
        if (redirect === "preview") {
          router.push(`/propostas/gerar/${deal.id}${templateId ? `?tpl=${templateId}` : ""}`);
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Itens da proposta</CardTitle>
              <CardDescription>Adicione produtos do catálogo ou crie itens personalizados.</CardDescription>
            </div>
            <div className="flex gap-1">
              <select className="h-9 rounded-lg border border-input px-2 text-sm" defaultValue=""
                onChange={(e) => { if (e.target.value) { addProduct(e.target.value); e.target.value = ""; } }}>
                <option value="">+ Adicionar do catálogo</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price ?? 0))}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={addCustom}><Plus className="h-3 w-3" /> Item personalizado</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum item ainda. Adicione algo do catálogo ou um item personalizado.</div>
          ) : (
            <div className="divide-y">
              {items.map((it, i) => (
                <div key={i} className="p-4 grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Item</Label>
                    <Input value={it.name} onChange={(e) => update(i, { name: e.target.value })} />
                    <textarea
                      value={it.description ?? ""} onChange={(e) => update(i, { description: e.target.value })}
                      placeholder="Descrição opcional" rows={2}
                      className="w-full mt-1 rounded-lg border border-input px-3 py-1 text-xs bg-background"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Qtd</Label>
                    <Input type="number" min="1" value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) || 1 })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Unitário</Label>
                    <MaskedInput mask="currency" defaultValue={it.unitPrice}
                      onChange={(e) => update(i, { unitPrice: unmaskCurrency(e.target.value) })} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Desconto</Label>
                    <MaskedInput mask="currency" defaultValue={it.discount}
                      onChange={(e) => update(i, { discount: unmaskCurrency(e.target.value) })} />
                  </div>
                  <div className="col-span-12 md:col-span-2 flex md:flex-col items-end justify-between">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
                      <div className="font-semibold">{formatCurrency(it.quantity * it.unitPrice - it.discount)}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Modelo</CardTitle></CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum modelo ativo. Crie um em <strong>Propostas</strong>.</p>
            ) : (
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-10 w-full rounded-lg border border-input px-3 text-sm">
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row label="Descontos" value={`- ${formatCurrency(discount)}`} className="text-red-600" />
            <div className="border-t pt-2 mt-2 flex items-center justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-emerald-700">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Validade da proposta</CardTitle></CardHeader>
          <CardContent>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Notas internas — não saem na proposta enviada ao cliente."
              className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={() => save(null)} className="flex-1"><Save className="h-3 w-3" /> Salvar</Button>
            <Button variant="outline" disabled={pending} onClick={() => save("preview")} className="flex-1"><Eye className="h-3 w-3" /> Visualizar</Button>
          </div>
          <Button disabled={pending} onClick={async () => {
            await save(null);
            const r = await sendProposalForAccept({
              dealId: deal.id,
              title: deal.title,
              totalValue: total,
              validUntil,
              itemsSnapshot: items.map(it => ({
                name: it.name, description: it.description, quantity: it.quantity,
                unitPrice: it.unitPrice, discount: it.discount,
                billing: it.billing ?? "UNICO", durationMonths: it.durationMonths,
                paymentDay: it.paymentDay ?? 5,
              })),
            });
            if (r?.url) {
              setAcceptLink(`${window.location.origin}${r.url}`);
            }
          }} className="w-full">
            <Send className="h-4 w-4" /> Enviar para aceite do cliente
          </Button>
          {acceptLink && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
              <div className="font-medium text-emerald-800 mb-1">Link de aceite gerado:</div>
              <div className="break-all text-emerald-700 mb-2">{acceptLink}</div>
              <div className="flex gap-1 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(acceptLink)}>Copiar</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const phone = deal.contact?.whatsapp?.replace(/\D/g, "");
                  if (!phone) return;
                  const msg = `Olá ${deal.contact?.name ?? ""}! Sua proposta está pronta. Acesse e aceite: ${acceptLink}`;
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                }}>WhatsApp</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
