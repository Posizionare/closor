"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, FilePlus, Search, Eye, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { ProposalTemplates } from "./ProposalTemplates";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, any> = {
  RASCUNHO: "outline",
  ENVIADA: "info",
  ACEITA: "success",
  RECUSADA: "danger",
  EXPIRADA: "outline",
};

export function ProposalsHub({ templates, deals, proposals, currentTab, currentQ }: {
  templates: any[]; deals: any[]; proposals: any[]; currentTab: "criar" | "enviadas"; currentQ: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(currentQ);
  const [openPicker, setOpenPicker] = useState(false);

  function setTab(t: "criar" | "enviadas") {
    const u = new URLSearchParams(sp.toString());
    u.set("tab", t);
    router.push(`/propostas?${u.toString()}`);
  }
  function applySearch() {
    const u = new URLSearchParams(sp.toString());
    u.set("tab", "enviadas");
    if (search) u.set("q", search); else u.delete("q");
    router.push(`/propostas?${u.toString()}`);
  }

  return (
    <>
      <div className="flex gap-1 border-b mb-4">
        <TabButton active={currentTab === "criar"} onClick={() => setTab("criar")} icon={FilePlus} label="Criar proposta" />
        <TabButton active={currentTab === "enviadas"} onClick={() => setTab("enviadas")} icon={FileText} label="Propostas enviadas" count={proposals.length} />
      </div>

      {currentTab === "criar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          <ProposalTemplates templates={templates} />
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Nova proposta</CardTitle>
              <CardDescription>Selecione uma oportunidade do funil para montar a proposta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setOpenPicker(true)}>
                <FilePlus className="h-4 w-4" /> Montar proposta
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">Após enviar para aceite, a proposta aparece em <strong>Propostas enviadas</strong>.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>Propostas enviadas</CardTitle>
                <CardDescription>Acompanhe quais clientes aceitaram, recusaram ou ainda não responderam.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                    placeholder="Buscar por cliente, empresa, número..." className="pl-9" />
                </div>
                <Button variant="outline" onClick={applySearch}>Buscar</Button>
                <Button onClick={() => setOpenPicker(true)}><FilePlus className="h-3 w-3" /> Nova</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {proposals.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {currentQ ? `Nenhuma proposta encontrada para "${currentQ}".` : "Nenhuma proposta enviada ainda."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Cliente / Empresa</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Título</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Enviado em</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Validade</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                      <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/10">
                        <td className="p-3">
                          <div className="font-medium">{p.contact?.company ?? p.contact?.name ?? "—"}</div>
                          {p.contact?.name && p.contact?.company && <div className="text-xs text-muted-foreground">{p.contact.name}</div>}
                          {p.number && <div className="text-[10px] text-muted-foreground">{p.number}</div>}
                        </td>
                        <td className="p-3 text-xs">{p.title}</td>
                        <td className="p-3 text-xs">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3 text-xs">{p.validUntil ? new Date(p.validUntil).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="p-3 text-right text-xs font-medium">{p.totalValue ? formatCurrency(Number(p.totalValue)) : "—"}</td>
                        <td className="p-3 text-center">
                          <Badge variant={STATUS_COLORS[p.status] ?? "outline"} className="text-[10px]">
                            {p.status === "ACEITA" && <ThumbsUp className="h-2.5 w-2.5" />}
                            {p.status === "RECUSADA" && <ThumbsDown className="h-2.5 w-2.5" />}
                            {p.status === "ENVIADA" && <Send className="h-2.5 w-2.5" />}
                            {p.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/propostas/${p.id}`}>
                            <Button variant="outline" size="sm"><Eye className="h-3 w-3" /> Visualizar</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={openPicker} onOpenChange={setOpenPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Montar proposta a partir de uma oportunidade</DialogTitle></DialogHeader>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma oportunidade aberta.</p>
          ) : (
            <ul className="divide-y">
              {deals.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between p-3 gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.contact?.name ?? "Sem contato"} {d.contact?.company && `· ${d.contact.company}`} · {d.owner?.name ?? "Sem responsável"}
                    </div>
                  </div>
                  <Link href={`/propostas/montar/${d.id}`}>
                    <Button size="sm" variant="outline" onClick={() => setOpenPicker(false)}>
                      <FileText className="h-3 w-3" /> Montar
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-4 w-4" />
      {label}
      {count != null && <Badge variant="outline" className="ml-1">{count}</Badge>}
    </button>
  );
}
