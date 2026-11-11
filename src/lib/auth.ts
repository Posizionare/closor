import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { AppModule, CommercialRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      isAdmin: boolean;
      commercialRole: CommercialRole;
      permissions: Array<{ module: AppModule; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean; canConfigure: boolean }>;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { permissions: true },
        });
        if (!user || !user.passwordHash) return null;
        if (user.status !== "ATIVO") return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: (user as any).id },
          include: { permissions: true },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.tenantId = dbUser.tenantId;
          token.isAdmin = dbUser.isAdmin;
          token.commercialRole = dbUser.commercialRole;
          token.permissions = dbUser.permissions.map((p) => ({
            module: p.module,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canExport: p.canExport,
            canConfigure: p.canConfigure,
          }));
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.uid as string;
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).isAdmin = !!token.isAdmin;
        (session.user as any).commercialRole = token.commercialRole as CommercialRole;
        (session.user as any).permissions = (token.permissions ?? []) as any;
      }
      return session;
    },
  },
});
