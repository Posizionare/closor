import { redirect } from "next/navigation";

// "Equipe e permissões" reutiliza a página de Usuários
export default function EquipeRedirect() {
  redirect("/configuracoes/usuarios");
}
