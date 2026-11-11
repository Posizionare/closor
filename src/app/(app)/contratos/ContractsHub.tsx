"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSignature, FilePlus, Search, Eye, Send, FileText, CheckCircle2, AlarmClock, Pencil, Trash2 } from "lucide-react";
import { ContractTemplates } from "./ContractTemplates";
import { formatCurrency } from "@/lib/utils";
import { deleteContract } from "./actions";

const STATUS_COLORS: Record<string, any> = {
  RASCUNHO: "outline",
  ENVIADO: "info",
  ASSINADO: "success",
  VIGENTE: "success",
  ENCERRADO: "outline",
  CANCELADO: "danger",
};

export function ContractsHub({ defaultBody, templates, deals, contracts, currentTab, currentQ }: {
  defaultBody: string; templates: any[]; deals: any[]; contracts: any[]; currentTab: "criar" | "gerados"; currentQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openPicker, setOpenPicker] = useState(false);
  const [, start] = useTransition();
  const [search, setSearch] = useState(currentQ);

  function setTab(t: "criar" | "gerados") {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", t);
    router.push(`/contratos?${sp.toString()}`);
  }

  function applySearch() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", "gerados");
    if (search) sp.set("q", search); else sp.delete("q");
    router.push(`/contratos?${sp.toString()}`);
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4">
        <TabButton active={currentTab === "criar"} onClick={() => setTab("criar")} icon={FilePlus} label="Criar contrato" />
        <TabButton active={currentTab === "gerados"} onClick={() => setTab("gerados")} icon={FileSignature} label="Contratos gerados" count={contracts.length} />
      </div>

      {currentTab === "criar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          <ContractTemplates templates={templates} defaultBody={defaultBody} />

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Novo contrato</CardTitle>
              <CardDescription>Selecione uma oportunidade e gere o contrato preenchido com as variáveis.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setOpenPicker(true)}>
                <FilePlus className="h-4 w-4" /> Gerar a partir de uma oportunidade
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">Os contratos assinados ficam disponíveis na aba <strong>Contratos gerados</strong>.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>Contratos gerados</CardTitle>
                <CardDescription>Histórico completo de contratos criados, enviados e assinados.</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                    placeholder="Buscar por cliente, empresa, número..." className="pl-9" />
                </div>
                <Button variant="outline" onClick={applySearch}>Buscar</Button>
                <Button onClick={() => setOpenPicker(true)}><FilePlus className="h-3 w-3" /> Novo</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {currentQ ? `Nenhum contrato encontrado para "${currentQ}".` : "Nenhum contrato gerado ainda. Use a aba 'Criar contrato' para começar."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Empresa / Cliente</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Atendente</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Fechamento</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase text-muted-foreground">Vencimento</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                      <th className="text-center p-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c: any) => {
                      const fechamento = c.signedAt ?? c.startsAt ?? c.createdAt;
                      const vencimento = c.expiresAt;
                      const expired = vencimento && new Date(vencimento).getTime() < Date.now();
                      const expiringSoon = vencimento && !expired && (new Date(vencimento).getTime() - Date.now()) / (24*3600*1000) <= 30;
                      return (
                        <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/10">
                          <td className="p-3">
                            <div className="font-medium">{c.contact?.company ?? c.contact?.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.contact?.name && c.contact?.company ? c.contact.name : (c.title ?? "Contrato")}
                              {c.number && <span> · {c.number}</span>}
                            </div>
                          </td>
                          <td className="p-3 text-xs">{c.owner?.name ?? "—"}</td>
                          <td className="p-3 text-xs">{fechamento ? new Date(fechamento).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="p-3 text-xs">
                            {vencimento ? (
                              <div className="flex items-center gap-1">
                                {new Date(vencimento).toLocaleDateString("pt-BR")}
                                {expired && <Badge variant="danger" className="text-[10px]">Vencido</Badge>}
                                {expiringSoon && <Badge variant="warning" className="text-[10px]"><AlarmClock className="h-2.5 w-2.5" /></Badge>}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-right text-xs font-medium">{c.totalValue ? formatCurrency(Number(c.totalValue)) : "—"}</td>
                          <td className="p-3 text-center">
                            <Badge variant={STATUS_COLORS[c.status] ?? "outline"} className="text-[10px]">
                              {c.status === "ASSINADO" && <CheckCircle2 className="h-2.5 w-2.5" />}
                              {c.status === "ENVIADO" && <Send className="h-2.5 w-2.5" />}
                              {c.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <Link href={`/contratos/${c.id}`}>
                                <Button variant="outline" size="sm" title="Visualizar"><Eye className="h-3 w-3" /></Button>
                              </Link>
                              <Link href={`/contratos/${c.id}?edit=1`}>
                                <Button variant="outline" size="sm" title="Editar"><Pencil className="h-3 w-3" /></Button>
                              </Link>
                              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" title="Excluir"
                                onClick={() => {
                                  if (!confirm(`Excluir contrato de ${c.contact?.company ?? c.contact?.name ?? "—"}?`)) return;
                                  start(async () => { await deleteContract(c.id); router.refresh(); });
                                }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: escolher oportunidade pra gerar contrato */}
      <Dialog open={openPicker} onOpenChange={setOpenPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gerar contrato a partir de uma oportunidade</DialogTitle></DialogHeader>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma oportunidade aberta no funil.</p>
          ) : (
            <ul className="divide-y">
              {deals.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between p-3 gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.contact?.name ?? "Sem contato"} {d.contact?.company && `· ${d.contact.company}`}
                    </div>
                  </div>
                  <Link href={`/contratos/gerar/${d.id}`}>
                    <Button size="sm" variant="outline" onClick={() => setOpenPicker(false)}>
                      <FileText className="h-3 w-3" /> Gerar
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
