"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, GitBranch, Workflow } from "lucide-react";
import { createAutomation, deleteAutomation } from "./actions";

export function AutomationsPanel({ automations }: { automations: any[]; sectors: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [layout, setLayout] = useState<"esteira" | "fluxograma">("fluxograma");

  function submit() {
    if (!name.trim()) return;
    start(async () => {
      const r = await createAutomation(name.trim(), layout);
      if (r?.id) router.push(`/agente-chat/automacao/${r.id}`);
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>Automações de fluxo</CardTitle>
            <CardDescription>Monte uma árvore de interação visual: o cliente responde algo, vai para outro caminho.</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova automação</Button>
        </CardHeader>
        <CardContent className="p-0">
          {automations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma automação ainda. Clique em <strong>Nova automação</strong> para começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
              {automations.map(a => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {a.layout === "fluxograma" ? <GitBranch className="h-4 w-4 text-[hsl(var(--brand))]" /> : <Workflow className="h-4 w-4 text-[hsl(var(--brand))]" />}
                        <span className="font-semibold">{a.name}</span>
                      </div>
                      <Badge variant={a.active ? "success" : "outline"}>{a.active ? "Ativa" : "Pausada"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {a.layout === "fluxograma" ? "Fluxograma com ramificações" : "Esteira sequencial"} ·
                      {" "}{(a.nodes as any[]).length} passos · {(a.edges as any[]).length} ligações
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/agente-chat/automacao/${a.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full"><Edit2 className="h-3 w-3" /> Editar</Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => {
                        if (!confirm(`Excluir automação "${a.name}"?`)) return;
                        start(async () => { await deleteAutomation(a.id); router.refresh(); });
                      }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova automação</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome da automação *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Qualificação inicial WhatsApp" />
              <p className="text-xs text-muted-foreground">Use um nome que identifique facilmente o objetivo (ex.: "Pré-venda imóvel", "Suporte 1º atendimento").</p>
            </div>
            <div>
              <Label>Formato</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setLayout("esteira")}
                  className={`rounded-lg border p-3 text-left transition-colors ${layout === "esteira" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-2 font-medium text-sm"><Workflow className="h-4 w-4" /> Esteira</div>
                  <div className="text-xs text-muted-foreground mt-1">Sequência linear: passo 1 → passo 2 → passo 3.</div>
                </button>
                <button type="button" onClick={() => setLayout("fluxograma")}
                  className={`rounded-lg border p-3 text-left transition-colors ${layout === "fluxograma" ? "border-[hsl(var(--brand))] bg-orange-50/40" : "hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-2 font-medium text-sm"><GitBranch className="h-4 w-4" /> Fluxograma</div>
                  <div className="text-xs text-muted-foreground mt-1">Árvore com ramificações conforme a resposta do cliente.</div>
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={pending || !name.trim()}>{pending ? "Criando..." : "Criar e abrir editor"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
