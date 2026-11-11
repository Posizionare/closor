// Máscaras BR aplicadas no client conforme o usuário digita.

export function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }

export function maskCpfCnpj(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  if (v.length <= 11) {
    // 000.000.000-00
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
      .slice(0, 14);
  }
  // 00.000.000/0000-00
  return v
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
    .slice(0, 18);
}

export function maskPhone(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  if (v.length <= 10) {
    return v
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  }
  return v
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\(\d{2}\) \d{5})(\d)/, "$1-$2");
}

export function maskCurrencyBRL(value: string) {
  const v = onlyDigits(value);
  if (!v) return "";
  const num = Number(v) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function unmaskCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  return Number(cleaned) || 0;
}

// Formata número para WhatsApp (apenas dígitos, com DDI)
export function formatToWhatsappNumber(value: string) {
  const v = onlyDigits(value);
  if (!v) return "";
  if (v.length === 11 || v.length === 10) return `55${v}`;
  return v;
}
