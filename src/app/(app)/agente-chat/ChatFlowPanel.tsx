"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Bot } from "lucide-react";
import { saveFlow, deleteFlow } from "./actions";

const ACTIONS = [
  { v: "", l: "Nenhuma" },
  { v: "create_lead", l: "Criar lead no funil" },
  { v: "move_stage", l: "Mover etapa do funil" },
  { v: "assign_sector", l: "Direcionar para setor" },
  { v: "create_task", l: "Criar tarefa" },
];

export function ChatFlowPanel({ flows, sectors }: { flows: any[]; sectors: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(f: any) { setEditing(f); setOpen(true); }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>Exemplo de fluxo padrão</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-3">{`Olá, {{nome_cliente}}! Como podemos ajudar?

1 - Financeiro
2 - Comercial
3 - Suporte
4 - Falar com atendente

[Cliente digita 1] → Direciona para setor Financeiro + cria tarefa
[Cliente digita 2] → Direciona para Comercial + cria lead no funil
[Cliente digita 3] → Direciona para Suporte`}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Variáveis disponíveis</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-1 font-mono text-xs">
              <li><code>{"{{nome_cliente}}"}</code> — Nome do contato</li>
              <li><code>{"{{nome_empresa}}"}</code> — Nome da sua empresa</li>
              <li><code>{"{{horario}}"}</code> — Horário atual</li>
              <li><code>{"{{atendente}}"}</code> — Nome do responsável</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">As variáveis são substituídas automaticamente nas respostas e mensagens fora do horário.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fluxos automáticos</CardTitle>
            <CardDescription>Cada fluxo dispara por palavra-chave ou no início da conversa.</CardDescription>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="h-3 w-3" /> Novo fluxo</Button>
        </CardHeader>
        <CardContent className="p-0">
          {flows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhum fluxo configurado. Crie o primeiro.</div>
          ) : (
            <ul className="divide-y">
              {flows.map(f => (
                <li key={f.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{f.name}</span>
                      {f.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Gatilho: <Badge variant="info">{f.trigger}</Badge>
                      {f.keyword && <> · Palavra: <code>{f.keyword}</code></>}
                      {f.action && <> · Ação: {ACTIONS.find(a => a.v === f.action)?.l}</>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(f)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Excluir fluxo?")) start(async () => { await deleteFlow(f.id); router.refresh(); }); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar fluxo" : "Novo fluxo"}</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => {
            if (editing) fd.set("id", editing.id);
            const r = await saveFlow(fd);
            if (r?.ok) { setOpen(false); router.refresh(); }
          })} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1.5 md:col-span-2"><Label>Nome do fluxo</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div className="grid gap-1.5"><Label>Tipo de gatilho</Label>
              <select name="trigger" defaultValue={editing?.trigger ?? "keyword"} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                <option value="default">Início da conversa (boas-vindas)</option>
                <option value="keyword">Palavra-chave</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Palavra-chave</Label><Input name="keyword" defaultValue={editing?.keyword ?? ""} placeholder="comercial, suporte, 1, 2..." /></div>
            <div className="grid gap-1.5 md:col-span-2"><Label>Resposta automática</Label>
              <textarea name="response" rows={4} defaultValue={editing?.response ?? ""} className="rounded-lg border border-input px-3 py-2 text-sm" placeholder="Olá {{nome_cliente}}! ..." />
            </div>
            <div className="grid gap-1.5"><Label>Ação</Label>
              <select name="action" defaultValue={editing?.action ?? ""} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                {ACTIONS.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Setor responsável</Label>
              <select name="sectorId" defaultValue={editing?.sectorId ?? ""} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                <option value="">— nenhum —</option>
                {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 md:col-span-2 border-t pt-3">
              <div className="grid gap-1.5"><Label>Início do atendimento</Label><Input name="workingHoursStart" type="time" defaultValue={editing?.workingHoursStart ?? "09:00"} /></div>
              <div className="grid gap-1.5"><Label>Fim do atendimento</Label><Input name="workingHoursEnd" type="time" defaultValue={editing?.workingHoursEnd ?? "18:00"} /></div>
            </div>
            <div className="grid gap-1.5 md:col-span-2"><Label>Mensagem fora do horário</Label>
              <textarea name="outOfHoursMessage" rows={2} defaultValue={editing?.outOfHoursMessage ?? ""} className="rounded-lg border border-input px-3 py-2 text-sm" placeholder="Olá! Nosso horário de atendimento é..." />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Fluxo ativo</label>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
