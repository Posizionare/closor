import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactForm } from "@/components/forms/ContactForm";
import { createContact } from "../actions";

export default async function NewContactPage() {
  await requireModule("CONTATOS", "create");
  const { tenantId } = await getTenant();
  const users = await prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Novo contato" description="Cadastre um lead ou cliente." />
      <ContactForm
        users={JSON.parse(JSON.stringify(users))}
        onSubmit={async (fd) => { "use server"; return createContact(fd); }}
      />
    </>
  );
}
