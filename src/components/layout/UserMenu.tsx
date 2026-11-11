"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { Settings, Users, LogOut, ChevronDown } from "lucide-react";

export function UserMenu({ user, isAdmin }: { user: { name?: string | null; email?: string | null }; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full border border-border px-1.5 py-1 hover:bg-muted/50 transition-colors"
      >
        <Avatar className="h-7 w-7"><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar>
        <span className="text-sm font-medium hidden sm:inline">{user.name?.split(" ")[0]}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border bg-white shadow-md z-50 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
          <div className="py-1">
            <Link href="/configuracoes" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50" onClick={() => setOpen(false)}>
              <Settings className="h-4 w-4" /> Configurações
            </Link>
            {isAdmin && (
              <Link href="/configuracoes/equipe" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50" onClick={() => setOpen(false)}>
                <Users className="h-4 w-4" /> Equipe
              </Link>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
