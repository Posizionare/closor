import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getTenant() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as any;
  return { tenantId: u.tenantId as string, userId: u.id as string, isAdmin: !!u.isAdmin, role: u.commercialRole as string, name: session.user.name as string };
}
