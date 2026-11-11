import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { updateTenant } from "./actions";
import { ManagerSignatureCard } from "./ManagerSignatureCard";

export default async function EmpresaPage() {
  const session = (await auth())!;
  const tenant = await prisma.tenant.findUnique({ where: { id: (session.user as any).tenantId } });

  return (
    <>
      <PageHeader
        title="Empresa / White label"
        description="Personalize a identidade visual e os dados comerciais do CRM."
      />
      <form action={updateTenant} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Branding aplicado a todo o sistema.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field name="systemName" label="Nome do sistema" defaultValue={tenant?.systemName ?? "Closor"} />
            <Field name="name" label="Nome fantasia da empresa" defaultValue={tenant?.name ?? ""} />
            <Field name="legalName" label="Razão social" defaultValue={tenant?.legalName ?? ""} />
            <Field name="cnpj" label="CNPJ" defaultValue={tenant?.cnpj ?? ""} />
            <div className="grid grid-cols-3 gap-3">
              <Field name="primaryColor" label="Cor primária" type="color" defaultValue={tenant?.primaryColor ?? "#0F172A"} />
              <Field name="secondaryColor" label="Cor secundária" type="color" defaultValue={tenant?.secondaryColor ?? "#F97316"} />
              <Field name="accentColor" label="Detalhe" type="color" defaultValue={tenant?.accentColor ?? "#EF4444"} />
            </div>
            <Field name="logoUrl" label="URL do logo" defaultValue={tenant?.logoUrl ?? ""} placeholder="https://..." />
            <Field name="faviconUrl" label="URL do favicon" defaultValue={tenant?.faviconUrl ?? ""} placeholder="https://..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados de contato e bancários</CardTitle>
            <CardDescription>Usados em propostas e contratos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field name="email" label="E-mail comercial" defaultValue={tenant?.email ?? ""} />
            <Field name="phone" label="Telefone" defaultValue={tenant?.phone ?? ""} />
            <Field name="address" label="Endereço" defaultValue={tenant?.address ?? ""} />
            <div className="grid grid-cols-3 gap-3">
              <Field name="bankName" label="Banco" defaultValue={tenant?.bankName ?? ""} />
              <Field name="bankAgency" label="Agência" defaultValue={tenant?.bankAgency ?? ""} />
              <Field name="bankAccount" label="Conta" defaultValue={tenant?.bankAccount ?? ""} />
            </div>
            <Field name="pixKey" label="Chave Pix" defaultValue={tenant?.pixKey ?? ""} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit">Salvar alterações</Button>
        </div>
      </form>

      <div className="mt-4">
        <ManagerSignatureCard
          managerSignatureUrl={tenant?.managerSignatureUrl ?? null}
          managerSignerName={tenant?.managerSignerName ?? ""}
          managerSignerRole={tenant?.managerSignerRole ?? ""}
        />
      </div>
    </>
  );
}

function Field({ name, label, type = "text", defaultValue, placeholder }: { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}
