import { notFound } from "next/navigation";
import Link from "next/link";
import { requireModule } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactForm } from "@/components/forms/ContactForm";
import { updateContact, deleteContact, setContactOwner } from "../actions";
import { ContactTabs } from "./ContactTabs";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  await requireModule("CONTATOS", "view");
  const { tenantId } = await getTenant();

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, tenantId },
    include: {
      owner: true,
      deals: { orderBy: { createdAt: "desc" }, include: { stage: true, owner: true } },
      tasks: { orderBy: { dueDate: "asc" }, take: 10 },
      conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
      contracts: { orderBy: { createdAt: "desc" }, include: { owner: true } },
      assignments: { orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });
  if (!contact) notFound();

  const users = await prisma.user.findMany({ where: { tenantId, status: "ATIVO" }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader
        title={contact.name}
        description={contact.company ? `${contact.company} · ${contact.origin ?? "Manual"}` : (contact.origin ?? "Manual")}
        actions={<Link href="/contatos"><Button variant="ghost">Voltar</Button></Link>}
      />

      <ContactForm
        contact={contact}
        users={JSON.parse(JSON.stringify(users))}
        onSubmit={async (fd) => { "use server"; return updateContact(contact.id, fd); }}
        onDelete={async () => { "use server"; return deleteContact(contact.id); }}
      />

      <div className="mt-6">
        <ContactTabs
          contact={JSON.parse(JSON.stringify(contact))}
          users={JSON.parse(JSON.stringify(users))}
          setOwnerAction={async (uid: string) => { "use server"; return setContactOwner(contact.id, uid); }}
        />
      </div>
    </>
  );
}
