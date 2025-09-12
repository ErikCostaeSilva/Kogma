import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Company = { id: number; name: string; cnpj?: string | null };

type OrderProcess = {
  id?: number;
  order_id?: number;
  name:
    | "Corte a laser"
    | "Calandragem"
    | "Dobra"
    | "Montagem"
    | "Soldagem"
    | "Pintura";
  planned_date: string | null;
  done: boolean;
};

type OrderMaterial = {
  id?: number;
  order_id?: number;
  description: string;
  qty: number | string;
  unit: "Peças" | "KG" | "M" | "M2" | "M3";
  in_stock: boolean;
};

type OrderRow = {
  id: number;
  company_id: number;
  company_name: string;
  title: string;
  qty: number;
  unit: "Unidades" | "KG" | "M" | "M2" | "M3" | "Peças";
  client_deadline: string | null;
  final_deadline: string | null;
  status: "open" | "late" | "done";
  processes: OrderProcess[];
  materials: OrderMaterial[];
};

const UNITS: Array<OrderRow["unit"]> = ["Unidades", "KG", "M", "M2", "M3", "Peças"];
const MAT_UNITS: Array<OrderMaterial["unit"]> = ["Peças", "KG", "M", "M2", "M3"];

function toDateInput(v: any): string {
  if (!v) return "";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = v.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (m) return m[1];
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function toDateValue(v: any): string | null {
  const s = toDateInput(v);
  return s || null;
}

function StatusPill({ status }: { status: OrderRow["status"] }) {
  const { bg, text, label } = useMemo(() => {
    if (status === "open")
      return { bg: "#FFF4CC", text: "#9F7A03", label: "Em aberto" };
    if (status === "late")
      return { bg: "#FFE2E0", text: "#8F1710", label: "Atrasado" };
    return { bg: "#DCF7E8", text: "#0E6A3B", label: "Finalizado" };
  }, [status]);
  return (
    <span
      style={{
        background: bg,
        color: text,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn-icon"
      title={title}
      onClick={onClick}
      style={{ border: "1px solid #d7e0f0" }}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  onClose,
  width = 840,
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function Pedidos() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [status, setStatus] = useState<"all" | "open" | "late" | "done">("all");
  const [q, setQ] = useState("");

  // expand row
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // modal pedido (novo/editar)
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [form, setForm] = useState<{
    company_id: number | "";
    title: string;
    qty: number | string;
    unit: OrderRow["unit"];
    client_deadline: string;
    final_deadline: string;
    materials: OrderMaterial[];
  }>({
    company_id: "",
    title: "",
    qty: "",
    unit: "Unidades",
    client_deadline: "",
    final_deadline: "",
    materials: [],
  });

  // modal processos/prazos
  const [openProcs, setOpenProcs] = useState(false);
  const [procErr, setProcErr] = useState<string | null>(null);
  const [procOrder, setProcOrder] = useState<OrderRow | null>(null);
  const [processes, setProcesses] = useState<OrderProcess[]>([]);

  async function loadCompanies() {
    const res = await api("/companies");
    const data = await res.json();
    setCompanies(data.companies || []);
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("withMaterials", "1");
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);

      const res = await api(`/orders?${params.toString()}`);
      const data = await res.json();
      setOrders((data.orders || []).map((o: any) => ({
        ...o,
        client_deadline: toDateInput(o.client_deadline),
        final_deadline: toDateInput(o.final_deadline),
        processes: (o.processes || []).map((p: any) => ({
          ...p,
          planned_date: toDateInput(p.planned_date),
          done: !!p.done
        })),
        materials: (o.materials || []).map((m: any) => ({
          ...m,
          qty: Number(m.qty ?? 0),
          in_stock: !!m.in_stock
        }))
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);
  useEffect(() => {
    // busca quando mudar status/pesquisa
    const t = setTimeout(loadOrders, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  function openNew() {
    setEditId(null);
    setFormErr(null);
    setForm({
      company_id: "",
      title: "",
      qty: "",
      unit: "Unidades",
      client_deadline: "",
      final_deadline: "",
      materials: [],
    });
    setOpenForm(true);
  }

  function openEdit(o: OrderRow) {
    setEditId(o.id);
    setFormErr(null);
    setForm({
      company_id: o.company_id,
      title: o.title,
      qty: o.qty,
      unit: o.unit,
      client_deadline: toDateInput(o.client_deadline),
      final_deadline: toDateInput(o.final_deadline),
      materials: (o.materials || []).map((m) => ({
        id: m.id,
        order_id: m.order_id,
        description: m.description,
        qty: Number(m.qty ?? 0),
        unit: m.unit || "Peças",
        in_stock: !!m.in_stock,
      })),
    });
    setOpenForm(true);
  }

  async function saveOrder() {
    try {
      setFormErr(null);
      if (!form.company_id || !form.title) {
        throw new Error("Selecione o cliente e informe o nome do pedido.");
      }
      const payload: any = {
        company_id: Number(form.company_id),
        title: form.title,
        qty: Number(form.qty || 0),
        unit: form.unit,
        client_deadline: toDateValue(form.client_deadline),
        final_deadline: toDateValue(form.final_deadline),
        materials: (form.materials || []).map((m) => ({
          description: m.description,
          qty: Number(m.qty || 0),
          unit: m.unit,
          in_stock: !!m.in_stock,
        })),
      };

      let res: Response;
      if (editId) {
        res = await api(`/orders/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        res = await api(`/orders`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao salvar pedido");

      setOpenForm(false);
      await loadOrders();
    } catch (e: any) {
      setFormErr(e.message);
    }
  }

  function addMaterialRow() {
    setForm((f) => ({
      ...f,
      materials: [
        ...(f.materials || []),
        { description: "", qty: 0, unit: "Peças", in_stock: false },
      ],
    }));
  }
  function updateMaterial(idx: number, patch: Partial<OrderMaterial>) {
    setForm((f) => {
      const arr = [...(f.materials || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...f, materials: arr };
    });
  }
  function removeMaterial(idx: number) {
    setForm((f) => {
      const arr = [...(f.materials || [])];
      arr.splice(idx, 1);
      return { ...f, materials: arr };
    });
  }

  function toggleExpand(id: number) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function openProcesses(o: OrderRow) {
    setProcErr(null);
    setProcOrder(o);
    const sorted = [...(o.processes || [])].sort((a, b) => {
      const order = [
        "Corte a laser",
        "Calandragem",
        "Dobra",
        "Montagem",
        "Soldagem",
        "Pintura",
      ];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });
    setProcesses(
      sorted.map((p) => ({
        id: p.id,
        order_id: o.id,
        name: p.name,
        planned_date: toDateInput(p.planned_date),
        done: !!p.done,
      }))
    );
    setOpenProcs(true);
  }

  async function saveProcesses() {
    if (!procOrder) return;
    try {
      setProcErr(null);
      const payload = {
        processes: processes.map((p) => ({
          name: p.name,
          planned_date: toDateValue(p.planned_date),
          done: !!p.done,
        })),
      };
      const res = await api(`/orders/${procOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao salvar processos");
      setOpenProcs(false);
      await loadOrders();
    } catch (e: any) {
      setProcErr(e.message);
    }
  }

  // ====== UI ======
  return (
    <div className="page-wrap">
      <h1 className="admin-title">PEDIDOS</h1>

      {/* Filtros topo */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          className="card-header"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <div className="segmented">
            <button
              className={`seg-btn ${status === "all" ? "active" : ""}`}
              onClick={() => setStatus("all")}
            >
              Todos
            </button>
            <button
              className={`seg-btn ${status === "open" ? "active" : ""}`}
              onClick={() => setStatus("open")}
            >
              Em aberto
            </button>
            <button
              className={`seg-btn ${status === "late" ? "active" : ""}`}
              onClick={() => setStatus("late")}
            >
              Atrasado
            </button>
            <button
              className={`seg-btn ${status === "done" ? "active" : ""}`}
              onClick={() => setStatus("done")}
            >
              Finalizado
            </button>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              className="input light"
              placeholder="Buscar por nome do pedido ou empresa"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 360 }}
            />
            <button className="btn-primary" onClick={openNew}>
              Novo pedido
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <div
          className="table-head"
          style={{ gridTemplateColumns: "1fr 180px 140px" }}
        >
          <div>Pedido</div>
          <div style={{ textAlign: "center" }}>Ações</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>

        <div className="table-body">
          {loading ? (
            <div className="helper">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="helper">Nenhum pedido encontrado.</div>
          ) : (
            orders.map((o) => (
              <React.Fragment key={o.id}>
                <div
                  className="row hover"
                  style={{ gridTemplateColumns: "1fr 180px 140px" }}
                >
                  <div
                    className="col-email"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleExpand(o.id)}
                    title="Ver linha do tempo"
                  >
                    <div style={{ fontWeight: 800, color: "#fff" }}>
                      {o.company_name}
                    </div>
                    <div style={{ color: "#cfd7e6", fontSize: 13 }}>
                      {o.title}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* Administrar prazos/processos */}
                    <IconButton
                      title="Processos e prazos"
                      onClick={() => openProcesses(o)}
                    >
                      {/* ícone prancheta */}
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                      >
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0c.55 0 1 .45 1 1h-2c0-.55.45-1 1-1Zm7 18H5V5h2v2h10V5h2v16Z" />
                      </svg>
                    </IconButton>

                    {/* Editar */}
                    <IconButton title="Editar" onClick={() => openEdit(o)}>
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                      >
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm3.92.92H5.5v-1.41l8.06-8.06 1.41 1.41L6.92 18.17zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </IconButton>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <StatusPill status={o.status} />
                  </div>
                </div>

                {/* expand details */}
                {expandedId === o.id && (
                  <div
                    className="row"
                    style={{
                      gridTemplateColumns: "1fr",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      marginTop: -8,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 220px",
                        gap: 16,
                        width: "100%",
                      }}
                    >
                      {/* timeline */}
                      <div
                        style={{
                          padding: 12,
                          background: "rgba(0,0,0,0.08)",
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 8,
                            color: "#cfd7e6",
                          }}
                        >
                          Linha do tempo
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(6, minmax(120px, 1fr))",
                            gap: 12,
                          }}
                        >
                          {o.processes.map((p) => (
                            <div
                              key={`${p.name}-${p.id ?? "x"}`}
                              style={{
                                background: "#233a5f",
                                borderRadius: 12,
                                padding: 10,
                                border: p.done
                                  ? "2px solid #29a36a"
                                  : "2px solid transparent",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 12,
                                  color: "#fff",
                                  marginBottom: 6,
                                }}
                              >
                                {p.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#cfd7e6",
                                  lineHeight: 1.2,
                                }}
                              >
                                Previsto:{" "}
                                {p.planned_date ? p.planned_date : "-"}
                              </div>
                              <div
                                style={{
                                  marginTop: 6,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: p.done ? "#29a36a" : "#cfd7e6",
                                }}
                              >
                                {p.done ? "Concluído" : "Pendente"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* prazo final destaque */}
                      <div
                        style={{
                          background: "#233a5f",
                          borderRadius: 16,
                          display: "grid",
                          placeItems: "center",
                          padding: 16,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ color: "#cfd7e6", fontSize: 12 }}>
                          Prazo Final
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 24 }}>
                          {o.final_deadline || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {/* Modal Pedido */}
      <Modal open={openForm} onClose={() => setOpenForm(false)}>
        <div className="modal-title center">
          {editId ? "EDITAR PEDIDO" : "NOVO PEDIDO"}
        </div>
        <div className="modal-divider" />
        {formErr && (
          <div className="error" style={{ marginBottom: 12 }}>
            {formErr}
          </div>
        )}

        <div className="grid-2">
          <div>
            <label className="label">Cliente (empresa)</label>
            <select
              className="input light"
              value={form.company_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_id: Number(e.target.value) }))
              }
            >
              <option value="">Selecione...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nome do pedido</label>
            <input
              className="input light"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Quantidade</label>
            <input
              className="input light"
              inputMode="decimal"
              value={form.qty}
              onChange={(e) => {
                const v = e.target.value.replace(",", ".");
                setForm((f) => ({ ...f, qty: v }));
              }}
            />
          </div>

          <div>
            <label className="label">Unidade</label>
            <select
              className="input light"
              value={form.unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit: e.target.value as OrderRow["unit"] }))
              }
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Prazo do cliente</label>
            <input
              type="date"
              className="input light"
              value={form.client_deadline}
              onChange={(e) =>
                setForm((f) => ({ ...f, client_deadline: toDateInput(e.target.value) }))
              }
            />
          </div>

          <div>
            <label className="label">Prazo final</label>
            <input
              type="date"
              className="input light"
              value={form.final_deadline}
              onChange={(e) =>
                setForm((f) => ({ ...f, final_deadline: toDateInput(e.target.value) }))
              }
            />
          </div>
        </div>

        {/* Materiais */}
        <div className="modal-subtitle" style={{ marginTop: 16 }}>
          Materiais
        </div>
        <div className="table-head" style={{ gridTemplateColumns: "1fr 120px 120px 90px 60px" }}>
          <div>Descrição</div>
          <div style={{ textAlign: "right" }}>Qtd</div>
          <div>Unidade</div>
          <div style={{ textAlign: "center" }}>Em estoque</div>
          <div style={{ textAlign: "right" }}>Ações</div>
        </div>
        <div className="table-body">
          {(form.materials || []).map((m, idx) => (
            <div key={idx} className="row" style={{ gridTemplateColumns: "1fr 120px 120px 90px 60px" }}>
              <input
                className="input light"
                value={m.description}
                onChange={(e) => updateMaterial(idx, { description: e.target.value })}
                placeholder="Descrição do material"
              />
              <input
                className="input light"
                inputMode="decimal"
                value={m.qty}
                onChange={(e) => {
                  const v = e.target.value.replace(",", ".");
                  updateMaterial(idx, { qty: v });
                }}
              />
              <select
                className="input light"
                value={m.unit}
                onChange={(e) => updateMaterial(idx, { unit: e.target.value as OrderMaterial["unit"] })}
              >
                {MAT_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <div style={{ display: "grid", placeItems: "center" }}>
                <input
                  type="checkbox"
                  checked={m.in_stock}
                  onChange={(e) => updateMaterial(idx, { in_stock: e.target.checked })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-ghost" onClick={() => removeMaterial(idx)}>Remover</button>
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 8 }}>
            <button className="btn-primary" onClick={addMaterialRow}>Adicionar material</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setOpenForm(false)}>Cancelar</button>
          <button className="btn-primary" onClick={saveOrder}>{editId ? "Atualizar" : "Concluir"}</button>
        </div>
      </Modal>

      {/* Modal Processos/Prazos */}
      <Modal open={openProcs} onClose={() => setOpenProcs(false)} width={720}>
        <div className="modal-title center">PROCESSOS E PRAZOS</div>
        <div className="modal-divider" />
        {procErr && <div className="error" style={{ marginBottom: 12 }}>{procErr}</div>}

        <div className="table-head" style={{ gridTemplateColumns: "2fr 180px 120px" }}>
          <div>Processo</div>
          <div style={{ textAlign: "center" }}>Data prevista</div>
          <div style={{ textAlign: "center" }}>Concluído</div>
        </div>
        <div className="table-body">
          {processes.map((p, idx) => (
            <div key={idx} className="row" style={{ gridTemplateColumns: "2fr 180px 120px" }}>
              <div className="col-email" style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <input
                  type="date"
                  className="input light"
                  value={p.planned_date || ""}
                  onChange={(e) => {
                    const v = toDateInput(e.target.value);
                    setProcesses((arr) => {
                      const cp = [...arr];
                      cp[idx] = { ...cp[idx], planned_date: v || null };
                      return cp;
                    });
                  }}
                  style={{ width: 170 }}
                />
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!p.done}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setProcesses((arr) => {
                      const cp = [...arr];
                      cp[idx] = { ...cp[idx], done: checked };
                      return cp;
                    });
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setOpenProcs(false)}>Cancelar</button>
          <button className="btn-primary" onClick={saveProcesses}>Salvar</button>
        </div>
      </Modal>
    </div>
  );
}
