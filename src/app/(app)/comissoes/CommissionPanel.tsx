"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { setCommissionRate } from "./actions";
import { Save, TrendingUp } from "lucide-react";

export function CommissionPanel({ rows }: { rows: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<Record<string, number>>({});

  function update(id: string, value: number) {
    setEdits(prev => ({ ...prev, [id]: value }));
  }

  function save(id: string) {
    const v = edits[id];
    if (v == null) return;
    start(async () => {
      await setCommissionRate(id, v);
      setEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="text-left p-3">Vendedor</th>
              <th className="text-left p-3">Função</th>
              <th className="text-right p-3">Contratos</th>
              <th className="text-right p-3">Valor vendido</th>
              <th className="text-center p-3">% Comissão</th>
              <th className="text-right p-3">Comissão a pagar</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-12">Nenhum vendedor com função comercial cadastrado.</td></tr>
            ) : rows.map((r) => {
              const editing = r.id in edits;
              const currentRate = editing ? edits[r.id] : r.rate;
              const projectedCommission = (r.value * currentRate) / 100;
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/10">
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    {r.jobTitle && <div className="text-xs text-muted-foreground">{r.jobTitle}</div>}
                  </td>
                  <td className="p-3"><Badge variant="outline">{r.role}</Badge></td>
                  <td className="p-3 text-right font-medium">{r.count}</td>
                  <td className="p-3 text-right text-emerald-600 font-semibold">{formatCurrency(r.value)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="number" step="0.01" min="0" max="100"
                        value={currentRate}
                        onChange={(e) => update(r.id, Number(e.target.value))}
                        className="h-8 w-20 text-center"
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                      {editing && (
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 ml-1" onClick={() => save(r.id)} disabled={pending}>
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className={`font-semibold ${editing ? "text-[hsl(var(--brand))]" : ""}`}>
                      {formatCurrency(projectedCommission)}
                    </div>
                    {editing && <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1"><TrendingUp className="h-2.5 w-2.5" /> não salvo</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/20">
            <tr>
              <td colSpan={2} className="p-3 font-medium">Total</td>
              <td className="p-3 text-right font-semibold">{rows.reduce((a, r) => a + r.count, 0)}</td>
              <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(rows.reduce((a, r) => a + r.value, 0))}</td>
              <td></td>
              <td className="p-3 text-right font-semibold text-[hsl(var(--brand))]">{formatCurrency(rows.reduce((a, r) => a + r.commission, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
