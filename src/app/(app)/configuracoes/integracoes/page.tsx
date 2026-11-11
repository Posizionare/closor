import { redirect } from "next/navigation";

// Integrações agora ficam dentro de Configurações
export default function IntegracoesRedirect() {
  redirect("/integracoes");
}
