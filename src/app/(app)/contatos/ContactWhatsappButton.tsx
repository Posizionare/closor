"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function ContactWhatsappButton({ contactId, hasNumber }: { contactId: string; hasNumber: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!hasNumber) return null;
  return (
    <Button variant="outline" size="sm" title="Chamar no WhatsApp interno" disabled={pending} onClick={() => {
      start(async () => {
        const r = await fetch(`/api/contacts/${contactId}/whatsapp-conversation`, { method: "POST" });
        if (r.ok) { const j = await r.json(); router.push(`/whatsapp?c=${j.id}`); }
      });
    }}>
      <MessageCircle className="h-3 w-3" />
    </Button>
  );
}
