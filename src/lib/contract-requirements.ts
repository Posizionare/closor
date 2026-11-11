// Campos obrigatórios do cliente para gerar contrato.
export type ContactLike = {
  name?: string | null;
  company?: string | null;
  cpfCnpj?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export const REQUIRED_CONTRACT_FIELDS = [
  { key: "company", label: "Nome da empresa" },
  { key: "cpfCnpj", label: "CPF ou CNPJ" },
  { key: "name", label: "Nome do cliente" },
  { key: "address", label: "Endereço do cliente" },
  { key: "email", label: "E-mail do cliente" },
  { key: "phone", label: "Telefone de contato" },
] as const;

/**
 * Retorna a lista de campos faltando para gerar um contrato.
 * Telefone aceita phone OU whatsapp.
 */
export function missingContractFields(c: ContactLike | null | undefined): { key: string; label: string }[] {
  if (!c) return REQUIRED_CONTRACT_FIELDS.map(f => ({ ...f }));
  const missing: { key: string; label: string }[] = [];
  for (const f of REQUIRED_CONTRACT_FIELDS) {
    if (f.key === "phone") {
      if (!c.phone?.trim() && !c.whatsapp?.trim()) missing.push({ key: "phone", label: f.label });
      continue;
    }
    const v = (c as any)[f.key];
    if (!v || !String(v).trim()) missing.push({ key: f.key, label: f.label });
  }
  return missing;
}

export function isReadyForContract(c: ContactLike | null | undefined): boolean {
  return missingContractFields(c).length === 0;
}
