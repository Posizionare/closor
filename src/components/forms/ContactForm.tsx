"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { formatToWhatsappNumber, onlyDigits } from "@/lib/masks";

const ORIGINS = ["Manual", "Site", "WhatsApp", "Evento", "Google Ads", "Meta Ads", "Instagram", "TikTok", "YouTube", "Orgânico", "Indicação"];

type Props = {
  contact?: any;
  users?: any[];
  onSubmit: (formData: FormData) => Promise<any>;
  onDelete?: () => Promise<any>;
};

export function ContactForm({ contact, users = [], onSubmit, onDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [delPending, startDel] = useTransition();

  async function openWhatsapp() {
    if (!contact?.id) { alert("Salve o contato primeiro."); return; }
    const r = await fetch(`/api/contacts/${contact.id}/whatsapp-conversation`, { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      router.push(`/whatsapp?c=${j.id}`);
    }
  }

  return (
    <form
      action={(fd) => start(async () => {
        const r = await onSubmit(fd);
        if (r?.ok && !contact) router.push("/contatos");
        if (r?.ok && contact) router.refresh();
      })}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle><CardDescription>Dados básicos do contato.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5"><Label>Nome *</Label><Input name="name" defaultValue={contact?.name ?? ""} required /></div>
          <div className="grid gap-1.5"><Label>Empresa</Label><Input name="company" defaultValue={contact?.company ?? ""} /></div>
          <div className="grid gap-1.5"><Label>CPF / CNPJ</Label><MaskedInput mask="cpfcnpj" name="cpfCnpj" defaultValue={contact?.cpfCnpj} placeholder="000.000.000-00 ou 00.000.000/0000-00" /></div>
          <div className="grid gap-1.5">
            <Label>Origem</Label>
            <select name="origin" defaultValue={contact?.origin ?? "Manual"} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
              {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {users.length > 0 && (
            <div className="grid gap-1.5">
              <Label>Vendedor responsável</Label>
              <select name="ownerId" defaultValue={contact?.ownerId ?? ""} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                <option value="">— sem responsável —</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contato</CardTitle>
              <CardDescription>Como falar com este lead.</CardDescription>
            </div>
            {contact && (
              <Button type="button" variant="outline" size="sm" onClick={openWhatsapp}>
                <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={contact?.email ?? ""} /></div>
          <div className="grid gap-1.5"><Label>Telefone</Label><MaskedInput mask="phone" name="phone" defaultValue={contact?.phone} placeholder="(00) 00000-0000" /></div>
          <div className="grid gap-1.5"><Label>WhatsApp</Label><MaskedInput mask="phone" name="whatsapp" defaultValue={contact?.whatsapp} placeholder="(00) 00000-0000" /></div>
          <div className="grid gap-1.5"><Label>Endereço</Label><Input name="address" defaultValue={contact?.address ?? ""} /></div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardContent>
          <textarea name="notes" defaultValue={contact?.notes ?? ""} rows={4}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            placeholder="Anotações, contexto de negócio, próximos passos..." />
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-between">
        {onDelete && contact ? (
          <Button type="button" variant="destructive" disabled={delPending}
            onClick={() => { if (confirm("Excluir contato?")) startDel(async () => { await onDelete(); }); }}>
            {delPending ? "Excluindo..." : "Excluir contato"}
          </Button>
        ) : <span />}
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
