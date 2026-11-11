import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

async function createSector(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !(session.user as any).isAdmin) return;
  const tenantId = (session.user as any).tenantId as string;
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#94A3B8");
  if (!name) return;
  await prisma.sector.create({ data: { tenantId, name, color } });
  revalidatePath("/configuracoes/setores");
}

export default async function SectorsPage() {
  const session = (await auth())!;
  const tenantId = (session.user as any).tenantId as string;
  const sectors = await prisma.sector.findMany({ where: { tenantId }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Setores" description="Organize a equipe e direcione atendimentos." />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <Card>
          <CardHeader><CardTitle>Setores cadastrados</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nome</TableHead><TableHead>Cor</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <span className="inline-block h-4 w-4 rounded-full mr-2 align-middle" style={{ background: s.color ?? "#94A3B8" }} />
                      <span className="text-xs text-muted-foreground">{s.color}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adicionar setor</CardTitle>
            <CardDescription>Direcione filas e fluxos de chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createSector} className="grid gap-3">
              <div className="grid gap-1.5"><Label>Nome</Label><Input name="name" required /></div>
              <div className="grid gap-1.5"><Label>Cor</Label><Input name="color" type="color" defaultValue="#F97316" /></div>
              <Button type="submit">Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
