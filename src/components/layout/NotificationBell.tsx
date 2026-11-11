"use client";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell, Trophy, Clock, AlertCircle, Target, Calendar, MessageCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Notif = { id: string; type: string; title: string; body?: string | null; url?: string | null; read: boolean; createdAt: string };

const ICONS: Record<string, any> = {
  DEAL_WON: Trophy,
  DEAL_LOST: AlertCircle,
  CONTRACT_EXPIRING: FileText,
  MEETING_SOON: Calendar,
  GOAL_BEHIND: Target,
  GOAL_ACHIEVED: Trophy,
  TASK_DUE: Clock,
  CONVERSATION_NEW: MessageCircle,
  GENERIC: Bell,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [, start] = useTransition();
  const unread = items.filter(i => !i.read).length;

  async function load() {
    const r = await fetch("/api/notifications").catch(() => null);
    if (r?.ok) setItems(await r.json());
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  async function markAllRead() {
    start(async () => {
      await fetch("/api/notifications/read-all", { method: "POST" });
      load();
    });
  }

  async function openAndMarkAll() {
    setOpen(true);
    await load();
    // Zera o badge automaticamente ao abrir
    if (unread > 0) {
      await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
      load();
    }
  }

  return (
    <div className="relative">
      <button onClick={() => { open ? setOpen(false) : openAndMarkAll(); }} className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
        {unread > 0 && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[hsl(var(--brand))] text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-white rounded-xl border shadow-lg z-50 overflow-hidden flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm">Notificações</span>
              {unread > 0 && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={markAllRead}>Marcar todas como lidas</button>}
            </div>
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Sem notificações.</div>
              ) : items.map(n => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <Link key={n.id} href={n.url ?? "#"} onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 p-3 border-b hover:bg-muted/30 ${!n.read ? "bg-blue-50/50" : ""}`}>
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("pt-BR")}</div>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
