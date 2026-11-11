"use client";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      router.replace(search.get("callbackUrl") ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-bold tracking-tight">Acesse sua conta</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-7">
        Entre com seu e-mail e senha para continuar.
      </p>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" className="h-11 bg-[#F8FAFC] border-transparent" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input id="password" type={showPass ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-[#F8FAFC] border-transparent pr-10" />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-xs font-medium text-[hsl(var(--brand))] hover:underline">
            Esqueceu a senha?
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <Button type="submit" disabled={isPending} className="h-11 mt-1 text-base">
          {isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="mt-6 rounded-lg bg-[#F8FAFC] px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Acesso demo: <span className="font-medium text-foreground">admin@demo.com</span> / <span className="font-medium text-foreground">admin123</span>
        </p>
      </div>
    </div>
  );
}
