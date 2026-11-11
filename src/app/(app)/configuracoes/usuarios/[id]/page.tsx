import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ALL_MODULES, MODULE_LABELS } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updatePermissions, updateUserStatus } from "../actions";
import type { AppModule } from "@prisma/client";
import { Lock } from "lucide-react";

export default async function UserEditPage({ params }: { params: { id: string } }) {
  const session = (await auth())!;
  if (!(session.user as any).isAdmin) notFound();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { permissions: true, sector: true },
  });
  if (!user) notFound();

  const map = new Map(user.permissions.map((p) => [p.module, p]));

  const updateAction = async (fd: FormData) => {
    "use server";
    return updatePermissions(params.id, fd);
  };

  const toggleStatus = async () => {
    "use server";
    return updateUserStatus(params.id, user.status === "ATIVO" ? "INATIVO" : "ATIVO");
  };

  return (
    <>
      <PageHeader
        title={user.name}
        description={`${user.email} · ${user.commercialRole}${user.sector ? ` · ${user.sector.name}` : ""}`}
        actions={
          <form action={toggleStatus}>
            <Button variant="outline" type="submit">
              {user.status === "ATIVO" ? "Inativar" : "Ativar"} usuário
            </Button>
          </form>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Permissões por módulo</CardTitle>
          <CardDescription>
            O módulo <strong>WhatsApp</strong> permanece sempre ativo independentemente desta configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Ver</TableHead>
                  <TableHead>Criar</TableHead>
                  <TableHead>Editar</TableHead>
                  <TableHead>Excluir</TableHead>
                  <TableHead>Exportar</TableHead>
                  <TableHead>Configurar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ALL_MODULES as AppModule[]).map((m) => {
                  const p = map.get(m);
                  const locked = m === "WHATSAPP";
                  return (
                    <TableRow key={m}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {MODULE_LABELS[m]}
                          {locked && <Badge variant="info" className="gap-1"><Lock className="h-3 w-3" /> sempre ativo</Badge>}
                        </div>
                      </TableCell>
                      <Cell name={`${m}_view`} defaultChecked={locked || p?.canView} disabled={locked} />
                      <Cell name={`${m}_create`} defaultChecked={p?.canCreate} />
                      <Cell name={`${m}_edit`} defaultChecked={p?.canEdit} />
                      <Cell name={`${m}_delete`} defaultChecked={p?.canDelete} />
                      <Cell name={`${m}_export`} defaultChecked={p?.canExport} />
                      <Cell name={`${m}_configure`} defaultChecked={p?.canConfigure} />
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4">
              <Button type="submit">Salvar permissões</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function Cell({ name, defaultChecked, disabled }: { name: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <TableCell>
      <input
        type="checkbox"
        name={name}
        defaultChecked={!!defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border-input accent-[hsl(var(--brand))]"
      />
    </TableCell>
  );
}
