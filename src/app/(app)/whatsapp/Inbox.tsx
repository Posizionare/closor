"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MaskedInput } from "@/components/ui/masked-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, MessageCircle, Trophy, Phone, Plus, FileText, ScrollText, Send,
  CalendarPlus, BellRing, UserPlus, ThumbsDown, Paperclip, Mic, Smile,
  ArrowRightLeft, Headphones, Wallet, Bot, RefreshCw, AlarmClock, CheckCircle2,
} from "lucide-react";
import {
  sendMessage, transferConversation, takeConversation, simulateInbound,
  scheduleMeetingFromConversation, sendMeetingReminder, closeConversation,
  setConversationDepartment, markFollowUpProspeccao, markFollowUpProposta,
  reopenConversation,
} from "./actions";
import { saveContactFromConversation } from "./connection-actions";
import { sendProposalForAccept } from "../propostas/actions";
import { prepareContractForSigning } from "../contratos/actions";
import { missingContractFields } from "@/lib/contract-requirements";
import { saveContactFromConversation as updateContactData } from "./connection-actions";
import { unmaskCurrency } from "@/lib/masks";
import { formatCurrency, initials } from "@/lib/utils";

const STATUS_LBL: Record<string, { l: string; v: any }> = {
  NOVO: { l: "Novo contato", v: "info" },
  EM_ATENDIMENTO: { l: "Em atendimento", v: "warning" },
  AGUARDANDO_RESPOSTA: { l: "Aguardando", v: "outline" },
  NEGOCIACAO: { l: "Negociação", v: "warning" },
  GANHO: { l: "Ganho", v: "success" },
  PERDIDO: { l: "Perdido", v: "danger" },
  ENCERRADA: { l: "Encerrada", v: "outline" },
};

const COMMON_EMOJIS = ["👍","👋","😊","🙏","❤️","🎉","✅","📅","💼","📞","💬","🚀"];

type ViewType = "manager" | "comercial" | "suporte" | "financeiro";

export function Inbox({
  view, showClosed, conversations, selected, selectedContract, selectedHasProposal, users, sectors, products, proposalTemplates, contractTemplates, currentUserId,
}: {
  view: ViewType;
  showClosed?: boolean;
  conversations: any[]; selected: any; selectedContract: any | null;
  selectedHasProposal?: boolean;
  users: any[]; sectors: any[]; products: any[]; proposalTemplates: any[]; contractTemplates: any[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const [reply, setReply] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);

  const [openSim, setOpenSim] = useState(false);
  const [openSaveContact, setOpenSaveContact] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openProposal, setOpenProposal] = useState(false);
  const [openContract, setOpenContract] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openFollowUp, setOpenFollowUp] = useState(false);
  const [followDate, setFollowDate] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  const currentQ = searchParams.get("q") ?? "";
  const currentDept = searchParams.get("dept") ?? "";

  // Pré-fill da resposta (deep link da agenda)
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill && selected) setReply(prefill);
  }, [searchParams, selected?.id]);

  function selectConv(id: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("c", id);
    router.push(`/whatsapp?${sp.toString()}`);
  }
  function setFilter(k: string, v: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (v) sp.set(k, v); else sp.delete(k);
    router.push(`/whatsapp?${sp.toString()}`);
  }

  // Permissões por papel
  const canCreateProposalContract = view === "comercial" || view === "manager";
  const canMarkWonLost = view === "comercial" || view === "manager";
  const canSchedule = true; // todos podem agendar
  const canTransfer = true;

  // Status visual derivado da conversa (sem seletor manual)
  const statusInfo = selected ? STATUS_LBL[selected.status] ?? null : null;

  // Há contrato ativo?
  const hasContract = !!selectedContract;
  const contractExpiresAt = selectedContract?.expiresAt ? new Date(selectedContract.expiresAt) : null;

  // Filas: separar conversas em "Aguardando atendimento" e "Em atendimento"
  const awaiting = conversations.filter(c => c.status === "NOVO" && !c.ownerId);
  const active = conversations.filter(c => !(c.status === "NOVO" && !c.ownerId));

  return (
    <>
      {/* Indicador de papel + filtros de departamento */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-2">
          <Badge variant={view === "manager" ? "default" : "outline"}>
            {view === "manager" ? "👁 Visão completa (gestor)" :
              view === "suporte" ? "🎧 Suporte" :
              view === "financeiro" ? "💼 Financeiro" : "💬 Comercial"}
          </Badge>
          {view === "manager" && (
            <div className="flex gap-1">
              <button onClick={() => setFilter("dept", "")} className={`text-[11px] px-2 py-0.5 rounded-full ${!currentDept ? "bg-foreground text-background" : "bg-muted"}`}>Todos</button>
              <button onClick={() => setFilter("dept", "comercial")} className={`text-[11px] px-2 py-0.5 rounded-full ${currentDept === "comercial" ? "bg-foreground text-background" : "bg-muted"}`}>Comercial</button>
              <button onClick={() => setFilter("dept", "suporte")} className={`text-[11px] px-2 py-0.5 rounded-full ${currentDept === "suporte" ? "bg-foreground text-background" : "bg-muted"}`}>Suporte</button>
              <button onClick={() => setFilter("dept", "financeiro")} className={`text-[11px] px-2 py-0.5 rounded-full ${currentDept === "financeiro" ? "bg-foreground text-background" : "bg-muted"}`}>Financeiro</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Lista */}
        <Card className="overflow-hidden h-[640px] flex flex-col">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar..." className="h-8 pl-7 text-xs" defaultValue={currentQ}
                  onKeyDown={(e) => { if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value); }} />
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpenSim(true)} title="Simular lead chegando"><Plus className="h-3 w-3" /></Button>
            </div>
            {/* Abas Ativas / Encerradas */}
            <div className="flex gap-1 mt-2">
              <button onClick={() => setFilter("status", "")}
                className={`flex-1 text-[11px] py-1 rounded-md ${!showClosed ? "bg-foreground text-background font-medium" : "bg-muted"}`}>
                Ativas
              </button>
              <button onClick={() => setFilter("status", "ENCERRADA")}
                className={`flex-1 text-[11px] py-1 rounded-md ${showClosed ? "bg-foreground text-background font-medium" : "bg-muted"}`}>
                Encerradas
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Lista de encerradas com protocolo */}
            {showClosed && (
              conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground px-4">Nenhuma conversa encerrada.</div>
              ) : conversations.map(c => (
                <button key={c.id} onClick={() => selectConv(c.id)}
                  className={`w-full text-left border-b p-3 hover:bg-muted/30 ${selected?.id === c.id ? "bg-muted/40" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">{initials(c.contact?.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.contact?.name ?? "Sem contato"}</div>
                      {c.protocol && <div className="text-[11px] text-muted-foreground">Protocolo {c.protocol}</div>}
                      {c.closedAt && <div className="text-[10px] text-muted-foreground">Encerrado {new Date(c.closedAt).toLocaleString("pt-BR")}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">Encerrada</Badge>
                  </div>
                </button>
              ))
            )}

            {/* Fila — aguardando atendimento */}
            {!showClosed && awaiting.length > 0 && (
              <div className="bg-amber-50/40">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-amber-800 font-semibold border-b border-amber-200 bg-amber-100/60">
                  ⏳ Aguardando atendimento ({awaiting.length})
                </div>
                {awaiting.map(c => <ConvItem key={c.id} c={c} selected={selected?.id === c.id} onClick={() => selectConv(c.id)} />)}
              </div>
            )}

            {!showClosed && active.length > 0 && (
              <>
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                  Conversas
                </div>
                {active.map(c => <ConvItem key={c.id} c={c} selected={selected?.id === c.id} onClick={() => selectConv(c.id)} />)}
              </>
            )}

            {!showClosed && conversations.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground px-4">
                Nenhuma conversa.<br/><br/>Clique em <kbd className="bg-muted px-1 rounded">+</kbd> acima para simular um lead chegando.
              </div>
            )}
          </div>
        </Card>

        {/* Painel da conversa */}
        <Card className="overflow-hidden h-[640px] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm">Selecione uma conversa.</p></div>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">{initials(selected.contact?.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selected.contact ? (
                        <Link href={`/contatos/${selected.contact.id}`} className="font-semibold hover:underline">{selected.contact.name}</Link>
                      ) : <span className="font-semibold text-muted-foreground italic">Sem contato</span>}
                      {selected.contact?.whatsapp && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selected.contact.whatsapp}</span>}
                      {/* Status automático visível */}
                      {statusInfo && <Badge variant={statusInfo.v}>{statusInfo.l}</Badge>}
                      {/* Validade do contrato */}
                      {hasContract && contractExpiresAt && (
                        <Badge variant="outline" className="text-[10px]">
                          📝 Contrato vence em {contractExpiresAt.toLocaleDateString("pt-BR")}
                        </Badge>
                      )}
                      {selected.protocol && <Badge variant="outline" className="text-[10px]">Protocolo {selected.protocol}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selected.origin && <>Origem: {selected.origin} · </>}
                      Responsável: {selected.owner?.name ?? <span className="text-amber-700 font-medium">Sem atendente</span>}
                      {" · Setor: "}
                      <select value={selected.department ?? "comercial"} onChange={(e) => start(async () => { await setConversationDepartment(selected.id, e.target.value as any); router.refresh(); })}
                        className="text-[11px] border rounded px-1 ml-1" disabled={view !== "manager"}>
                        <option value="comercial">Comercial</option>
                        <option value="suporte">Suporte</option>
                        <option value="financeiro">Financeiro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenSaveContact(true)}>
                      <UserPlus className="h-3 w-3" /> {selected.contact ? "Editar contato" : "Salvar contato"}
                    </Button>
                  </div>
                </div>

                {/* CTA: Puxar atendimento (quando não tem dono) */}
                {!selected.owner && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-amber-900 text-sm flex items-center gap-2">
                        ⏳ Aguardando atendimento
                      </div>
                      <div className="text-xs text-amber-700">Ninguém puxou esse atendimento ainda. Clique para assumir.</div>
                    </div>
                    <Button onClick={() => start(async () => { await takeConversation(selected.id); router.refresh(); })} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <UserPlus className="h-4 w-4" /> Puxar atendimento
                    </Button>
                  </div>
                )}

                {/* Ações dinâmicas */}
                <div className="flex gap-1 flex-wrap mt-3">
                  {canCreateProposalContract && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenProposal(true)}>
                      <FileText className="h-3 w-3" /> Enviar proposta
                    </Button>
                  )}

                  {/* Contrato adaptativo: se já tem contrato, mostra apenas validade. Se não, oferece elaborar */}
                  {canCreateProposalContract && !hasContract && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenContract(true)}>
                      <ScrollText className="h-3 w-3" /> Elaborar contrato
                    </Button>
                  )}

                  <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenSchedule(true)}>
                    <CalendarPlus className="h-3 w-3" /> Agendar reunião{view === "suporte" ? " de suporte" : ""}
                  </Button>

                  {(view === "suporte" || view === "financeiro" || view === "manager") && hasContract && (
                    <Link href={`/contratos/${selectedContract.id}`}>
                      <Button size="sm" variant="outline" className="h-8">
                        <FileText className="h-3 w-3" /> Revisar contrato
                      </Button>
                    </Link>
                  )}

                  {canMarkWonLost && selected.status !== "GANHO" && (
                    selectedHasProposal ? (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => start(async () => { await markFollowUpProposta(selected.id); router.refresh(); })} title="Cliente já tem proposta enviada — fazer follow up dela">
                        <AlarmClock className="h-3 w-3" /> Follow up proposta
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => { setFollowDate(""); setOpenFollowUp(true); }} title="Agendar follow up de prospecção">
                        <RefreshCw className="h-3 w-3" /> Follow up prospecção
                      </Button>
                    )
                  )}

                  {canTransfer && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setOpenTransfer(true)}>
                      <ArrowRightLeft className="h-3 w-3" /> Transferir
                    </Button>
                  )}

                  {selected.status === "ENCERRADA" ? (
                    <Button size="sm" className="h-8 ml-auto" onClick={() => start(async () => {
                      const r = await reopenConversation(selected.id);
                      if (r?.oldProtocol) alert(`Chamado reaberto a partir do protocolo ${r.oldProtocol}.`);
                      router.refresh();
                    })}>
                      <RefreshCw className="h-3 w-3" /> Reabrir chamado
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 ml-auto" onClick={() => start(async () => { const r = await closeConversation(selected.id); if (r?.protocol) alert(`Atendimento encerrado. Protocolo: ${r.protocol}`); router.refresh(); })}>
                      <CheckCircle2 className="h-3 w-3" /> Encerrar
                    </Button>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] flex flex-col gap-2">
                {selected.messages.length === 0 && <p className="text-xs text-center text-muted-foreground">Sem mensagens ainda.</p>}
                {selected.messages.map((m: any) => (
                  <div key={m.id} className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                    m.isSystem ? "bg-amber-50 border border-amber-200 text-amber-800 self-center text-xs italic" :
                    m.direction === "outbound" ? "bg-[hsl(var(--brand))] text-white self-end" :
                    "bg-white border self-start"
                  }`}>
                    {m.direction === "outbound" && !m.isSystem && m.authorName && (
                      <div className="text-[10px] font-semibold opacity-90 mb-0.5">{m.authorName}</div>
                    )}
                    {m.mediaType === "image" && m.mediaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.mediaUrl} alt="" className="rounded-lg max-h-48 mb-1" />
                    )}
                    {m.mediaType === "audio" && m.mediaUrl && (
                      <audio src={m.mediaUrl} controls className="max-w-full" />
                    )}
                    {m.mediaType === "file" && m.mediaUrl && (
                      <a href={m.mediaUrl} download={m.fileName} className="text-xs underline flex items-center gap-1"><Paperclip className="h-3 w-3" /> {m.fileName ?? "arquivo"}</a>
                    )}
                    {m.body && <div>{m.body}</div>}
                    <div className="text-[10px] mt-0.5 opacity-60">{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
                  </div>
                ))}
              </div>

              {/* Input com anexos/áudio/emoji */}
              <div className="p-3 border-t">
                {showEmojis && (
                  <div className="mb-2 flex flex-wrap gap-1 p-2 bg-muted/30 rounded-lg">
                    {COMMON_EMOJIS.map(e => (
                      <button key={e} className="text-lg hover:bg-white rounded p-1" onClick={() => { setReply(r => r + e); setShowEmojis(false); }}>{e}</button>
                    ))}
                  </div>
                )}
                <form className="flex gap-2 items-center"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const body = reply.trim();
                    if (!body) return;
                    start(async () => { await sendMessage(selected.id, body); setReply(""); router.refresh(); });
                  }}>
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = String(reader.result);
                        const isImage = f.type.startsWith("image/");
                        start(async () => {
                          await sendMessage(selected.id, isImage ? "" : f.name, dataUrl, isImage ? "image" : "file", f.name);
                          router.refresh();
                        });
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" className="h-9 px-2" title="Anexar arquivo" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant={recording ? "default" : "outline"} className="h-9 px-2" title={recording ? "Parar gravação" : "Gravar áudio"} onClick={async () => {
                    if (recording) {
                      audioRef.current?.stop();
                      setRecording(false);
                    } else {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const mr = new MediaRecorder(stream);
                        const chunks: BlobPart[] = [];
                        mr.ondataavailable = (e) => chunks.push(e.data);
                        mr.onstop = () => {
                          const blob = new Blob(chunks, { type: "audio/webm" });
                          const reader = new FileReader();
                          reader.onload = () => {
                            start(async () => {
                              await sendMessage(selected.id, "", String(reader.result), "audio", "audio.webm");
                              router.refresh();
                            });
                          };
                          reader.readAsDataURL(blob);
                          stream.getTracks().forEach(t => t.stop());
                        };
                        mr.start();
                        audioRef.current = mr;
                        setRecording(true);
                      } catch { alert("Permissão de microfone negada."); }
                    }
                  }}>
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-9 px-2" title="Emojis" onClick={() => setShowEmojis(s => !s)}>
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Input placeholder="Escreva sua resposta..." value={reply} onChange={(e) => setReply(e.target.value)} className="flex-1" />
                  <Button type="submit" disabled={pending || !reply.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Modal: Salvar contato */}
      <Dialog open={openSaveContact} onOpenChange={setOpenSaveContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.contact ? "Editar contato" : "Salvar contato"}</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { await saveContactFromConversation(selected.id, fd); setOpenSaveContact(false); router.refresh(); })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nome *</Label><Input name="name" required defaultValue={selected?.contact?.name ?? ""} /></div>
            <div className="grid gap-1.5"><Label>Empresa</Label><Input name="company" defaultValue={selected?.contact?.company ?? ""} /></div>
            <div className="grid gap-1.5"><Label>CPF / CNPJ</Label><MaskedInput mask="cpfcnpj" name="cpfCnpj" defaultValue={selected?.contact?.cpfCnpj} /></div>
            <div className="grid gap-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={selected?.contact?.email ?? ""} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenSaveContact(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Agendar reunião */}
      <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar reunião com {selected?.contact?.name ?? "lead"}</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { await scheduleMeetingFromConversation(selected.id, fd); setOpenSchedule(false); router.refresh(); })} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Data *</Label><Input type="date" name="date" required /></div>
              <div className="grid gap-1.5"><Label>Hora *</Label><Input type="time" name="time" required defaultValue="10:00" /></div>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <select name="title" className="h-10 rounded-lg border border-input px-3 text-sm bg-background" defaultValue={view === "suporte" ? "Reunião de suporte" : view === "financeiro" ? "Revisão de contrato (financeiro)" : "Reunião comercial"}>
                <option>Reunião comercial</option>
                <option>Reunião de suporte</option>
                <option>Revisão de contrato (financeiro)</option>
                <option>Onboarding</option>
                <option>Demo</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenSchedule(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Agendar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Transferir */}
      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir atendimento</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">Escolha um atendente ou um setor. Mensagem automática será enviada ao cliente.</p>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Para um atendente</Label>
              <div className="grid grid-cols-2 gap-2">
                {users.filter(u => u.id !== currentUserId).map(u => (
                  <button key={u.id} className="text-left p-2 rounded border hover:bg-muted/30 text-xs" onClick={() => start(async () => {
                    await transferConversation(selected.id, { toUserId: u.id });
                    setOpenTransfer(false); router.refresh();
                  })}>
                    <strong>{u.name}</strong>
                    <div className="text-[10px] text-muted-foreground">{u.commercialRole ?? u.jobTitle ?? "—"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Ou para um setor</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "comercial", l: "Comercial", icon: Bot },
                  { v: "suporte", l: "Suporte", icon: Headphones },
                  { v: "financeiro", l: "Financeiro", icon: Wallet },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.v} className="text-center p-3 rounded border hover:bg-muted/30 text-xs" onClick={() => start(async () => {
                      await transferConversation(selected.id, { toDepartment: s.v });
                      setOpenTransfer(false); router.refresh();
                    })}>
                      <Icon className="h-4 w-4 mx-auto mb-1" />
                      <strong>{s.l}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Proposta inline */}
      <Dialog open={openProposal} onOpenChange={setOpenProposal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Montar proposta</DialogTitle></DialogHeader>
          {!selected?.contact ? (
            <p className="text-sm text-muted-foreground">Salve o contato primeiro.</p>
          ) : (
            <ProposalInlineBuilder
              contact={selected.contact}
              products={products}
              templates={proposalTemplates}
              onSent={(link) => {
                setOpenProposal(false);
                router.refresh();
                // pré-preenche resposta com link
                setReply(`Olá ${selected.contact.name?.split(" ")[0] ?? ""}, sua proposta está pronta. Acesse e aceite por aqui: ${link}`);
              }}
              onCancel={() => setOpenProposal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Elaborar contrato - popup completo */}
      <Dialog open={openContract} onOpenChange={setOpenContract}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Elaborar contrato para {selected?.contact?.name}</DialogTitle></DialogHeader>
          {!selected?.contact ? (
            <p className="text-sm text-muted-foreground">Salve o contato primeiro.</p>
          ) : (
            <ContractInlineBuilder
              contact={selected.contact}
              conversationId={selected.id}
              templates={contractTemplates}
              onSent={(link: string) => {
                setOpenContract(false);
                router.refresh();
                setReply(`Olá ${selected.contact.name?.split(" ")[0] ?? ""}, segue o contrato para sua assinatura digital: ${link}`);
              }}
              onCancel={() => setOpenContract(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Follow up prospecção com data sugerida */}
      <Dialog open={openFollowUp} onOpenChange={setOpenFollowUp}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar follow up de prospecção</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Escolha quando retomar o contato com {selected?.contact?.name ?? "o lead"}.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "Amanhã", d: 1 },
                { l: "Em 3 dias", d: 3 },
                { l: "Em 7 dias", d: 7 },
                { l: "Em 15 dias", d: 15 },
              ].map(opt => {
                const dt = new Date(); dt.setDate(dt.getDate() + opt.d);
                const iso = dt.toISOString().slice(0, 10);
                return (
                  <button key={opt.l} onClick={() => setFollowDate(iso)}
                    className={`text-left p-2.5 rounded-lg border text-sm ${followDate === iso ? "border-[hsl(var(--brand))] bg-orange-50" : "hover:bg-muted/30"}`}>
                    <div className="font-medium">{opt.l}</div>
                    <div className="text-[11px] text-muted-foreground">{dt.toLocaleDateString("pt-BR")}</div>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-1.5">
              <Label>Ou escolha uma data</Label>
              <Input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenFollowUp(false)}>Cancelar</Button>
              <Button disabled={pending || !followDate} onClick={() => start(async () => {
                await markFollowUpProspeccao(selected.id, followDate);
                setOpenFollowUp(false);
                router.refresh();
              })}>
                <RefreshCw className="h-3 w-3" /> Agendar follow up
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simular lead chegando */}
      <Dialog open={openSim} onOpenChange={setOpenSim}>
        <DialogContent>
          <DialogHeader><DialogTitle>Simular lead chegando pelo WhatsApp</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { const r = await simulateInbound(fd); if (r?.ok) { setOpenSim(false); router.refresh(); } })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nome do lead</Label><Input name="name" required placeholder="Maria Silva" /></div>
            <div className="grid gap-1.5"><Label>WhatsApp</Label><MaskedInput mask="phone" name="whatsapp" /></div>
            <div className="grid gap-1.5"><Label>Origem</Label>
              <select name="origin" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                {["WhatsApp","Manual","Site","Evento","Google Ads","Meta Ads","Instagram"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5"><Label>Mensagem inicial</Label>
              <textarea name="message" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" defaultValue="Olá, vi o anúncio de vocês. Como funciona?" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenSim(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>Criar lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConvItem({ c, selected, onClick }: { c: any; selected: boolean; onClick: () => void }) {
  const last = c.messages?.[0];
  return (
    <button onClick={onClick} className={`w-full text-left border-b p-3 hover:bg-muted/30 ${selected ? "bg-muted/40" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">{initials(c.contact?.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{c.contact?.name ?? "Sem contato"}</span>
            {c.unreadCount > 0 && <Badge variant="info">{c.unreadCount}</Badge>}
          </div>
          {c.contact?.company && <div className="text-[11px] text-muted-foreground truncate">{c.contact.company}</div>}
          {last && <div className="text-xs text-muted-foreground truncate mt-0.5">{last.body}</div>}
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            <StatusBadge status={c.status} />
            {c.department && c.department !== "comercial" && <Badge variant="outline" className="text-[10px]">{c.department}</Badge>}
            {c.origin && <Badge variant="outline" className="text-[10px]">{c.origin}</Badge>}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LBL[status]; if (!s) return null;
  return <Badge variant={s.v} className="text-[10px]">{s.l}</Badge>;
}

// Builder inline da proposta
function ProposalInlineBuilder({ contact, products, templates, onSent, onCancel }: any) {
  const [pending, start] = useTransition();
  const [items, setItems] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [validUntil, setValidUntil] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); });

  function addProduct(productId: string) {
    const p = products.find((x: any) => x.id === productId); if (!p) return;
    setItems(prev => [...prev, {
      productId: p.id, name: p.name, description: p.description ?? "",
      quantity: 1, unitPrice: Number(p.price ?? 0), discount: 0,
      billing: p.billing ?? "UNICO", durationMonths: p.durationMonths ?? undefined,
    }]);
  }
  function update(i: number, patch: any) { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function remove(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((a, it) => a + it.quantity * it.unitPrice, 0);
  const discount = items.reduce((a, it) => a + it.discount, 0);
  const total = Math.max(0, subtotal - discount);

  function send() {
    start(async () => {
      const res = await sendProposalForAccept({
        contactId: contact.id,
        templateId: templateId || undefined,
        title: `Proposta para ${contact.name}`,
        totalValue: total, validUntil,
        itemsSnapshot: items.map(it => ({ ...it })),
      } as any);
      if ((res as any)?.url) {
        const fullUrl = `${window.location.origin}${(res as any).url}`;
        onSent?.(fullUrl);
      } else {
        alert((res as any)?.error ?? "Não foi possível gerar o link.");
      }
    });
  }

  function previewProposal() {
    // Usa o modelo selecionado: capa + cor primária
    const tpl = templates.find((t: any) => t.id === templateId);
    const primary = tpl?.primaryColor || "#F97316";
    const cover = tpl?.coverUrl || "";
    const itemsRows = items.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Nenhum item adicionado.</td></tr>`
      : items.map(it => {
          const sub = it.quantity * it.unitPrice - it.discount;
          return `<tr>
            <td><strong>${it.name}</strong>${it.billing === "MENSAL" ? `<div style="font-size:11px;color:#64748b">Mensal · ${it.durationMonths}m</div>` : ""}${it.description ? `<div style="font-size:11px;color:#64748b;white-space:pre-line">${it.description}</div>` : ""}</td>
            <td>${it.quantity}</td>
            <td>${formatCurrency(it.unitPrice)}${it.billing === "MENSAL" ? "/mês" : ""}</td>
            <td>${it.discount > 0 ? formatCurrency(it.discount) : "—"}</td>
            <td style="text-align:right;font-weight:600">${formatCurrency(sub)}</td>
          </tr>`;
        }).join("");
    const coverPage = cover
      ? `<div style="position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always">
           <img src="${cover}" style="width:100%;height:100%;object-fit:cover"/>
           <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.7),rgba(0,0,0,0))"></div>
           <div style="position:absolute;bottom:60px;left:48px;right:48px;color:#fff">
             <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;opacity:.85">Proposta comercial</div>
             <div style="font-size:40px;font-weight:700;margin-top:8px">${tpl?.name ?? "Proposta"}</div>
             <div style="font-size:16px;margin-top:14px;opacity:.9">Para ${contact.name}</div>
           </div>
         </div>`
      : `<div style="background:${primary};color:#fff;padding:60px 48px;page-break-after:always">
           <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;opacity:.85">Proposta comercial</div>
           <div style="font-size:40px;font-weight:700;margin-top:8px">${tpl?.name ?? "Proposta"}</div>
           <div style="font-size:16px;margin-top:14px;opacity:.9">Para ${contact.name}</div>
         </div>`;
    const html = `
      <html><head><title>Pré-visualização da proposta</title>
        <style>
          body{font-family:system-ui;margin:0;background:#e5e7eb;color:#0f172a}
          .page{width:210mm;min-height:297mm;background:#fff;margin:16px auto;padding:24mm;box-shadow:0 1px 4px rgba(0,0,0,.15)}
          h2{color:${primary}}
          table{width:100%;border-collapse:collapse;margin-top:14px}
          th,td{padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:left;vertical-align:top}
          th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#64748b}
          .tot{font-size:22px;color:#15803d;font-weight:700}
        </style>
      </head><body>
        ${coverPage}
        <div class="page">
          <div style="display:flex;justify-content:space-between;border-bottom:3px solid ${primary};padding-bottom:12px">
            <div><h2 style="margin:0;font-size:24px">Proposta</h2><div style="color:#64748b;font-size:13px">Para: <strong>${contact.name}</strong></div></div>
            <div style="text-align:right"><div style="color:#64748b;font-size:11px">Validade</div><div>${new Date(validUntil).toLocaleDateString("pt-BR")}</div></div>
          </div>
          <h3 style="margin-top:18px">Produtos e serviços</h3>
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Desconto</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:14px;border-top:2px solid #0f172a">
            <span>Valor total</span><span class="tot">${formatCurrency(total)}</span>
          </div>
          ${tpl?.commercialTerms ? `<div style="margin-top:24px"><h3>Condições comerciais</h3><p style="font-size:12px;white-space:pre-line;color:#475569">${tpl.commercialTerms}</p></div>` : ""}
          ${tpl?.footer ? `<div style="margin-top:30px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:11px;color:#94a3b8;text-align:center">${tpl.footer}</div>` : ""}
        </div>
      </body></html>`;
    const w = window.open("", "_blank", "width=900,height=760");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Modelo de orçamento</Label>
          {templates.length === 0 ? <p className="text-xs text-muted-foreground">Sem modelos. Cadastre em /propostas.</p> :
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-10 rounded-lg border border-input px-3 text-sm">
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          }
        </div>
        <div className="grid gap-1.5"><Label>Validade</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
      </div>

      <div className="grid gap-1.5">
        <Label>Adicionar produto do catálogo</Label>
        <select className="h-10 rounded-lg border border-input px-3 text-sm" defaultValue="" onChange={(e) => { if (e.target.value) { addProduct(e.target.value); e.target.value = ""; } }}>
          <option value="">+ Selecione um produto</option>
          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price))}{p.billing === "MENSAL" ? "/mês" : ""}</option>)}
        </select>
      </div>

      {items.length > 0 && (
        <div className="border rounded-lg divide-y">
          {items.map((it, i) => (
            <div key={i} className="p-2 grid grid-cols-12 gap-2 items-center text-sm">
              <div className="col-span-5"><div className="font-medium truncate">{it.name}</div>{it.billing === "MENSAL" && <div className="text-[10px] text-muted-foreground">Mensal · {it.durationMonths}m</div>}</div>
              <Input type="number" min="1" className="col-span-1 h-8" value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) || 1 })} />
              <MaskedInput mask="currency" className="col-span-3 h-8" defaultValue={it.unitPrice} onChange={(e) => update(i, { unitPrice: unmaskCurrency(e.target.value) })} />
              <MaskedInput mask="currency" className="col-span-2 h-8" defaultValue={it.discount} onChange={(e) => update(i, { discount: unmaskCurrency(e.target.value) })} />
              <Button variant="ghost" size="sm" className="col-span-1 text-red-600" onClick={() => remove(i)}>×</Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant="outline" onClick={previewProposal} disabled={items.length === 0}>
          👁 Visualizar
        </Button>
        <Button onClick={send} disabled={pending || items.length === 0}>
          <Send className="h-3 w-3" /> {pending ? "Enviando..." : "Enviar para aceite"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Builder inline do contrato (popup completo)
function ContractInlineBuilder({ contact, conversationId, templates, onSent, onCancel }: any) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tplId, setTplId] = useState<string>(templates[0]?.id ?? "");
  const [title, setTitle] = useState<string>(`Contrato — ${contact.name}`);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 12);
    return d.toISOString().slice(0, 10);
  });
  const [body, setBody] = useState<string>(templates[0]?.body ?? "");

  // Validação: campos obrigatórios do cliente para gerar contrato
  const missing = missingContractFields(contact);
  const [fillingData, setFillingData] = useState(missing.length > 0);

  // Atualiza body ao trocar template
  function changeTemplate(id: string) {
    setTplId(id);
    const t = templates.find((x: any) => x.id === id);
    if (t) {
      setBody(t.body);
      setTitle(`${t.name} — ${contact.name}`);
    }
  }

  // Tela de completar dados do cliente antes de liberar o contrato
  if (fillingData) {
    return (
      <div className="grid gap-3">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          Este cliente tem um cadastro simples. Para gerar o contrato, complete os dados obrigatórios:
          <ul className="list-disc ml-5 mt-1 text-xs">
            {missing.map(m => <li key={m.key}>{m.label}</li>)}
          </ul>
        </div>
        <form action={(fd) => start(async () => {
          await updateContactData(conversationId, fd);
          router.refresh();
          // após salvar, recarrega — o contato atualizado virá no próximo render
          setFillingData(false);
        })} className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1"><Label className="text-xs">Nome do cliente *</Label><Input name="name" defaultValue={contact.name ?? ""} required /></div>
            <div className="grid gap-1"><Label className="text-xs">Nome da empresa *</Label><Input name="company" defaultValue={contact.company ?? ""} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1"><Label className="text-xs">CPF / CNPJ *</Label><MaskedInput mask="cpfcnpj" name="cpfCnpj" defaultValue={contact.cpfCnpj} /></div>
            <div className="grid gap-1"><Label className="text-xs">Telefone *</Label><MaskedInput mask="phone" name="phone" defaultValue={contact.phone ?? contact.whatsapp} /></div>
          </div>
          <div className="grid gap-1"><Label className="text-xs">E-mail *</Label><Input name="email" type="email" defaultValue={contact.email ?? ""} required /></div>
          <div className="grid gap-1"><Label className="text-xs">Endereço *</Label><Input name="address" defaultValue={contact.address ?? ""} required /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar e continuar"}</Button>
          </DialogFooter>
        </form>
      </div>
    );
  }

  function preview() {
    const html = `<html><head><title>Contrato</title>
      <style>body{font-family:system-ui;padding:24mm;background:#fff;color:#0f172a}h1{margin:0 0 16px}pre{white-space:pre-wrap;font-family:system-ui;font-size:13px;line-height:1.6}</style>
    </head><body><h1>${title}</h1><pre>${body.replace(/[<>]/g, c => c === "<" ? "&lt;" : "&gt;")}</pre></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); }
  }

  function send() {
    start(async () => {
      const r = await prepareContractForSigning({
        contactId: contact.id,
        title, body,
        expiresAt: expiresAt || null,
        totalValue,
      } as any);
      if ((r as any)?.url) {
        const fullUrl = `${window.location.origin}${(r as any).url}`;
        onSent?.(fullUrl);
      } else {
        alert((r as any)?.error ?? "Falha ao gerar o contrato.");
      }
    });
  }

  if (templates.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Nenhum modelo de contrato cadastrado.</p>
        <p className="text-sm">Cadastre em <strong>Contratos &gt; Criar contrato</strong>.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Modelo de contrato</Label>
          <select value={tplId} onChange={(e) => changeTemplate(e.target.value)} className="h-10 rounded-lg border border-input px-3 text-sm">
            {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5"><Label>Vencimento</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
      </div>
      <div className="grid gap-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="grid gap-1.5">
        <Label>Valor total</Label>
        <MaskedInput mask="currency" defaultValue={totalValue} onChange={(e) => setTotalValue(unmaskCurrency(e.target.value))} />
      </div>
      <div className="grid gap-1.5">
        <Label>Corpo do contrato</Label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10}
          className="rounded-lg border border-input px-3 py-2 text-xs font-mono" />
        <p className="text-[11px] text-muted-foreground">Variáveis: {`{{nome_cliente}} {{cnpj_empresa}} {{valor_total}} {{data_emissao}}`}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant="outline" onClick={preview}>👁 Visualizar</Button>
        <Button onClick={send} disabled={pending}>
          <Send className="h-3 w-3" /> {pending ? "Gerando..." : "Gerar e enviar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
