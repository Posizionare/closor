"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Plus, Trash2, MessageSquare, HelpCircle, Zap, Clock, Type, X,
  GripVertical, Workflow, GitBranch,
} from "lucide-react";
import { saveAutomation } from "../../actions";

type NodeType = "message" | "question" | "action" | "delay";

type Node = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    text?: string;
    label?: string;
    options?: { id: string; label: string; nextNodeId?: string | null }[];
    actionType?: string;
    sectorId?: string | null;
    delaySeconds?: number;
  };
};

type Edge = { id: string; source: string; target: string; sourceHandle?: string; label?: string };

const NODE_W = 240;
const NODE_H = 130;

export function FlowEditor({ automation, sectors }: { automation: any; sectors: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(automation.name);
  const [layout, setLayout] = useState<"esteira" | "fluxograma">(automation.layout ?? "fluxograma");
  const [nodes, setNodes] = useState<Node[]>(automation.nodes ?? []);
  const [edges, setEdges] = useState<Edge[]>(automation.edges ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [linkingFrom, setLinkingFrom] = useState<{ nodeId: string; optionId?: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-layout para esteira
  useEffect(() => {
    if (layout === "esteira") {
      setNodes(prev => prev.map((n, i) => ({ ...n, position: { x: 60, y: 60 + i * (NODE_H + 30) } })));
      // Auto-conecta sequencial
      setEdges(() => {
        const out: Edge[] = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          out.push({ id: `e-${nodes[i].id}-${nodes[i+1].id}`, source: nodes[i].id, target: nodes[i+1].id });
        }
        return out;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  function genId() { return Math.random().toString(36).slice(2, 9); }

  function addNode(type: NodeType) {
    const id = genId();
    const last = nodes[nodes.length - 1];
    const position = last ? { x: last.position.x + 280, y: last.position.y } : { x: 80, y: 80 };
    const baseData: any = {
      message: { text: "Nova mensagem ao cliente." },
      question: { text: "Qual a sua dúvida?", options: [{ id: genId(), label: "Comprar" }, { id: genId(), label: "Suporte" }] },
      action: { actionType: "create_lead", label: "Criar lead no funil" },
      delay: { delaySeconds: 60 },
    };
    setNodes(prev => [...prev, { id, type, position, data: baseData[type] }]);
    setSelected(id);
  }

  function updateNode(id: string, patch: Partial<Node>) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch, data: { ...n.data, ...(patch.data ?? {}) } } : n));
  }
  function updateNodeData(id: string, dataPatch: Partial<Node["data"]>) {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...dataPatch } } : n));
  }
  function deleteNode(id: string) {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    if (selected === id) setSelected(null);
  }

  // Drag de nó
  function onNodeMouseDown(e: React.MouseEvent, id: string) {
    if (layout === "esteira") return;
    e.stopPropagation();
    setDragNodeId(id);
  }
  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setNodes(prev => prev.map(n => n.id === dragNodeId ? {
      ...n, position: { x: Math.max(0, e.clientX - rect.left - NODE_W/2), y: Math.max(0, e.clientY - rect.top - 20) },
    } : n));
  }
  function onCanvasMouseUp() { setDragNodeId(null); }

  // Linking
  function startLink(nodeId: string, optionId?: string) {
    setLinkingFrom({ nodeId, optionId });
  }
  function completeLink(targetId: string) {
    if (!linkingFrom || linkingFrom.nodeId === targetId) { setLinkingFrom(null); return; }
    if (linkingFrom.optionId) {
      // Liga uma opção da pergunta a um nó
      setNodes(prev => prev.map(n => n.id === linkingFrom.nodeId ? {
        ...n, data: { ...n.data, options: (n.data.options ?? []).map(o => o.id === linkingFrom.optionId ? { ...o, nextNodeId: targetId } : o) },
      } : n));
      const eid = `e-${linkingFrom.nodeId}-${linkingFrom.optionId}-${targetId}`;
      const optLabel = nodes.find(n => n.id === linkingFrom.nodeId)?.data.options?.find(o => o.id === linkingFrom.optionId)?.label;
      setEdges(prev => [...prev.filter(e => !(e.source === linkingFrom.nodeId && e.sourceHandle === linkingFrom.optionId)), { id: eid, source: linkingFrom.nodeId, target: targetId, sourceHandle: linkingFrom.optionId, label: optLabel }]);
    } else {
      const eid = `e-${linkingFrom.nodeId}-${targetId}`;
      setEdges(prev => [...prev.filter(e => !(e.source === linkingFrom.nodeId && !e.sourceHandle)), { id: eid, source: linkingFrom.nodeId, target: targetId }]);
    }
    setLinkingFrom(null);
  }

  function save() {
    start(async () => {
      await saveAutomation(automation.id, { name, layout, nodes, edges });
      router.refresh();
    });
  }

  // Calcula viewport (canvas grande pra caber tudo)
  const maxX = Math.max(800, ...nodes.map(n => n.position.x + NODE_W + 60));
  const maxY = Math.max(500, ...nodes.map(n => n.position.y + NODE_H + 60));

  const sel = nodes.find(n => n.id === selected) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card className="overflow-hidden">
        <div className="border-b p-3 flex items-center gap-2 flex-wrap">
          <Link href="/agente-chat"><Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3" /> Voltar</Button></Link>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[300px]" placeholder="Nome da automação" />
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setLayout("esteira")} className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${layout === "esteira" ? "bg-foreground text-background" : "border"}`}><Workflow className="h-3 w-3" /> Esteira</button>
            <button onClick={() => setLayout("fluxograma")} className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${layout === "fluxograma" ? "bg-foreground text-background" : "border"}`}><GitBranch className="h-3 w-3" /> Fluxograma</button>
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => addNode("message")}><MessageSquare className="h-3 w-3" /> Mensagem</Button>
          <Button size="sm" variant="outline" onClick={() => addNode("question")}><HelpCircle className="h-3 w-3" /> Pergunta</Button>
          <Button size="sm" variant="outline" onClick={() => addNode("action")}><Zap className="h-3 w-3" /> Ação</Button>
          <Button size="sm" variant="outline" onClick={() => addNode("delay")}><Clock className="h-3 w-3" /> Espera</Button>
          <Button size="sm" onClick={save} disabled={pending}><Save className="h-3 w-3" /> {pending ? "Salvando..." : "Salvar"}</Button>
        </div>

        <div
          ref={canvasRef}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
          onClick={() => { setSelected(null); setLinkingFrom(null); }}
          className="relative overflow-auto bg-[#FAFAFB] bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)] bg-[length:20px_20px]"
          style={{ minHeight: 560, maxHeight: 600 }}
        >
          <div style={{ position: "relative", width: maxX, height: maxY }}>
            {/* Linhas */}
            <svg className="absolute inset-0 pointer-events-none" width={maxX} height={maxY}>
              <defs>
                <marker id="arrow" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,-5L10,0L0,5" fill="#94A3B8" />
                </marker>
              </defs>
              {edges.map(e => {
                const s = nodes.find(n => n.id === e.source); const t = nodes.find(n => n.id === e.target);
                if (!s || !t) return null;
                const x1 = s.position.x + NODE_W; const y1 = s.position.y + NODE_H/2;
                const x2 = t.position.x; const y2 = t.position.y + 30;
                const mx = (x1 + x2) / 2;
                const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
                return (
                  <g key={e.id}>
                    <path d={path} fill="none" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrow)" />
                    {e.label && (
                      <foreignObject x={(x1+x2)/2 - 50} y={(y1+y2)/2 - 12} width="100" height="24">
                        <div className="text-[10px] bg-white border rounded-full px-2 py-0.5 text-center shadow-sm">{e.label}</div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
              {/* Linha temporária ao linkar */}
              {linkingFrom && (() => {
                const s = nodes.find(n => n.id === linkingFrom.nodeId);
                if (!s) return null;
                return <text x={s.position.x + NODE_W} y={s.position.y + NODE_H/2 - 8} fontSize="10" fill="#F97316">→ Clique no nó destino</text>;
              })()}
            </svg>

            {/* Nós */}
            {nodes.map(n => {
              const isSelected = selected === n.id;
              const isLinking = linkingFrom !== null && linkingFrom.nodeId !== n.id;
              return (
                <div
                  key={n.id}
                  onClick={(e) => { e.stopPropagation(); if (linkingFrom && linkingFrom.nodeId !== n.id) completeLink(n.id); else setSelected(n.id); }}
                  onMouseDown={(e) => onNodeMouseDown(e, n.id)}
                  className={`absolute rounded-xl border-2 bg-white shadow-sm select-none transition-shadow ${isSelected ? "border-[hsl(var(--brand))] shadow-md" : "border-transparent"} ${isLinking ? "ring-2 ring-emerald-300 cursor-pointer" : ""} ${layout === "fluxograma" ? "cursor-grab" : ""}`}
                  style={{ left: n.position.x, top: n.position.y, width: NODE_W }}
                >
                  <NodeCard node={n} sectors={sectors} onStartLink={(opt) => startLink(n.id, opt)} />
                </div>
              );
            })}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Adicione um nó usando os botões acima.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Inspector lateral */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          {!sel ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              Selecione um nó para editar.
              <div className="mt-4 grid gap-2 text-xs text-left bg-muted/30 rounded p-3">
                <div className="flex items-center gap-2"><MessageSquare className="h-3 w-3 text-blue-500" /> <strong>Mensagem</strong> — texto enviado ao cliente</div>
                <div className="flex items-center gap-2"><HelpCircle className="h-3 w-3 text-purple-500" /> <strong>Pergunta</strong> — opções de resposta</div>
                <div className="flex items-center gap-2"><Zap className="h-3 w-3 text-orange-500" /> <strong>Ação</strong> — criar lead, transferir setor</div>
                <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-gray-500" /> <strong>Espera</strong> — aguardar X segundos</div>
              </div>
            </div>
          ) : (
            <NodeInspector node={sel} sectors={sectors} update={(p) => updateNodeData(sel.id, p)} onDelete={() => deleteNode(sel.id)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NodeCard({ node, sectors, onStartLink }: { node: Node; sectors: any[]; onStartLink: (opt?: string) => void }) {
  const headerStyles: Record<NodeType, { color: string; icon: any; label: string }> = {
    message: { color: "#3B82F6", icon: MessageSquare, label: "Mensagem" },
    question: { color: "#A855F7", icon: HelpCircle, label: "Pergunta" },
    action: { color: "#F97316", icon: Zap, label: "Ação" },
    delay: { color: "#6B7280", icon: Clock, label: "Espera" },
  };
  const cfg = headerStyles[node.type];
  const Icon = cfg.icon;
  return (
    <div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-t-lg text-white text-[10px]" style={{ background: cfg.color }}>
        <GripVertical className="h-3 w-3" />
        <Icon className="h-3 w-3" />
        <span className="uppercase tracking-wide">{cfg.label}</span>
      </div>
      <div className="p-2.5 text-xs">
        {node.type === "message" && <div className="line-clamp-3">{node.data.text}</div>}
        {node.type === "question" && (
          <>
            <div className="font-medium mb-1 line-clamp-2">{node.data.text}</div>
            <div className="space-y-1 mt-1">
              {(node.data.options ?? []).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between gap-1 bg-muted/40 rounded px-2 py-1">
                  <span className="truncate">{o.label}</span>
                  <button title="Conectar resposta a outro nó" onClick={(e) => { e.stopPropagation(); onStartLink(o.id); }}
                    className="text-[10px] bg-white border rounded px-1 hover:bg-emerald-50 hover:border-emerald-300">→</button>
                </div>
              ))}
            </div>
          </>
        )}
        {node.type === "action" && (
          <>
            <div className="font-medium">{node.data.label ?? node.data.actionType}</div>
            {node.data.sectorId && <div className="text-muted-foreground mt-0.5">→ {sectors.find(s => s.id === node.data.sectorId)?.name}</div>}
          </>
        )}
        {node.type === "delay" && <div>Aguardar <strong>{node.data.delaySeconds ?? 60}s</strong></div>}
        {node.type !== "question" && (
          <button title="Conectar a próximo nó" onClick={(e) => { e.stopPropagation(); onStartLink(); }}
            className="text-[10px] bg-white border rounded px-2 py-0.5 mt-2 hover:bg-emerald-50 hover:border-emerald-300">Conectar →</button>
        )}
      </div>
    </div>
  );
}

function NodeInspector({ node, sectors, update, onDelete }: { node: Node; sectors: any[]; update: (p: Partial<Node["data"]>) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{node.type.toUpperCase()}</Badge>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>

      {node.type === "message" && (
        <div className="grid gap-1.5">
          <Label>Texto da mensagem</Label>
          <textarea value={node.data.text ?? ""} onChange={(e) => update({ text: e.target.value })} rows={5}
            className="rounded-lg border border-input px-3 py-2 text-sm" placeholder="Olá! Como posso ajudar?" />
          <p className="text-[11px] text-muted-foreground">Use {`{{nome_cliente}}`} para personalizar.</p>
        </div>
      )}

      {node.type === "question" && (
        <>
          <div className="grid gap-1.5">
            <Label>Pergunta</Label>
            <textarea value={node.data.text ?? ""} onChange={(e) => update({ text: e.target.value })} rows={3}
              className="rounded-lg border border-input px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5">
            <Label>Opções de resposta</Label>
            <div className="space-y-1.5">
              {(node.data.options ?? []).map((o, i) => (
                <div key={o.id} className="flex items-center gap-1">
                  <Input value={o.label} onChange={(e) => {
                    const next = [...(node.data.options ?? [])];
                    next[i] = { ...o, label: e.target.value };
                    update({ options: next });
                  }} className="h-8" />
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => {
                    update({ options: (node.data.options ?? []).filter(x => x.id !== o.id) });
                  }}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={() => {
                update({ options: [...(node.data.options ?? []), { id: Math.random().toString(36).slice(2,9), label: "Nova opção" }] });
              }}><Plus className="h-3 w-3" /> Adicionar opção</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Cada opção pode levar a um nó diferente — clique no <strong>→</strong> ao lado da opção no editor.</p>
          </div>
        </>
      )}

      {node.type === "action" && (
        <>
          <div className="grid gap-1.5">
            <Label>Tipo de ação</Label>
            <select value={node.data.actionType ?? "create_lead"} onChange={(e) => update({ actionType: e.target.value })}
              className="h-10 rounded-lg border border-input px-3 text-sm">
              <option value="create_lead">Criar lead no funil</option>
              <option value="assign_sector">Transferir para setor</option>
              <option value="move_stage">Mover etapa do funil</option>
              <option value="end_conversation">Encerrar conversa</option>
            </select>
          </div>
          {node.data.actionType === "assign_sector" && (
            <div className="grid gap-1.5">
              <Label>Setor</Label>
              <select value={node.data.sectorId ?? ""} onChange={(e) => update({ sectorId: e.target.value || null })}
                className="h-10 rounded-lg border border-input px-3 text-sm">
                <option value="">— escolha —</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Rótulo no fluxo</Label>
            <Input value={node.data.label ?? ""} onChange={(e) => update({ label: e.target.value })} placeholder="Como aparece no nó" />
          </div>
        </>
      )}

      {node.type === "delay" && (
        <div className="grid gap-1.5">
          <Label>Espera (segundos)</Label>
          <Input type="number" min={1} value={node.data.delaySeconds ?? 60} onChange={(e) => update({ delaySeconds: Number(e.target.value) || 60 })} />
        </div>
      )}
    </div>
  );
}
