"use client";
import { useState, useTransition, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, MessageCircle, Trophy, X, ArrowRight, FileText, ScrollText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createDeal, moveDeal, deleteDeal } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stage = { id: string; name: string; order: number; type: string; color?: string };
type Deal = { id: string; title: string; value: any; status: string; origin?: string; stageId: string;
  contact?: { id: string; name: string; company?: string; whatsapp?: string } | null;
  owner?: { id: string; name: string } | null;
};

export function Kanban({ stages, deals: initial, contacts, users }: { stages: Stage[]; deals: Deal[]; contacts: any[]; users: any[] }) {
  const router = useRouter();
  const [deals, setDeals] = useState(initial);
  const [open, setOpen] = useState(false);
  const [recentWon, setRecentWon] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const grouped = useMemo(() => {
    const m: Record<string, Deal[]> = {};
    stages.forEach(s => m[s.id] = []);
    deals.forEach(d => { if (m[d.stageId]) m[d.stageId].push(d); });
    return m;
  }, [stages, deals]);

  function move(dealId: string, toStageId: string) {
    const target = stages.find(s => s.id === toStageId);
    if (!target) return;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stageId: toStageId, status: target.type === "won" ? "GANHO" : target.type === "lost" ? "PERDIDO" : "ABERTO" } : d));
    if (target.type === "won") {
      setRecentWon(dealId);
      setTimeout(() => setRecentWon(null), 2800);
    }
    start(async () => {
      await moveDeal(dealId, toStageId);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-between mb-3">
        <div className="text-sm text-muted-foreground">{deals.length} oportunidade(s) · {formatCurrency(deals.filter(d => d.status === "GANHO").reduce((a, b) => a + Number(b.value || 0), 0))} ganhos</div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova oportunidade</Button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {stages.map(stage => {
            const stageDeals = grouped[stage.id] ?? [];
            const total = stageDeals.reduce((a, b) => a + Number(b.value || 0), 0);
            const isOver = overStage === stage.id;
            return (
              <div
                key={stage.id}
                className="w-[290px] shrink-0 rounded-xl border bg-[#F8FAFC] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: stage.color ?? "#94A3B8" }} />
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                  <Badge variant="outline">{stageDeals.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">{formatCurrency(total)}</div>
                <div className="flex flex-col gap-2 min-h-[40px]">
                  {stageDeals.map(d => (
                    <DealCard
                      key={d.id} deal={d} stages={stages}
                      onMove={(to) => move(d.id, to)}
                      won={recentWon === d.id}
                      dragging={draggingId === d.id}
                      onDragStart={() => setDraggingId(d.id)}
                      onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className={`text-xs text-center py-6 rounded-md border-2 border-dashed ${isOver ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-muted text-muted-foreground"}`}>
                      {isOver ? "Solte aqui" : "Vazio"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
          <NewDealForm
            contacts={contacts}
            users={users}
            onCreated={() => { setOpen(false); router.refresh(); }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DealCard({ deal, stages, onMove, won, dragging, onDragStart, onDragEnd }: {
  deal: Deal; stages: Stage[]; onMove: (to: string) => void; won: boolean;
  dragging?: boolean; onDragStart?: () => void; onDragEnd?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showMove, setShowMove] = useState(false);

  return (
    <div
      className={`rounded-lg bg-white border p-3 hover:shadow-sm transition-all ${won ? "animate-won border-emerald-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{deal.title}</div>
          {deal.contact && <Link href={`/contatos/${deal.contact.id}`} className="text-xs text-muted-foreground hover:underline truncate block">{deal.contact.name}{deal.contact.company ? ` · ${deal.contact.company}` : ""}</Link>}
        </div>
        <Badge variant={deal.status === "GANHO" ? "success" : deal.status === "PERDIDO" ? "danger" : "outline"} className="shrink-0">
          {deal.status === "ABERTO" ? "Aberto" : deal.status === "GANHO" ? "Ganho" : "Perdido"}
        </Badge>
      </div>
      <div className="mt-2 text-base font-semibold text-emerald-700">{formatCurrency(Number(deal.value || 0))}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex h-4 w-4 rounded-full bg-orange-100 text-orange-700 items-center justify-center text-[9px] font-bold uppercase">
          {(deal.owner?.name?.[0] ?? "?").toUpperCase()}
        </span>
        <span className="truncate"><strong className="text-foreground">{deal.owner?.name ?? "Sem responsável"}</strong></span>
      </div>
      {deal.origin && <Badge variant="info" className="mt-2">{deal.origin}</Badge>}
      <div className="mt-3 flex flex-wrap gap-1">
        {deal.contact?.id && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs w-full justify-center" title="Abrir conversa interna" onClick={() => {
            start(async () => {
              const r = await fetch(`/api/contacts/${deal.contact!.id}/whatsapp-conversation`, { method: "POST" });
              if (r.ok) { const j = await r.json(); router.push(`/whatsapp?c=${j.id}`); }
            });
          }}><MessageCircle className="h-3 w-3" /> Abrir conversa</Button>
        )}
      </div>
      {false && showMove && (
        <div className="mt-2 grid grid-cols-1 gap-1 border-t pt-2">
          {stages.filter(s => s.id !== deal.stageId).map(s => (
            <button key={s.id} className="text-left text-xs px-2 py-1 rounded hover:bg-muted flex items-center gap-2"
              onClick={() => { setShowMove(false); onMove(s.id); }}>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color ?? "#94A3B8" }} />
              {s.name}
              {s.type === "won" && <Trophy className="h-3 w-3 text-emerald-600 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { MaskedInput } from "@/components/ui/masked-input";
import { unmaskCurrency } from "@/lib/masks";

const ORIGINS_FUNIL = ["Manual", "Site", "WhatsApp", "Evento", "Google Ads", "Meta Ads", "Instagram", "TikTok", "YouTube", "Orgânico", "Indicação"];

function NewDealForm({ contacts, users, onCreated, onCancel }: { contacts: any[]; users: any[]; onCreated: () => void; onCancel: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const valueRaw = String(fd.get("value") ?? "");
    fd.set("value", String(unmaskCurrency(valueRaw)));
    start(async () => {
      const r = await createDeal(fd);
      if (r?.error) setError(r.error);
      else if (r?.ok) onCreated();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1.5"><Label>Título *</Label><Input name="title" required placeholder="Ex.: Plano Pro - 5 usuários" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label>Valor estimado (R$)</Label><MaskedInput mask="currency" name="value" placeholder="0,00" /></div>
        <div className="grid gap-1.5"><Label>Origem</Label>
          <select name="origin" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
            {ORIGINS_FUNIL.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Contato</Label>
        <select name="contactId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
          <option value="">— sem contato —</option>
          {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Responsável</Label>
        <select name="ownerId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="grid gap-1.5"><Label>Notas</Label>
        <textarea name="notes" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar"}</Button>
      </DialogFooter>
    </form>
  );
}
