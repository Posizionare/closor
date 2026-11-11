"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createContractTemplate, updateContractTemplate, deleteContractTemplate } from "./actions";

const VARS = [
  "{{nome_cliente}}", "{{cpf_cnpj}}", "{{endereco_cliente}}", "{{email_cliente}}", "{{telefone_cliente}}",
  "{{nome_empresa}}", "{{cnpj_empresa}}", "{{endereco_empresa}}",
  "{{valor_total}}", "{{forma_pagamento}}", "{{produtos}}", "{{data_emissao}}", "{{validade}}",
];

export function ContractTemplates({ templates, defaultBody }: { templates: any[]; defaultBody: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");

  function openNew() { setEditing(null); setBody(defaultBody); setOpen(true); }
  function openEdit(t: any) { setEditing(t); setBody(t.body); setOpen(true); }

  function insertVar(v: string) {
    setBody(b => b + v);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Modelos de contrato</CardTitle>
            <CardDescription>Use variáveis para preencher dados do cliente, empresa, valor.</CardDescription>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="h-3 w-3" /> Novo modelo</Button>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum modelo. Crie o primeiro.</div>
          ) : (
            <ul className="divide-y">
              {templates.map(t => (
                <li key={t.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.body.length} caracteres</div>
                  </div>
                  <div className="flex gap-1">
                    {t.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Excluir?")) start(async () => { await deleteContractTemplate(t.id); router.refresh(); }); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => {
            fd.set("body", body);
            const r = editing ? await updateContractTemplate(editing.id, fd) : await createContractTemplate(fd);
            if (r?.ok) { setOpen(false); router.refresh(); }
          })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nome</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div>
              <Label>Inserir variável:</Label>
              <div className="flex gap-1 flex-wrap mt-1">
                {VARS.map(v => <button key={v} type="button" onClick={() => insertVar(v)} className="text-[11px] px-2 py-1 rounded border hover:bg-muted">{v}</button>)}
              </div>
            </div>
            <div className="grid gap-1.5"><Label>Texto do contrato</Label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="rounded-lg border border-input p-3 text-xs font-mono whitespace-pre" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Ativo</label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
