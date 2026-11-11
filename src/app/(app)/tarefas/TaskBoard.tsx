"use client";
import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createTask, setTaskStatus, deleteTask } from "./actions";

export function TaskBoard({ tasks, contacts, users, currentFilter, canSeeAll }: { tasks: any[]; contacts: any[]; users: any[]; currentFilter: string; canSeeAll: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const filters = [
    { k: "minhas", l: "Minhas" },
    ...(canSeeAll ? [{ k: "todas", l: "Todas" }] : []),
    { k: "atrasadas", l: "Atrasadas" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {filters.map(f => (
            <Link key={f.k} href={`/tarefas?filter=${f.k}`}>
              <Button variant={currentFilter === f.k ? "default" : "outline"} size="sm">{f.l}</Button>
            </Link>
          ))}
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova tarefa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Nenhuma tarefa.</div>
          ) : (
            <ul className="divide-y">
              {tasks.map((t: any) => (
                <li key={t.id} className={`flex items-center gap-3 p-4 ${t.status === "CONCLUIDA" ? "opacity-60" : ""}`}>
                  <button
                    onClick={() => start(async () => { await setTaskStatus(t.id, t.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA"); router.refresh(); })}
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${t.status === "CONCLUIDA" ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground"}`}
                  >
                    {t.status === "CONCLUIDA" && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${t.status === "CONCLUIDA" ? "line-through" : ""}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                      {t.dueDate && <span>📅 {formatDate(t.dueDate)}</span>}
                      {t.contact && <span>👤 <Link href={`/contatos/${t.contact.id}`} className="hover:underline">{t.contact.name}</Link></span>}
                      <span>👨‍💼 {t.assignee?.name}</span>
                    </div>
                  </div>
                  <PriorityBadge p={t.priority} />
                  <Badge variant={t.status === "CONCLUIDA" ? "success" : "outline"}>{t.status}</Badge>
                  <button onClick={() => { if (confirm("Excluir tarefa?")) start(async () => { await deleteTask(t.id); router.refresh(); }); }}
                    className="text-muted-foreground hover:text-red-600 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => {
            const r = await createTask(fd);
            if (r?.ok) { setOpen(false); router.refresh(); }
          })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Título *</Label><Input name="title" required /></div>
            <div className="grid gap-1.5"><Label>Descrição</Label>
              <textarea name="description" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Vencimento</Label><Input name="dueDate" type="datetime-local" /></div>
              <div className="grid gap-1.5"><Label>Prioridade</Label>
                <select name="priority" className="h-10 rounded-lg border border-input px-3 text-sm bg-background" defaultValue="media">
                  <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Contato</Label>
                <select name="contactId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                  <option value="">— sem contato —</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5"><Label>Responsável</Label>
                <select name="assigneeId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Criando..." : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PriorityBadge({ p }: { p?: string }) {
  if (p === "alta") return <Badge variant="danger">Alta</Badge>;
  if (p === "baixa") return <Badge variant="secondary">Baixa</Badge>;
  return <Badge variant="warning">Média</Badge>;
}
