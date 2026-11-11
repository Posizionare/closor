import Link from "next/link";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { ContactWhatsappButton } from "./ContactWhatsappButton";

export default async function ContactsPage({ searchParams }: { searchParams: { q?: string } }) {
  await requireModule("CONTATOS");
  const { tenantId } = await getTenant();
  const q = searchParams.q?.trim() ?? "";
  const where: any = { tenantId };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { whatsapp: { contains: q } },
      { cpfCnpj: { contains: q } },
    ];
  }
  const contacts = await prisma.contact.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    include: { _count: { select: { deals: true, conversations: true, tasks: true } } },
  });

  return (
    <>
      <PageHeader
        title="Contatos"
        description={`${contacts.length} contato(s)${q ? ` para "${q}"` : ""}`}
        actions={
          <Link href="/contatos/novo">
            <Button><Plus className="h-4 w-4" /> Novo contato</Button>
          </Link>
        }
      />

      <Card>
        <CardHeader className="border-b">
          <form method="GET" className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="Buscar por nome, empresa, e-mail, telefone, CPF/CNPJ..." className="pl-9" />
            </div>
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/contatos/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                    {c.cpfCnpj && <div className="text-[11px] text-muted-foreground">{c.cpfCnpj}</div>}
                  </TableCell>
                  <TableCell>
                    {c.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3 text-muted-foreground" />{c.email}</div>}
                    {(c.whatsapp || c.phone) && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3 text-muted-foreground" />{c.whatsapp || c.phone}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{c.origin ?? "Manual"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c._count.deals > 0 && <Badge variant="info">{c._count.deals} deals</Badge>}
                      {c._count.conversations > 0 && <Badge variant="success">{c._count.conversations} conversas</Badge>}
                      {c._count.tasks > 0 && <Badge variant="warning">{c._count.tasks} tarefas</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <ContactWhatsappButton contactId={c.id} hasNumber={!!(c.whatsapp || c.phone)} />
                      <Link href={`/contatos/${c.id}`}><Button variant="outline" size="sm">Editar</Button></Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Nenhum contato encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
