import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUser } from "./actions";
import { CommercialRole } from "@prisma/client";

export default async function UsuariosPage() {
  const session = (await auth())!;
  if (!(session.user as any).isAdmin) {
    return (
      <Card><CardHeader><CardTitle>Acesso restrito</CardTitle><CardDescription>Apenas administradores podem gerenciar usuários.</CardDescription></CardHeader></Card>
    );
  }
  const tenantId = (session.user as any).tenantId as string;
  const [users, sectors] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      include: { sector: true, _count: { select: { permissions: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sector.findMany({ where: { tenantId } }),
  ]);

  return (
    <>
      <PageHeader title="Usuários" description="Gerencie usuários, funções e permissões." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.commercialRole}</Badge>
                      {u.isAdmin && <Badge variant="info" className="ml-2">Admin</Badge>}
                    </TableCell>
                    <TableCell>{u.sector?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ATIVO" ? "success" : "danger"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/configuracoes/usuarios/${u.id}`}>
                        <Button variant="outline" size="sm">Editar permissões</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar usuário</CardTitle>
            <CardDescription>Novos usuários começam com acesso apenas ao WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createUser} className="grid gap-3">
              <div className="grid gap-1.5"><Label>Nome</Label><Input name="name" required /></div>
              <div className="grid gap-1.5"><Label>E-mail</Label><Input name="email" type="email" required /></div>
              <div className="grid gap-1.5"><Label>Senha</Label><Input name="password" type="password" minLength={6} required /></div>
              <div className="grid gap-1.5"><Label>Telefone</Label><Input name="phone" /></div>
              <div className="grid gap-1.5"><Label>Cargo</Label><Input name="jobTitle" placeholder="Ex.: Executivo de vendas" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Setor</Label>
                  <select name="sectorId" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Função comercial</Label>
                  <select name="commercialRole" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {Object.values(CommercialRole).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5"><Label>Meta mensal (R$)</Label><Input name="monthlyGoal" type="number" step="0.01" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAdmin" /> Administrador</label>
              <Button type="submit">Criar usuário</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
