"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { createConversionStatus, deleteConversionStatus, saveIntegration, disconnectIntegration } from "./actions";

const META_EVENTS = ["Lead", "CompleteRegistration", "Contact", "CustomizeProduct", "Donate", "FindLocation", "Purchase", "Schedule", "SubmitApplication", "Subscribe"];
const ORIGINS = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "TikTok", "Orgânico", "Manual"];

export function ConversionPanel({ statuses, meta, google }: { statuses: any[]; meta: any; google: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openMeta, setOpenMeta] = useState(false);
  const [openGoogle, setOpenGoogle] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Status do funil de conversões</CardTitle>
              <CardDescription>Configure mensagens e gatilhos por origem.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3 w-3" /> Novo status</Button>
          </CardHeader>
          <CardContent className="p-0">
            {statuses.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nenhum status configurado.</div>
            ) : (
              <ul className="divide-y">
                {statuses.map(s => (
                  <li key={s.id} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.origin}{s.component ? ` · ${s.component}` : ""}</div>
                      {s.triggerMessage && <div className="text-xs italic text-muted-foreground mt-1 truncate max-w-md">"{s.triggerMessage}"</div>}
                    </div>
                    <div className="flex gap-1 items-center">
                      {s.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => start(async () => { await deleteConversionStatus(s.id); router.refresh(); })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Integrações de mídia</CardTitle><CardDescription>Conecte Meta Ads e Google Ads para enviar conversões.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <IntegrationCard name="Meta Ads" connected={!!meta?.connected} onConfig={() => setOpenMeta(true)} onDisconnect={() => start(async () => { await disconnectIntegration("meta_ads"); router.refresh(); })} info={meta?.config?.pixelId ? `Pixel: ${meta.config.pixelId}` : ""} />
            <IntegrationCard name="Google Ads" connected={!!google?.connected} onConfig={() => setOpenGoogle(true)} onDisconnect={() => start(async () => { await disconnectIntegration("google_ads"); router.refresh(); })} info={google?.config?.conversionId ? `Conversion ID: ${google.config.conversionId}` : ""} />
          </CardContent>
        </Card>
      </div>

      {/* Novo status */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo status do funil de conversões</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { const r = await createConversionStatus(fd); if (r?.ok) { setOpen(false); router.refresh(); } })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Nome</Label><Input name="name" required placeholder="Ex.: Lead capturado" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Origem</Label>
                <select name="origin" className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                  {ORIGINS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5"><Label>Componente</Label><Input name="component" placeholder="Ex.: form-popup-home" /></div>
            </div>
            <div className="grid gap-1.5"><Label>Mensagem de gatilho</Label>
              <textarea name="triggerMessage" rows={3} className="rounded-lg border border-input px-3 py-2 text-sm" placeholder="Mensagem enviada quando o evento dispara" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Ativo</label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meta Ads */}
      <Dialog open={openMeta} onOpenChange={setOpenMeta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Integração Meta Ads</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { const r = await saveIntegration("meta_ads", fd); if (r?.ok) { setOpenMeta(false); router.refresh(); } })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Pixel ID *</Label><Input name="pixelId" defaultValue={meta?.config?.pixelId ?? ""} required /></div>
            <div className="grid gap-1.5"><Label>Token de acesso *</Label><Input name="accessToken" type="password" defaultValue={meta?.config?.accessToken ?? ""} required /></div>
            <div className="grid gap-1.5"><Label>Tipo de evento</Label>
              <select name="eventType" defaultValue={meta?.config?.eventType ?? "Lead"} className="h-10 rounded-lg border border-input px-3 text-sm bg-background">
                {META_EVENTS.map(e => <option key={e}>{e}</option>)}
              </select>
              <p className="text-xs text-muted-foreground"><strong>Lead:</strong> quando um cadastro é completado.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Fonte</Label><Input name="source" defaultValue={meta?.config?.source ?? "WhatsApp"} /></div>
              <div className="grid gap-1.5"><Label>Componente</Label><Input name="component" defaultValue={meta?.config?.component ?? ""} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenMeta(false)}>Cancelar</Button><Button type="submit" disabled={pending}>Conectar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Google Ads */}
      <Dialog open={openGoogle} onOpenChange={setOpenGoogle}>
        <DialogContent>
          <DialogHeader><DialogTitle>Integração Google Ads</DialogTitle></DialogHeader>
          <form action={(fd) => start(async () => { const r = await saveIntegration("google_ads", fd); if (r?.ok) { setOpenGoogle(false); router.refresh(); } })} className="grid gap-3">
            <div className="grid gap-1.5"><Label>Conversion ID *</Label><Input name="conversionId" defaultValue={google?.config?.conversionId ?? ""} required /></div>
            <div className="grid gap-1.5"><Label>Conversion Label *</Label><Input name="conversionLabel" defaultValue={google?.config?.conversionLabel ?? ""} required /></div>
            <div className="grid gap-1.5"><Label>Customer ID *</Label><Input name="customerId" defaultValue={google?.config?.customerId ?? ""} required /></div>
            <div className="grid gap-1.5"><Label>Token de acesso</Label><Input name="accessToken" type="password" defaultValue={google?.config?.accessToken ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Fonte</Label><Input name="source" defaultValue={google?.config?.source ?? "WhatsApp"} /></div>
              <div className="grid gap-1.5"><Label>Evento</Label><Input name="event" defaultValue={google?.config?.event ?? "Lead"} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpenGoogle(false)}>Cancelar</Button><Button type="submit" disabled={pending}>Conectar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IntegrationCard({ name, connected, onConfig, onDisconnect, info }: { name: string; connected: boolean; onConfig: () => void; onDisconnect: () => void; info: string }) {
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{info || "Não configurado"}</div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
        <Button size="sm" variant="outline" onClick={onConfig}>Configurar</Button>
        {connected && <Button size="sm" variant="ghost" onClick={onDisconnect}>Desconectar</Button>}
      </div>
    </div>
  );
}
