import { LoginForm } from "@/components/auth/LoginForm";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  const tenant = await prisma.tenant.findFirst().catch(() => null);
  const name = tenant?.systemName ?? "Closor";

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-white">
      {/* Lado esquerdo — formulário */}
      <div className="flex flex-col p-8 lg:p-12">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--brand))] text-white font-bold">
            {(name[0] ?? "C").toUpperCase()}
          </span>
          <span className="text-lg font-bold tracking-tight">{name}</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <LoginForm />
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} {name} · Todos os direitos reservados</div>
      </div>

      {/* Lado direito — painel ilustrativo */}
      <div className="hidden lg:flex relative overflow-hidden m-3 rounded-2xl bg-[hsl(var(--primary))]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 70%, #fff 0, transparent 35%)",
          }}
        />
        <div className="relative flex flex-col justify-between p-12 text-white w-full">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            CRM completo para times comerciais
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight">
              Centralize seu comercial.<br />Venda mais com clareza.
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              Atendimento WhatsApp, funil de vendas, propostas, contratos digitais, metas, comissões e financeiro — tudo em uma plataforma só.
            </p>

            {/* Mini-cards ilustrativos */}
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
              {[
                { t: "Funil automático", d: "Lead vira oportunidade sozinho" },
                { t: "Propostas digitais", d: "Aceite com 1 clique" },
                { t: "Contratos assinados", d: "Assinatura eletrônica" },
                { t: "Financeiro integrado", d: "Receita em tempo real" },
              ].map((c) => (
                <div key={c.t} className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/10">
                  <div className="font-medium text-sm">{c.t}</div>
                  <div className="text-xs text-white/60 mt-1">{c.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/50">Powered by Closor</div>
        </div>
      </div>
    </div>
  );
}
