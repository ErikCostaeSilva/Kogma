import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

/** ===== Tipos ===== */
type Company = { id: number; name: string; cnpj: string };

type ProcessItem = {
  name: string;
  planned_date: string | null;
  done?: boolean;
  selected?: boolean; // usado no passo 2 (escolha de processos)
};

type MaterialItem = {
  description: string;
  qty: number;
  unit: "Peças" | "KG" | "M" | "M2" | "M3";
  request?: boolean; // true => não está em estoque (in_stock=false)
};

type OrderRow = {
  id: number;
  company_id: number;
  company_name: string;
  title: string;
  qty: number;
  unit: MaterialItem["unit"];
  client_deadline: string | null; // YYYY-MM-DD
  final_deadline: string | null;  // YYYY-MM-DD
  status: "open" | "late" | "done";
  processes: ProcessItem[];
  materials: { description: string; qty: number; unit: MaterialItem["unit"]; in_stock: boolean }[];
};

/** ===== Constantes/Helpers ===== */
const ALL_UNITS: MaterialItem["unit"][] = ["Peças", "KG", "M", "M2", "M3"];
const ALL_PROCESSES = ["Corte a laser", "Calandragem", "Dobra", "Montagem", "Soldagem", "Pintura"] as const;

function toInputDate(d?: string | null) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  if (isNaN(+dt)) return "";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
function toDbDate(input: string | null | undefined) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (isNaN(+d)) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ====== UI Atômicos ====== */
function StatusPillSelect({
  value,
  onChange,
}: {
  value: OrderRow["status"];
  onChange: (v: OrderRow["status"]) => void;
}) {
  return (
    <div className="status-pill">
      <select
        className="status-select"
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        aria-label="Alterar status"
      >
        <option value="open">Em aberto</option>
        <option value="late">Atrasado</option>
        <option value="done">Finalizado</option>
      </select>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{
  title: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}>) {
  return (
    <button
      className="icon-btn"
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={title}
    >
      {children}
    </button>
  );
}


export default function Pedidos() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"all" | "open" | "late" | "done">("open");
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /** modais */
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [mode, setMode] = useState<"create" | "edit" | "manage-process">("create");
  const [targetId, setTargetId] = useState<number | null>(null);

  /** draft para criar/editar */
  const emptyDraft = useMemo(
    () => ({
      company_id: 0,
      title: "",
      qty: 0,
      unit: "Peças" as MaterialItem["unit"],
      client_deadline: "",
      final_deadline: "",
      processes: ALL_PROCESSES.map((name) => ({
        name,
        selected: true,
        planned_date: "",
        done: false,
      })),
      materials: [] as MaterialItem[],
    }),
    []
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  /** ====== Carregamento ====== */
  useEffect(() => {
    loadCompanies();
  }, []);
  useEffect(() => {
    const t = setTimeout(loadOrders, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  async function loadCompanies() {
    const res = await api("/companies");
    const data = await res.json();
    setCompanies(data.companies || []);
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      params.set("withMaterials", "1");
      params.set("withProcesses", "1");
      const res = await api(`/orders?${params.toString()}`);
      const data = await res.json();

      const list: OrderRow[] = (data.orders || []).map((o: any) => ({
        id: o.id,
        company_id: o.company_id,
        company_name: o.company_name,
        title: o.title,
        qty: Number(o.qty || 0),
        unit: (o.unit || "Peças") as MaterialItem["unit"],
        client_deadline: toInputDate(o.client_deadline),
        final_deadline: toInputDate(o.final_deadline),
        status: o.status,
        processes: (o.processes || []).map((p: any) => ({
          name: p.name,
          planned_date: toInputDate(p.planned_date),
          done: !!p.done,
        })),
        materials: (o.materials || []).map((m: any) => ({
          description: m.description,
          qty: Number(m.qty || 0),
          unit: m.unit || "Peças",
          in_stock: !!m.in_stock,
        })),
      }));
      setOrders(list);
    } finally {
      setLoading(false);
    }
  }

  /** ====== Helpers de estado ====== */
  const toggleExpand = (id: number) =>
    setExpandedId((cur) => (cur === id ? null : id));

  const optimisticUpdate = (id: number, patch: Partial<OrderRow>) => {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  /** ====== Ações topo ====== */
  function openNew() {
    setMode("create");
    setTargetId(null);
    setDraft(emptyDraft);
    setStep(1);
  }
  function openEdit(o: OrderRow) {
    setMode("edit");
    setTargetId(o.id);
    setExpandedId(o.id);
    setDraft({
      company_id: o.company_id,
      title: o.title,
      qty: o.qty,
      unit: o.unit,
      client_deadline: toInputDate(o.client_deadline),
      final_deadline: toInputDate(o.final_deadline),
      processes:
        o.processes.length > 0
          ? ALL_PROCESSES.map((name) => {
              const hit = o.processes.find((p) => p.name === name);
              return {
                name,
                selected: !!hit,
                planned_date: hit ? toInputDate(hit.planned_date) : "",
                done: hit?.done ?? false,
              };
            })
          : ALL_PROCESSES.map((name) => ({
              name,
              selected: false,
              planned_date: "",
              done: false,
            })),
      materials: (o.materials || []).map((m) => ({
        description: m.description,
        qty: m.qty,
        unit: m.unit,
        request: !m.in_stock,
      })),
    });
    setStep(1);
  }
  function openProcesses(o: OrderRow) {
    setMode("manage-process");
    setTargetId(o.id);
    setExpandedId(o.id);
    setDraft({
      company_id: o.company_id,
      title: o.title,
      qty: o.qty,
      unit: o.unit,
      client_deadline: toInputDate(o.client_deadline),
      final_deadline: toInputDate(o.final_deadline),
      processes: ALL_PROCESSES.map((name) => {
         const hit = o.processes.find((p) =>   p.name.localeCompare(name, "pt-BR", { sensitivity: "base" }) === 0);
        return {
          name,
          selected: !!hit,
          planned_date: hit ? toInputDate(hit.planned_date) : "",
          done: hit?.done ?? false,
        };
      }),
      materials: [],
    });
    setStep(2);
  }

  async function changeStatus(id: number, next: OrderRow["status"]) {
    const prev = orders.find((o) => o.id === id)?.status;
    optimisticUpdate(id, { status: next });
    try {
      const res = await api(`/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      optimisticUpdate(id, { status: prev! });
      alert("Não foi possível alterar o status.");
    }
  }

  /** ====== Fluxo dos modais ====== */
  function finishStep1() {
    if (!draft.company_id || !draft.title.trim()) {
      alert("Preencha Empresa e Pedido.");
      return;
    }
    setStep(2);
  }
  function finishStep2() {
    setStep(3);
  }

  async function persistOrder() {
    setSaving(true);
    try {
      const base = {
        company_id: draft.company_id,
        title: draft.title.trim(),
        qty: Number(draft.qty || 0),
        unit: draft.unit,
        client_deadline: toDbDate(draft.client_deadline),
      };

      const processesPayload = draft.processes
        .filter((p) => p.selected)
        .map((p) => ({
          name: p.name,
          planned_date: toDbDate(p.planned_date || undefined),
          done: !!p.done,
        }));

      const materialsPayload = draft.materials.map((m) => ({
        description: m.description.trim(),
        qty: Number(m.qty || 0),
        unit: m.unit,
        in_stock: m.request ? false : true,
      }));

      if (mode === "create") {
        const res = await api("/orders", { method: "POST", body: JSON.stringify(base) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Falha ao criar pedido");

        const newId = data.id as number;

        // processos + prazo final
        const patch1 = { processes: processesPayload, final_deadline: toDbDate(draft.final_deadline) };
        const r1 = await api(`/orders/${newId}`, { method: "PATCH", body: JSON.stringify(patch1) });
        if (!r1.ok) throw new Error(await r1.text());

        if (materialsPayload.length > 0) {
          const r2 = await api(`/orders/${newId}`, {
            method: "PATCH",
            body: JSON.stringify({ materials: materialsPayload }),
          });
          if (!r2.ok) throw new Error(await r2.text());
        }

        await loadOrders();
        setExpandedId(newId);
        setStep(0);
        return;
      }

      if (!targetId) return;

      // === Atualização otimista ===
      if (mode === "edit") {
        const optimisticProcesses: ProcessItem[] = processesPayload.map((p) => ({
          name: p.name,
          planned_date: toInputDate(p.planned_date),
          done: !!p.done,
        }));
        optimisticUpdate(targetId, {
          company_id: draft.company_id,
          company_name: companies.find((c) => c.id === draft.company_id)?.name || "",
          title: draft.title.trim(),
          qty: Number(draft.qty || 0),
          unit: draft.unit,
          client_deadline: toInputDate(draft.client_deadline),
          final_deadline: toInputDate(draft.final_deadline),
          processes: optimisticProcesses,
          materials: materialsPayload.map((m) => ({
            description: m.description,
            qty: m.qty,
            unit: m.unit,
            in_stock: !(!m.in_stock), // mantém shape
          })),
        } as any);
      }
      if (mode === "manage-process") {
        const uiProcesses: ProcessItem[] = processesPayload.map((p) => ({
          name: p.name,
          planned_date: toInputDate(p.planned_date),
          done: !!p.done,
        }));
        optimisticUpdate(targetId, {
          processes: uiProcesses,
          final_deadline: toInputDate(draft.final_deadline),
        });
      }

      // === Persistência real ===
      if (mode === "edit") {
        const rBase = await api(`/orders/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...base, final_deadline: toDbDate(draft.final_deadline) }),
        });
        if (!rBase.ok) throw new Error(await rBase.text());

        const rProc = await api(`/orders/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify({ processes: processesPayload }),
        });
        if (!rProc.ok) throw new Error(await rProc.text());

        const rMat = await api(`/orders/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify({ materials: materialsPayload }),
        });
        if (!rMat.ok) throw new Error(await rMat.text());
      } else if (mode === "manage-process") {
        const r = await api(`/orders/${targetId}`, {
          method: "PATCH",
          body: JSON.stringify({
            processes: processesPayload,
            final_deadline: toDbDate(draft.final_deadline),
          }),
        });
        if (!r.ok) throw new Error(await r.text());
      }

      await loadOrders();
      setExpandedId(targetId);
      setStep(0);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  /** ====== Render ====== */
  return (
    <div className="page-wrap">
      <h1 className="admin-title">PEDIDOS</h1>

      <div className="card pedidos-head">
        {/* Toolbar dentro do mesmo card (filtro, busca, botão) */}
        <div className="toolbar-3">
          <div className="pill">
            <select
              className="pill-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="open">Em aberto</option>
              <option value="late">Atrasado</option>
              <option value="done">Finalizado</option>
              <option value="all">Todos</option>
            </select>
            <svg width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 0.5L7.39344 6.5L14 0.5" stroke="#314C7D"/>
            </svg>

          </div>

          <div className="pill pill-search">
            <input
              className="pill-input"
              placeholder="Pesquisar"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.4704 18.4304L24 24M21.4444 11.2222C21.4444 16.8678 16.8678 21.4444 11.2222 21.4444C5.57664 21.4444 1 16.8678 1 11.2222C1 5.57664 5.57664 1 11.2222 1C16.8678 1 21.4444 5.57664 21.4444 11.2222Z" stroke="#314C7D" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

          </div>

          <button className="pill-btn" onClick={openNew}>Novo Pedido</button>
        </div>

        {/* Lista */}
        <div className="table-body">
          {loading ? (
            <div className="helper">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="helper">Nenhum pedido encontrado.</div>
          ) : (
            orders.map((o) =>
              expandedId === o.id ? (
                <ExpandedOrderCard
                  key={o.id}
                  order={o}
                  onToggle={() => toggleExpand(o.id)}
                  onOpenEdit={() => openEdit(o)}
                  onOpenProcesses={() => openProcesses(o)}
                  onChangeStatus={(v) => changeStatus(o.id, v)}
                />
              ) : (
                <CompactOrderRow
                  key={o.id}
                  order={o}
                  onToggle={() => toggleExpand(o.id)}
                  onOpenEdit={() => openEdit(o)}
                  onOpenProcesses={() => openProcesses(o)}
                  onChangeStatus={(v) => changeStatus(o.id, v)}
                />
              )
            )
          )}
        </div>
      </div>

      {/* ==== Modal Passo 1 ==== */}
      {step === 1 && (
        <Modal title={mode === "edit" ? "EDITAR PEDIDO" : "NOVO PEDIDO"} onClose={() => setStep(0)}>
          <div className="grid-2">
            <div>
              <label>Empresa:</label>
              <div className="select-line" style={{ position:"relative" }}>
                <select
                  className="input line"
                  value={draft.company_id || 0}
                  onChange={(e) => setDraft((d) => ({ ...d, company_id: Number(e.target.value) }))}
                >
                  <option value={0} disabled>Selecione</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Caret />
              </div>
            </div>

            <div>
              <label>Pedido:</label>
              <input
                className="input line"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>

            <div>
              <label>Qtd:</label>
              <div className="qty-wrap">
                <button type="button" onClick={() => setDraft((d) => ({ ...d, qty: Math.max(0, Number(d.qty) - 1) }))}>-</button>
                <input className="qty-input" value={draft.qty} onChange={(e) => setDraft((d)=>({ ...d, qty: Number(e.target.value||0)}))}/>
                <button type="button" onClick={() => setDraft((d) => ({ ...d, qty: Number(d.qty) + 1 }))}>+</button>
              </div>
            </div>

            <div>
              <label>Unidade:</label>
              <div className="select-line" style={{ position:"relative" }}>
                <select
                  className="input line"
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value as any }))}
                >
                  {ALL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <Caret />
              </div>
            </div>

            <div>
              <label>Prazo do Cliente:</label>
              <div className="with-icon">
                <CalendarIcon />
                <input
                  className="input line"
                  type="date"
                  value={toInputDate(draft.client_deadline)}
                  onChange={(e) => setDraft((d) => ({ ...d, client_deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn outline" onClick={() => setStep(0)}>Cancelar</button>
            <button className="btn solid" onClick={finishStep1}>Avançar</button>
          </div>
        </Modal>
      )}

      {/* ==== Modal Passo 2 ==== */}
      {step === 2 && (
        <Modal title="ADMINISTRAR PRAZOS" onClose={() => setStep(0)}>
          <div className="grid-3">
            {draft.processes.map((p, idx) => (
              <div key={p.name}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:4 }}>
                  <label className="checkline" style={{ display:"flex", gap:8, alignItems:"center", fontWeight:700, color:"#2a3f66" }}>
                    <input
                      type="checkbox"
                      checked={!!p.selected}
                      onChange={(e) =>
                        setDraft((d) => {
                          const arr = [...d.processes];
                          arr[idx] = { ...arr[idx], selected: e.target.checked };
                          return { ...d, processes: arr };
                        })
                      }
                    />
                    {p.name}
                  </label>

                  {/* Somente no modo da prancheta mostramos "Concluído" */}
                  {mode === "manage-process" && p.selected && (
                    <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:13 }}>
                      <input
                        type="checkbox"
                        checked={!!p.done}
                        onChange={(e) =>
                          setDraft((d) => {
                            const arr = [...d.processes];
                            arr[idx] = { ...arr[idx], done: e.target.checked };
                            return { ...d, processes: arr };
                          })
                        }
                      />
                      Concluído
                    </label>
                  )}
                </div>

                <div className="with-icon">
                  <CalendarIcon />
                  <input
                    className="input line"
                    type="date"
                    disabled={!p.selected}
                    value={toInputDate(p.planned_date)}
                    onChange={(e) =>
                      setDraft((d) => {
                        const arr = [...d.processes];
                        arr[idx] = { ...arr[idx], planned_date: e.target.value };
                        return { ...d, processes: arr };
                      })
                    }
                  />
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontWeight: 800, color: "#2a3f66", marginTop: 8 }}>Prazo final</div>
              <div className="with-icon">
                <CalendarIcon />
                <input
                  className="input line"
                  type="date"
                  value={toInputDate(draft.final_deadline)}
                  onChange={(e) => setDraft((d) => ({ ...d, final_deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn outline" onClick={() => setStep(0)}>Cancelar</button>
            {mode === "manage-process" ? (
              <button className="btn solid" disabled={saving} onClick={persistOrder}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            ) : (
              <button className="btn solid" onClick={finishStep2}>Avançar</button>
            )}
          </div>
        </Modal>
      )}

      {/* ==== Modal Passo 3 ==== */}
      {step === 3 && (
        <Modal title="MATERIAIS" onClose={() => setStep(0)}>
          <div className="materials-grid-head" style={{ display:"grid", gridTemplateColumns:"1fr 150px 180px 100px", gap:12, fontWeight:800, color:"#2a3f66", marginBottom:8 }}>
            <div>Descrição:</div>
            <div>Qtd:</div>
            <div>Unidade:</div>
            <div>Solicitar?</div>
          </div>

          {draft.materials.map((m, idx) => (
            <div className="mat-row" key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 150px 180px 100px", gap:12, alignItems:"center", marginBottom:10 }}>
              <input
                className="input line"
                value={m.description}
                onChange={(e) =>
                  setDraft((d) => {
                    const arr = [...d.materials];
                    arr[idx] = { ...arr[idx], description: e.target.value };
                    return { ...d, materials: arr };
                  })
                }
              />
              <div className="qty-wrap small">
                <button type="button" onClick={() =>
                  setDraft((d) => {
                    const arr = [...d.materials];
                    arr[idx] = { ...arr[idx], qty: Math.max(0, (arr[idx].qty || 0) - 1) };
                    return { ...d, materials: arr };
                  })
                }>-</button>
                <input
                  className="qty-input"
                  value={m.qty || 0}
                  onChange={(e) =>
                    setDraft((d) => {
                      const arr = [...d.materials];
                      arr[idx] = { ...arr[idx], qty: Number(e.target.value || 0) };
                      return { ...d, materials: arr };
                    })
                  }
                />
                <button type="button" onClick={() =>
                  setDraft((d) => {
                    const arr = [...d.materials];
                    arr[idx] = { ...arr[idx], qty: (arr[idx].qty || 0) + 1 };
                    return { ...d, materials: arr };
                  })
                }>+</button>
              </div>

              <div className="select-line" style={{ position:"relative" }}>
                <select
                  className="input line"
                  value={m.unit}
                  onChange={(e) =>
                    setDraft((d) => {
                      const arr = [...d.materials];
                      arr[idx] = { ...arr[idx], unit: e.target.value as any };
                      return { ...d, materials: arr };
                    })
                  }
                >
                  {ALL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <Caret />
              </div>

              <div style={{ display: "grid", placeItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!m.request}
                  onChange={(e) =>
                    setDraft((d) => {
                      const arr = [...d.materials];
                      arr[idx] = { ...arr[idx], request: e.target.checked };
                      return { ...d, materials: arr };
                    })
                  }
                />
              </div>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 22px" }}>
            <button
              type="button"
              className="btn small"
              onClick={() => setDraft((d) => ({
                ...d,
                materials: [...d.materials, { description: "", qty: 0, unit: "Peças", request: false }],
              }))}
            >
              + Adicionar
            </button>
          </div>

          <div className="modal-actions">
            <button className="btn outline" onClick={() => setStep(0)}>Cancelar</button>
            <button className="btn solid" disabled={saving} onClick={persistOrder}>
              {saving ? "Salvando..." : (mode === "edit" ? "Concluir" : "Concluído")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** ====== Componentes auxiliares ====== */

function CompactOrderRow({
  order,
  onToggle,
  onOpenEdit,
  onOpenProcesses,
  onChangeStatus,
}: {
  order: OrderRow;
  onToggle: () => void;
  onOpenEdit: () => void;
  onOpenProcesses: () => void;
  onChangeStatus: (v: OrderRow["status"]) => void;
}) {
  return (
    <div className="row order-row">
      <div className="order-compact" onClick={onToggle} style={{ cursor: "pointer" }}>
        <div className="company">{order.company_name}</div>
        <div className="order">{order.title} {order.qty ? `(${order.qty} ${order.unit})` : ""}</div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <IconButton title="Processos e prazos" onClick={onOpenProcesses}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0c.55 0 1 .45 1 1h-2c0-.55.45-1 1-1Zm7 18H5V5h2v2h10V5h2v16Z" />
          </svg>
        </IconButton>
        <IconButton title="Editar pedido" onClick={onOpenEdit}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm3.92.92H5.5v-1.41l8.06-8.06 1.41 1.41L6.92 18.17zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </IconButton>
      </div>

      <div style={{ textAlign: "right" }}>
        <StatusPillSelect value={order.status} onChange={onChangeStatus} />
      </div>
    </div>
  );
}

function ExpandedOrderCard({
  order,
  onToggle,
  onOpenEdit,
  onOpenProcesses,
  onChangeStatus,
}: {
  order: OrderRow;
  onToggle: () => void;
  onOpenEdit: () => void;
  onOpenProcesses: () => void;
  onChangeStatus: (v: OrderRow["status"]) => void;
}) {
  return (
    <div className="row" style={{ padding: 0 }}>
      {/* Header escuro (clique para recolher) */}
      <div className="order-header" onClick={onToggle} style={{ cursor: "pointer" }}>
        <div className="title">
          <div className="company">{order.company_name}</div>
          <div className="order">{order.title} {order.qty ? `(${order.qty} ${order.unit})` : ""}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconButton title="Processos e prazos" onClick={(e) => { e.stopPropagation(); onOpenProcesses(); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0c.55 0 1 .45 1 1h-2c0-.55.45-1 1-1Zm7 18H5V5h2v2h10V5h2v16Z" />
            </svg>
          </IconButton>
          <IconButton title="Editar pedido" onClick={(e) => { e.stopPropagation(); onOpenEdit(); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm3.92.92H5.5v-1.41l8.06-8.06 1.41 1.41L6.92 18.17zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </IconButton>
        </div>

        <div style={{ textAlign: "right" }}>
          <StatusPillSelect value={order.status} onChange={onChangeStatus} />
        </div>
      </div>

      {/* Conteúdo expandido: timeline + prazo final */}
      <div className="order-expanded">
        <div className="timeline-card">
          <Timeline processes={order.processes} />
          <div className="process-grid">
            {ALL_PROCESSES.map((name) => {
              const p = order.processes.find((x) => x.name === name);
              return (
                <div key={name}>
                  <div className="process-name">{name}</div>
                  <div className="process-date">{p?.planned_date || "—"}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="deadline-card">
          <div className="label">PRAZO FINAL</div>
          <div className="value">{order.final_deadline || "—"}</div>
        </div>
      </div>
    </div>
  );
}

/** ===== Timeline visual ===== */
function Timeline({ processes }: { processes: ProcessItem[] }) {
  const steps = [...ALL_PROCESSES].map(name => {
    const hit = processes.find(p => p.name === name);
    return { name, done: !!hit?.done };
  });

  let lastDone = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].done) lastDone = i; else break;
  }
  const total = steps.length;
  const fillPercent = total > 1 ? (lastDone <= 0 ? 0 : (lastDone / (total - 1)) * 100) : 0;

  return (
    <div className="process-timeline" aria-label="Linha do tempo dos processos">
      <div className="track" />
      <div className="fill" style={{ width: `calc(${fillPercent}% - 4px)` }} />
      {steps.map((s, i) => {
        const left = total > 1 ? (i / (total - 1)) * 100 : 0;
        return (
          <div
            key={s.name}
            className={`process-dot ${i <= lastDone ? "done" : ""}`}
            style={{ left: `calc(${left}% + 2%)` }}
            title={s.name}
          />
        );
      })}
    </div>
  );
}

/** ===== Modal base ===== */
function Modal({
  title,
  children,
  onClose,
}: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Caret() {
  return (
    <svg className="select-caret" viewBox="0 0 20 20" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M5.5 7.5L10 12l4.5-4.5H5.5z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden style={{ color: "#2a3f66" }}>
      <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm13 8H4v8h16v-8z"/>
    </svg>
  );
}
