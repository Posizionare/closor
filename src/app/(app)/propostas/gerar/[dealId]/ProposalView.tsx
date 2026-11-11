"use client";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle, Mail, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function ProposalView({ deal, tenant, template }: { deal: any; tenant: any; template: any }) {
  const router = useRouter();
  const items = deal.items ?? [];
  const subtotalProducts = items.filter((it: any) => it.product?.billing !== "MENSAL").reduce((a: number, it: any) => a + Number(it.unitPrice) * it.quantity - Number(it.discount ?? 0), 0);
  const subtotalServices = items.filter((it: any) => it.product?.billing === "MENSAL").reduce((a: number, it: any) => a + Number(it.unitPrice) * it.quantity * (it.product?.durationMonths ?? 1) - Number(it.discount ?? 0), 0);
  const subtotalGeral = subtotalProducts + subtotalServices;
  const totalDiscount = items.reduce((a: number, it: any) => a + Number(it.discount ?? 0), 0);
  const valorFinal = items.length === 0 ? Number(deal.value ?? 0) : Math.max(0, subtotalGeral);

  const issueDate = new Date();
  const validity = template?.validityDays ?? 15;
  const validUntil = new Date(issueDate.getTime() + validity * 24 * 3600 * 1000);
  const proposalNumber = `ORC${String(Math.abs(parseInt(deal.id.slice(-8), 36)) % 100000).padStart(5, "0")}`;
  const primary = template?.primaryColor ?? tenant.secondaryColor ?? "#F97316";

  const installments = generateInstallments(valorFinal, deal, items);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
        }
        .page { width: 210mm; min-height: 297mm; padding: 18mm 18mm; background: white; margin: 16px auto; box-shadow: 0 1px 3px rgba(0,0,0,.1); font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; color: #1E293B; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push(`/propostas/montar/${deal.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <div className="font-semibold">Proposta {proposalNumber}</div>
            <div className="text-xs text-muted-foreground">Cliente: {deal.contact?.name ?? "—"}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const phone = deal.contact?.whatsapp?.replace(/\D/g, "");
            const link = window.location.href;
            const msg = `Olá ${deal.contact?.name ?? ""}! Segue sua proposta: ${link}`;
            window.open(`https://wa.me/${phone ?? ""}?text=${encodeURIComponent(msg)}`, "_blank");
          }}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
          <Button variant="outline" onClick={() => {
            const email = deal.contact?.email ?? "";
            const subject = `Proposta ${proposalNumber} — ${tenant.name}`;
            const body = `Olá ${deal.contact?.name ?? ""},\n\nSegue sua proposta: ${window.location.href}\n\n${tenant.name}`;
            window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          }}><Mail className="h-4 w-4" /> E-mail</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
        </div>
      </div>

      {/* PÁGINA DE CAPA — fixa em 210x297mm para nunca quebrar */}
      {template?.coverUrl && (
        <div className="page" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
          <img src={template.coverUrl} alt=""
            style={{ width: "210mm", height: "297mm", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", top: "55%", left: "10%", right: "10%", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 14, opacity: 0.85, textTransform: "uppercase", letterSpacing: 4 }}>Proposta comercial</div>
            <h1 style={{ fontSize: 42, fontWeight: 700, margin: "8px 0", lineHeight: 1.1 }}>{deal.title}</h1>
            <div style={{ fontSize: 18, marginTop: 16 }}>Para: <strong>{deal.contact?.name ?? "—"}</strong></div>
            <div style={{ fontSize: 13, marginTop: 28, opacity: 0.9 }}>
              Emitida em {formatDate(issueDate)} · Validade {formatDate(validUntil)}
            </div>
          </div>
        </div>
      )}

      <div className="page">
        {/* Topo: data | número da proposta */}
        <div className="flex justify-between items-start text-[12px] text-muted-foreground">
          <span>{formatDate(issueDate)} · Validade: {formatDate(validUntil)}</span>
          <span>Proposta <strong className="text-foreground">{proposalNumber}</strong></span>
        </div>

        {/* Cabeçalho: logo | empresa emissora | atendente */}
        <div className="grid grid-cols-12 gap-4 mt-4 pb-4 border-b">
          <div className="col-span-2 flex items-start">
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt="" className="h-12 max-w-[100px] object-contain" />
              : <div className="h-12 w-12 rounded-lg flex items-center justify-center text-xl font-bold text-white" style={{ background: primary }}>{tenant.systemName?.[0] ?? "C"}</div>}
          </div>
          <div className="col-span-7 text-[12px] leading-relaxed">
            <div className="font-bold text-[14px]">{tenant.legalName ?? tenant.name}</div>
            {tenant.cnpj && <div><strong>CNPJ:</strong> {tenant.cnpj}</div>}
            {tenant.address && <div><strong>Endereço:</strong> {tenant.address}</div>}
          </div>
          <div className="col-span-3 text-[12px] leading-relaxed text-right">
            <div className="font-bold text-[14px]">Contato</div>
            {deal.owner?.name && <div>{deal.owner.name}</div>}
            {deal.owner?.email && <div>{deal.owner.email}</div>}
            {(deal.owner?.phone || tenant.phone) && <div>{deal.owner?.phone ?? tenant.phone}</div>}
          </div>
        </div>

        {/* Dados da pessoa | Dados da empresa */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-[12px]">
          <Block title="Dados da pessoa" rows={[
            ["Nome completo", deal.contact?.name],
            ["E-mails", deal.contact?.email],
            ["Telefones", deal.contact?.phone ?? deal.contact?.whatsapp],
          ]} />
          <Block title="Dados da empresa" rows={[
            ["Razão social", deal.contact?.company],
            ["Nome empresa", deal.contact?.company],
            ["CNPJ", deal.contact?.cpfCnpj],
            ["E-mails", deal.contact?.email],
            ["Telefones", deal.contact?.phone ?? deal.contact?.whatsapp],
            ["Endereço", deal.contact?.address],
          ]} />
        </div>

        {/* Produtos e serviços */}
        <div className="mt-6">
          <h3 className="font-bold text-[14px] mb-3">Produtos e serviços:</h3>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-muted-foreground border-b" style={{ fontSize: 11 }}>
                <th className="text-left py-2 w-12">Qtd.</th>
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2 w-28">Valor unit.</th>
                <th className="text-right py-2 w-28">Desconto</th>
                <th className="text-right py-2 w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="border-b">
                  <td className="py-3 text-center">1</td>
                  <td className="py-3">
                    <div className="font-semibold">{deal.title}</div>
                    <div className="text-[11px] text-muted-foreground">Detalhamento do escopo será enviado conforme alinhamento comercial.</div>
                  </td>
                  <td className="text-right">{formatCurrency(Number(deal.value || 0))}</td>
                  <td className="text-right text-muted-foreground">—</td>
                  <td className="text-right">{formatCurrency(Number(deal.value || 0))}</td>
                </tr>
              ) : items.map((it: any, idx: number) => {
                const unit = Number(it.unitPrice);
                const desc = Number(it.discount ?? 0);
                const months = it.product?.durationMonths ?? 1;
                const isMonthly = it.product?.billing === "MENSAL";
                const sub = isMonthly ? unit * it.quantity * months - desc : unit * it.quantity - desc;
                const descPercent = unit > 0 ? Math.round((desc / (unit * it.quantity)) * 1000) / 10 : 0;
                return (
                  <tr key={idx} className="border-b align-top">
                    <td className="py-3">{it.quantity}</td>
                    <td className="py-3">
                      <div className="font-semibold">{it.product?.name ?? "Item"}{isMonthly && <span className="ml-1 text-[10px] text-muted-foreground">(mensal · {months}m)</span>}</div>
                      {it.product?.description && (
                        <div className="text-[11px] text-muted-foreground whitespace-pre-line mt-1">{it.product.description}</div>
                      )}
                    </td>
                    <td className="text-right py-3">{formatCurrency(unit)}{isMonthly && <div className="text-[10px] text-muted-foreground">/mês</div>}</td>
                    <td className="text-right py-3">
                      {desc > 0 ? <>{formatCurrency(desc)}<div className="text-[10px] text-muted-foreground">({descPercent}%)</div></> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right py-3">{formatCurrency(sub)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resumo + Plano de pagamento */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div>
            <h3 className="font-bold text-[14px] mb-3 border-b pb-2">Resumo da proposta:</h3>
            <dl className="text-[12px] space-y-1.5">
              <Row label="Subtotal em produtos:" value={formatCurrency(subtotalProducts)} />
              <Row label="Subtotal em serviços:" value={formatCurrency(subtotalServices)} />
              <Row label="Subtotal geral:" value={formatCurrency(subtotalGeral)} bold />
              {totalDiscount > 0 && <Row label="Descontos:" value={`- ${formatCurrency(totalDiscount)}`} />}
              <div className="pt-2 mt-1 border-t">
                <Row label="Valor final:" value={formatCurrency(valorFinal)} bold large />
              </div>
            </dl>
          </div>
          {installments.length > 0 && (
            <div>
              <h3 className="font-bold text-[14px] mb-3 border-b pb-2">Plano de pagamento</h3>
              <table className="w-full text-[12px]">
                <tbody>
                  {installments.map((inst, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-1.5 text-muted-foreground">{inst.label}:</td>
                      <td className="py-1.5 text-right">{formatCurrency(inst.value)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{inst.date}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{inst.method}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-foreground/40 mt-1">
                    <td colSpan={2} className="py-2 font-bold">Valor total a prazo:</td>
                    <td colSpan={2} className="py-2 text-right font-bold">{formatCurrency(installments.reduce((a, i) => a + i.value, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Termos comerciais (se houver) */}
        {template?.commercialTerms && (
          <div className="mt-8 text-[11px] text-muted-foreground border-t pt-3">
            <h4 className="font-semibold text-foreground mb-2">Condições comerciais</h4>
            <p className="whitespace-pre-line">{template.commercialTerms}</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-8 pt-3 border-t text-[10px] text-muted-foreground text-center">
          {template?.footer ?? `${tenant.legalName ?? tenant.name} · ${tenant.email ?? ""} · ${tenant.phone ?? ""}`}
        </div>
      </div>

      {/* Páginas de encerramento (se houver imagens) */}
      {(() => {
        const closing: string[] = template?.closingImages ? (() => { try { return JSON.parse(template.closingImages); } catch { return []; } })() : (template?.closingUrl ? [template.closingUrl] : []);
        return closing.filter(Boolean).map((src, i) => (
          <div key={i} className="page" style={{ padding: 0 }}>
            <img src={src} alt="" style={{ width: "210mm", height: "297mm", objectFit: "cover", display: "block" }} />
          </div>
        ));
      })()}
    </div>
  );
}

// Plano de pagamento — gera entrada + parcelas com base nos itens
function generateInstallments(total: number, deal: any, items: any[]) {
  if (total <= 0) return [];
  // Se tem item mensal, faz mensalidades
  const monthly = items.find((it: any) => it.product?.billing === "MENSAL");
  if (monthly) {
    const months = monthly.product?.durationMonths ?? 12;
    const paymentDay = monthly.paymentDay ?? 5;
    const monthlyTotal = items.filter((it: any) => it.product?.billing === "MENSAL")
      .reduce((a: number, it: any) => a + Number(it.unitPrice) * it.quantity, 0);
    const out: any[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setDate(paymentDay);
      d.setMonth(d.getMonth() + i + 1);
      out.push({
        label: i === 0 ? "1ª mensalidade" : `${i + 1}ª mensalidade`,
        value: monthlyTotal,
        date: d.toLocaleDateString("pt-BR"),
        method: "C.Crédito",
      });
    }
    return out;
  }
  // Senão, distribui em até 6 parcelas iguais
  const parts = 6;
  const each = Math.round((total / parts) * 100) / 100;
  const out: any[] = [];
  for (let i = 0; i < parts; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    d.setDate(5);
    out.push({
      label: i === 0 ? "Entrada" : `${i}ª parc.`,
      value: each,
      date: d.toLocaleDateString("pt-BR"),
      method: "C.Crédito",
    });
  }
  return out;
}

function Block({ title, rows }: { title: string; rows: Array<[string, any]> }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="font-semibold mb-2 text-[12px]">{title}</div>
      <dl className="space-y-1">
        {rows.filter(([_, v]) => v).map(([k, v]) => (
          <div key={k} className="leading-tight">
            <strong>{k}:</strong> <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Row({ label, value, bold, large }: { label: string; value: string; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-bold" : ""} ${large ? "text-base" : ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
