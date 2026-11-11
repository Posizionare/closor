"use client";
import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon, Plus, X, Video, ChevronLeft, ChevronRight,
  MessageCircle, Mail, Bell, ExternalLink, AlertTriangle,
} from "lucide-react";
import { scheduleMeeting, cancelMeetingWithReason } from "./actions";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Cores por atendente (consistente por id)
function colorFor(id?: string) {
  const palette = ["#F97316","#EC4899","#8B5CF6","#10B981","#3B82F6","#F59E0B","#EF4444","#14B8A6","#06B6D4","#84CC16"];
  if (!id) return "#94A3B8";
  let h = 0; for (let i=0;i<id.length;i++) h = ((h<<5)-h+id.charCodeAt(i))|0;
  return palette[Math.abs(h) % palette.length];
}

export function AgendaPanel({ year, month, isManager, meetings, contacts, users, googleConnected }: {
  year: number; month: number; isManager: boolean;
  meetings: any[]; contacts: any[]; users: any[]; googleConnected: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openMeeting, setOpenMeeting] = useState<any | null>(null);
  const [openCancel, setOpenCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<"alteracao" | "imprevisto" | "remarcar" | "cliente">("alteracao");
  const [cancelWhats, setCancelWhats] = useState(true);
  const [cancelEmail, setCancelEmail] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
  const [pending, start] = useTransition();
  const [meetLink, setMeetLink] = useState<string | null>(null);

  function buildCancelMsg(meeting: any, reason: string) {
    if (!meeting?.dueDate) return "";
    const d = new Date(meeting.dueDate);
    const dateText = `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const name = meeting.contact?.name ?? "Cliente";
    const M: Record<string, string> = {
      alteracao: `Olá ${name}, nossa reunião do dia ${dateText} foi cancelada devido a alteração de dia e hora. Em breve entraremos em contato para reagendar.`,
      imprevisto: `Olá ${name}, infelizmente tivemos um imprevisto e precisamos cancelar nossa reunião do dia ${dateText}. Reagendaremos em breve.`,
      remarcar: `Olá ${name}, precisamos remarcar nossa reunião do dia ${dateText}. Já vou te enviar novas opções de horário.`,
      cliente: `Olá ${name}, conforme combinado, a reunião do dia ${dateText} foi cancelada. Quando puder, me avise para reagendar.`,
    };
    return M[reason] ?? "";
  }
  function startCancel(m: any) {
    setOpenMeeting(null);
    setOpenCancel(m);
    setCancelReason("alteracao");
    setCancelWhats(true);
    setCancelEmail(false);
    setCancelMsg(buildCancelMsg(m, "alteracao"));
  }
  function changeReason(r: any) {
    setCancelReason(r);
    setCancelMsg(buildCancelMsg(openCancel, r));
  }
  function confirmCancel() {
    if (!openCancel) return;
    start(async () => {
      await cancelMeetingWithReason(openCancel.id, {
        reason: cancelReason,
        notifyWhatsapp: cancelWhats,
        notifyEmail: cancelEmail,
        customMessage: cancelMsg,
      });
      setOpenCancel(null);
      router.refresh();
    });
  }

  // Deep-link do sino: ?reminder=<taskId>&contactId=<id> dispara o envio do lembrete via WhatsApp interno
  useEffect(() => {
    const reminder = searchParams.get("reminder");
    const contactId = searchParams.get("contactId");
    if (reminder && contactId) {
      const m = meetings.find((x: any) => x.id === reminder);
      if (m) openInternalWhatsapp(m, router);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Constrói grade do mês
  const grid = useMemo(() => buildMonthGrid(year, month, meetings), [year, month, meetings]);

  const prevMonth = () => navigate(year, month - 1);
  const nextMonth = () => navigate(year, month + 1);
  function navigate(y: number, m: number) {
    const date = new Date(y, m, 1);
    router.push(`/agenda?y=${date.getFullYear()}&m=${date.getMonth()}`);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-lg min-w-[180px] text-center">{MONTHS[month]} {year}</CardTitle>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(new Date().getFullYear(), new Date().getMonth())}>Hoje</Button>
          </div>
          <Button onClick={() => setOpenSchedule(true)}><Plus className="h-4 w-4" /> Agendar reunião</Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>
          {/* Grade */}
          <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(110px, auto)" }}>
            {grid.map((cell, idx) => (
              <div
                key={idx}
                className={`border-b border-r p-1.5 last-of-line ${cell.isCurrentMonth ? "" : "bg-muted/20"} ${cell.isToday ? "bg-orange-50/40" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${cell.isToday ? "h-6 w-6 rounded-full bg-[hsl(var(--brand))] text-white flex items-center justify-center" : "text-muted-foreground"}`}>
                    {cell.day}
                  </span>
                  {cell.events.length > 0 && <span className="text-[10px] text-muted-foreground">{cell.events.length}</span>}
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {cell.events.slice(0, 3).map((m: any) => (
                    <button
                      key={m.id} onClick={() => setOpenMeeting(m)}
                      className="text-[10px] text-left rounded px-1.5 py-0.5 truncate hover:opacity-80 transition-opacity flex items-center gap-1"
                      style={{ background: `${colorFor(m.assigneeId)}22`, color: colorFor(m.assigneeId), borderLeft: `2px solid ${colorFor(m.assigneeId)}` }}
                      title={`${m.title} — ${m.assignee?.name ?? ""}`}
                    >
                      <span className="font-medium">{new Date(m.dueDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="truncate">{m.contact?.name ?? m.title}</span>
                    </button>
                  ))}
                  {cell.events.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1.5">+{cell.events.length - 3} mais</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Aviso topo: lembretes automáticos */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border">
        <Bell className="h-3 w-3 text-[hsl(var(--brand))]" />
        2h antes de cada reunião o sistema avisa o atendente no sino com o atalho "Enviar lembrete via WhatsApp" para o cliente.
      </div>

      {/* Modal: detalhe da reunião + lembretes */}
      <Dialog open={!!openMeeting} onOpenChange={(v) => !v && setOpenMeeting(null)}>
        <DialogContent>
          {openMeeting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: colorFor(openMeeting.assigneeId) }} />
                  {openMeeting.title}
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm space-y-2">
                <div><strong>Quando:</strong> {new Date(openMeeting.dueDate).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}</div>
                <div><strong>Atendente:</strong> {openMeeting.assignee?.name ?? "—"}</div>
                {openMeeting.contact && <div><strong>Cliente:</strong> <Link className="underline" href={`/contatos/${openMeeting.contact.id}`}>{openMeeting.contact.name}</Link>{openMeeting.contact.whatsapp && <span className="text-muted-foreground"> · {openMeeting.contact.whatsapp}</span>}</div>}
                {openMeeting.description && <div className="text-muted-foreground italic">{openMeeting.description}</div>}
              </div>
              <div className="grid grid-cols-1 gap-2 mt-3 border-t pt-3">
                <div className="text-[11px] uppercase text-muted-foreground tracking-wider">Enviar lembrete ao cliente</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" disabled={!openMeeting.contact?.id}
                    onClick={() => openInternalWhatsapp(openMeeting, router)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp interno
                  </Button>
                  <Button variant="outline" disabled={!openMeeting.contact?.email}
                    onClick={() => sendEmailReminder(openMeeting)}>
                    <Mail className="h-4 w-4" /> E-mail
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">O sistema também avisa o atendente automaticamente 2h antes pelo sino de notificações.</div>
              </div>
              <DialogFooter>
                {openMeeting.status !== "CANCELADA" && (
                  <Button variant="ghost" className="text-red-600" onClick={() => startCancel(openMeeting)}>
                    <X className="h-4 w-4" /> Cancelar reunião
                  </Button>
                )}
                <Button onClick={() => setOpenMeeting(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: cancelar reunião com motivo */}
      <Dialog open={!!openCancel} onOpenChange={(v) => !v && setOpenCancel(null)}>
        <DialogContent>
          {openCancel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" /> Cancelar reunião</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="text-sm">
                  <strong>{openCancel.contact?.name ?? "Cliente"}</strong> · {openCancel.dueDate ? new Date(openCancel.dueDate).toLocaleString("pt-BR") : ""}
                </div>
                <div className="grid gap-1.5">
                  <Label>Motivo do cancelamento *</Label>
                  <select value={cancelReason} onChange={(e) => changeReason(e.target.value as any)}
                    className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                    <option value="alteracao">Alteração de dia e hora</option>
                    <option value="imprevisto">Imprevisto</option>
                    <option value="remarcar">Remarcar</option>
                    <option value="cliente">Cancelado pelo cliente</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Mensagem que será enviada ao cliente</Label>
                  <textarea value={cancelMsg} onChange={(e) => setCancelMsg(e.target.value)} rows={4}
                    className="rounded-lg border border-input px-3 py-2 text-sm" />
                  <p className="text-[11px] text-muted-foreground">A mensagem é gerada automaticamente conforme o motivo, mas você pode editá-la.</p>
                </div>
                <div className="grid gap-1.5">
                  <Label>Avisar cliente via</Label>
                  <div className="flex gap-3 flex-wrap text-sm">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={cancelWhats} onChange={(e) => setCancelWhats(e.target.checked)} />
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp interno
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={cancelEmail} onChange={(e) => setCancelEmail(e.target.checked)} />
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </label>
                    <label className="flex items-center gap-1.5 text-muted-foreground">
                      <input type="checkbox" checked disabled />
                      📅 Atualizar Google Agenda
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCancel(null)}>Voltar</Button>
                <Button variant="destructive" onClick={confirmCancel} disabled={pending}>
                  {pending ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: agendar */}
      <Dialog open={openSchedule} onOpenChange={(v) => { setOpenSchedule(v); if (!v) setMeetLink(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar reunião</DialogTitle></DialogHeader>
          {meetLink ? (
            <div className="grid gap-3">
              <div className="rounded-xl border p-4 bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 mb-2"><Video className="h-4 w-4" /> Link do Meet criado</div>
                <a href={meetLink} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline break-all flex items-center gap-1">
                  {meetLink} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">Lembretes de 2h e 30min serão exibidos no sino de notificações para o atendente.</p>
              <Button onClick={() => { setOpenSchedule(false); setMeetLink(null); router.refresh(); }}>OK</Button>
            </div>
          ) : (
            <form action={(fd) => start(async () => {
              const r = await scheduleMeeting(fd);
              if (r?.ok) { setMeetLink(r.meetLink ?? null); router.refresh(); }
            })} className="grid gap-3">
              <div className="grid gap-1.5"><Label>Cliente / contato</Label>
                <select name="contactId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                  <option value="">— sem contato —</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Data *</Label><Input name="date" type="date" required /></div>
                <div className="grid gap-1.5"><Label>Horário *</Label><Input name="time" type="time" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Duração</Label>
                  <select name="duration" className="h-10 rounded-lg border border-input px-3 text-sm bg-background" defaultValue="30">
                    <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option>
                  </select>
                </div>
                <div className="grid gap-1.5"><Label>Tipo</Label>
                  <select name="type" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                    <option>Comercial</option><option>Técnica</option><option>Suporte</option><option>Onboarding</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5"><Label>Atendente responsável</Label>
                <select name="ownerId" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="withMeet" defaultChecked /> Criar link do Google Meet</label>
              <div className="grid gap-1.5"><Label>Observações</Label>
                <textarea name="notes" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenSchedule(false)}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{pending ? "Agendando..." : "Agendar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function buildMonthGrid(year: number, month: number, meetings: any[]) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  const cells: Array<{ day: number; isCurrentMonth: boolean; isToday: boolean; events: any[] }> = [];

  // Dias do mês anterior para preencher
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isCurrentMonth: false, isToday: false, events: [] });
  }
  // Mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    cellDate.setHours(0,0,0,0);
    const events = meetings.filter(m => {
      const md = new Date(m.dueDate);
      return md.getFullYear() === year && md.getMonth() === month && md.getDate() === d;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    cells.push({ day: d, isCurrentMonth: true, isToday: cellDate.getTime() === today.getTime(), events });
  }
  // Próximo mês para completar 6 linhas (42 células)
  while (cells.length < 42) {
    cells.push({ day: cells.length - daysInMonth - startDow + 1, isCurrentMonth: false, isToday: false, events: [] });
  }
  return cells;
}

async function openInternalWhatsapp(m: any, router: any) {
  if (!m.contact?.id) return;
  const dt = new Date(m.dueDate);
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = dt.toLocaleDateString("pt-BR");
  const msg = `Olá ${m.contact?.name?.split(" ")[0] ?? ""}, este é um lembrete da nossa reunião agendada para ${date} às ${time}h. Confirma sua presença?`;
  const r = await fetch(`/api/contacts/${m.contact.id}/whatsapp-conversation`, { method: "POST" });
  if (r.ok) {
    const j = await r.json();
    router.push(`/whatsapp?c=${j.id}&prefill=${encodeURIComponent(msg)}`);
  }
}

function sendEmailReminder(m: any) {
  const email = m.contact?.email;
  if (!email) return;
  const dt = new Date(m.dueDate);
  const subject = `Lembrete de reunião — ${dt.toLocaleDateString("pt-BR")}`;
  const body = `Olá ${m.contact?.name ?? ""},\n\nEste é um lembrete da nossa reunião agendada para ${dt.toLocaleString("pt-BR")}.\n\nConfirma sua presença?`;
  window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}
