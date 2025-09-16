import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import StatusFilterPill, { StatusFilterValue } from "../components/StatusFilterPill";
import SearchPill from "../components/SearchPill";
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
function toBrDate(d?: string | null) {
  if (!d) return "—";
  // já estiver ISO
  let iso = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    iso = d;
  } else {
    // tenta normalizar usando o helper existente
    iso = toInputDate(d);
  }
  if (!iso) return "—";
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

/** ===== Validação de datas (NOVO) ===== */
// === [VAL] limites ajustáveis
const DATE_MIN = "1900-01-01";
const DATE_MAX = "2100-12-31";

// === [VAL] valida se é um ISO válido sem estourar por fuso
function isValidISODate(iso?: string | null): boolean {
  if (!iso) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  );
}
// === [VAL] como é YYYY-MM-DD, comparação de string funciona
function isWithinRangeISO(iso: string, min = DATE_MIN, max = DATE_MAX) {
  return iso >= min && iso <= max;
}
// === [VAL] função de erro humanizado
function validateISODateField(iso?: string | null, label = "Data") {
  if (!iso) return undefined; // deixe obrigatório em cada fluxo onde fizer sentido
  if (!isValidISODate(iso)) return `${label}: inválida (use AAAA-MM-DD)`;
  if (!isWithinRangeISO(iso)) return `${label}: fora do intervalo permitido (${DATE_MIN} a ${DATE_MAX})`;
  return undefined;
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
      <select
        className="status-select"
        style={{
      backgroundColor:
        value === "late"
          ? "#f6a19b" // vermelho
          : value === "open"
          ? "#f2da6e" // amarelo
          : value === "done"
          ? "#87d3ab" // verde
          : "#fff",   // padrão
    }}
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        aria-label="Alterar status"
      >
        <option value="open">Em aberto</option>
        <option value="late">Atrasado</option>
        <option value="done">Finalizado</option>
      </select>
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

  // === [VAL] estado de erros de data
  const [dateErrors, setDateErrors] = useState<{
    client_deadline?: string;
    final_deadline?: string;
    processes: Record<number, string | undefined>;
  }>({ processes: {} });

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
    setDateErrors({ processes: {} }); // === [VAL] limpa erros
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
    setDateErrors({ processes: {} }); // === [VAL] limpa erros
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
    setDateErrors({ processes: {} }); // === [VAL] limpa erros
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
    // === [VAL] valida Prazo do Cliente
    const iso = toInputDate(draft.client_deadline);
    const err = validateISODateField(iso, "Prazo do Cliente");
    setDateErrors((prev) => ({ ...prev, client_deadline: err }));
    if (err) {
      alert(err);
      return;
    }
    setStep(2);
  }
  function finishStep2() {
    // === [VAL] valida todas as datas selecionadas + prazo final
    let firstErr: string | undefined;
    const procErrors: Record<number, string | undefined> = {};
    draft.processes.forEach((p, idx) => {
      if (!p.selected || !p.planned_date) return;
      const e = validateISODateField(toInputDate(p.planned_date), `Data de "${p.name}"`);
      if (e && !firstErr) firstErr = e;
      procErrors[idx] = e;
    });
    const finalErr = validateISODateField(toInputDate(draft.final_deadline), "Prazo final");

    setDateErrors((prev) => ({
      ...prev,
      processes: { ...prev.processes, ...procErrors },
      final_deadline: finalErr,
    }));

    if (firstErr || finalErr) {
      alert(firstErr || finalErr);
      return;
    }
    setStep(3);
  }

  async function persistOrder() {
    setSaving(true);

    // === [VAL] última verificação antes de persistir
    {
      let firstErr: string | undefined;

      const clientErr = validateISODateField(toInputDate(draft.client_deadline), "Prazo do Cliente");
      if (!firstErr && clientErr) firstErr = clientErr;

      const procErrors: Record<number, string | undefined> = {};
      draft.processes.forEach((p, idx) => {
        if (!p.selected || !p.planned_date) return;
        const e = validateISODateField(toInputDate(p.planned_date), `Data de "${p.name}"`);
        if (!firstErr && e) firstErr = e;
        procErrors[idx] = e;
      });

      const finalErr = validateISODateField(toInputDate(draft.final_deadline), "Prazo final");
      if (!firstErr && finalErr) firstErr = finalErr;

      setDateErrors((prev) => ({
        ...prev,
        client_deadline: clientErr,
        final_deadline: finalErr,
        processes: { ...prev.processes, ...procErrors },
      }));

      if (firstErr) {
        setSaving(false);
        alert(firstErr);
        return;
      }
    }

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

  return (
    <div className="page-wrap">
      <h1 className="admin-title">PEDIDOS</h1>

      <div className="card pedidos-head">

        {/* Toolbar dentro do mesmo card (filtro, busca, botão) */}
       <div className="toolbar-3">
  <StatusFilterPill
    value={status as StatusFilterValue}
    onChange={(v) => setStatus(v)}
  />

  <SearchPill
    value={q}
    onChange={setQ}
    placeholder="Pesquisar"
    // opcional: se quiser forçar busca no Enter imediatamente
    // onSubmit={() => {/* se precisar algo extra além do useEffect */}}
  />

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
                  min={DATE_MIN} // === [VAL]
                  max={DATE_MAX} // === [VAL]
                  value={toInputDate(draft.client_deadline)}
                  aria-invalid={!!dateErrors.client_deadline} // === [VAL]
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({ ...d, client_deadline: v }));
                    setDateErrors((prev) => ({
                      ...prev,
                      client_deadline: validateISODateField(v, "Prazo do Cliente"),
                    }));
                  }}
                />
              </div>
              {dateErrors.client_deadline && (
                <div className="form-error">{dateErrors.client_deadline}</div>
              )}
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
                    min={DATE_MIN} // === [VAL]
                    max={DATE_MAX} // === [VAL]
                    value={toInputDate(p.planned_date)}
                    aria-invalid={!!dateErrors.processes[idx]} // === [VAL]
                    onChange={(e) =>
                      setDraft((d) => {
                        const v = e.target.value;
                        const arr = [...d.processes];
                        arr[idx] = { ...arr[idx], planned_date: v };
                        // === [VAL] valida cada processo
                        setDateErrors((prev) => ({
                          ...prev,
                          processes: {
                            ...prev.processes,
                            [idx]: validateISODateField(v, `Data de "${p.name}"`),
                          },
                        }));
                        return { ...d, processes: arr };
                      })
                    }
                  />
                </div>
                {dateErrors.processes[idx] && (
                  <div className="form-error">{dateErrors.processes[idx]}</div>
                )}
              </div>
            ))}

            <div>
              <div style={{ fontWeight: 800, color: "#2a3f66", marginTop: 8 }}>Prazo final</div>
              <div className="with-icon">
                <CalendarIcon />
                <input
                  className="input line"
                  type="date"
                  min={DATE_MIN} // === [VAL]
                  max={DATE_MAX} // === [VAL]
                  value={toInputDate(draft.final_deadline)}
                  aria-invalid={!!dateErrors.final_deadline} // === [VAL]
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) => ({ ...d, final_deadline: v }));
                    setDateErrors((prev) => ({
                      ...prev,
                      final_deadline: validateISODateField(v, "Prazo final"),
                    }));
                  }}
                />
              </div>
              {dateErrors.final_deadline && (
                <div className="form-error">{dateErrors.final_deadline}</div>
              )}
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
          <svg width="19" height="23" viewBox="0 0 19 23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.66667 3.33337H3.33333C2.04467 3.33337 1 4.37804 1 5.66671V19.6667C1 20.9554 2.04467 22 3.33333 22H15C16.2887 22 17.3333 20.9554 17.3333 19.6667V5.66671C17.3333 4.37804 16.2887 3.33337 15 3.33337H12.6667" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 13.25L14.0278 13.25" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 9.16663L14.0278 9.16663" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 17.3334L14.0278 17.3334" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5.66666 3.33333C5.66666 2.04467 6.71132 1 7.99999 1H10.3333C11.622 1 12.6667 2.04467 12.6667 3.33333V5.66667H5.66666V3.33333Z" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>

        </IconButton>
        <IconButton title="Editar pedido" onClick={onOpenEdit}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.7778 2L20 6.22222L5.22222 21H1V16.7778L15.7778 2Z" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 7L14.95 9.95" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
          </svg>

        </IconButton>
      </div>

      <div style={{ textAlign: "center" }}>
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
            <svg width="19" height="23" viewBox="0 0 19 23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.66667 3.33337H3.33333C2.04467 3.33337 1 4.37804 1 5.66671V19.6667C1 20.9554 2.04467 22 3.33333 22H15C16.2887 22 17.3333 20.9554 17.3333 19.6667V5.66671C17.3333 4.37804 16.2887 3.33337 15 3.33337H12.6667" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 13.25L14.0278 13.25" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 9.16663L14.0278 9.16663" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.69443 17.3334L14.0278 17.3334" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5.66666 3.33333C5.66666 2.04467 6.71132 1 7.99999 1H10.3333C11.622 1 12.6667 2.04467 12.6667 3.33333V5.66667H5.66666V3.33333Z" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          </IconButton>
          <IconButton title="Editar pedido" onClick={(e) => { e.stopPropagation(); onOpenEdit(); }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.7778 2L20 6.22222L5.22222 21H1V16.7778L15.7778 2Z" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M12 7L14.95 9.95" stroke="#314C7D" stroke-width="1.5" stroke-linecap="round"/>
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
                  <div className="process-date">{toBrDate(p?.planned_date)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="deadline-card">
          <div className="label">PRAZO FINAL</div>
          <div className="value">{toBrDate(order.final_deadline)}</div>
        </div>
      </div>
    </div>
  );
}

/** ===== Timeline visual (posições customizadas) ===== */
const CUSTOM_STEP_POS = [7, 24, 42, 58, 76, 92]; // em %

/** ===== Timeline visual (posições customizadas + fill inicia em 2%) ===== */
function Timeline({ processes }: { processes: ProcessItem[] }) {
  const CUSTOM_STEP_POS = [7, 24, 42, 58, 76, 92]; // em %
  const START_OFFSET = 2; // fill começa em 2%

  const steps = [...ALL_PROCESSES].map((name) => {
    const hit = processes.find((p) => p.name === name);
    return { name, done: !!hit?.done };
  });

  // Usa só a quantidade necessária de posições
  const positions = CUSTOM_STEP_POS.slice(0, steps.length);

  // Último índice concluído em sequência (do início até quebrar)
  let lastDone = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].done) lastDone = i;
    else break;
  }

  // Cálculo do fill: parte de 2% e vai até a última bolinha concluída
  const lastPos = lastDone >= 0 ? positions[lastDone] : START_OFFSET;
  const fillLeft = START_OFFSET;
  const fillWidth = Math.max(0, lastPos - START_OFFSET);

  return (
    <div className="process-timeline" aria-label="Linha do tempo dos processos">
      <div className="track" />
      <div className="fill" style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
      {steps.map((s, i) => (
        <div
          key={s.name}
          className={`process-dot ${i <= lastDone ? "done" : ""}`}
          style={{ left: `${positions[i]}%`, transform: "translate(-50%, -50%)" }}
          title={s.name}
        />
      ))}
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
