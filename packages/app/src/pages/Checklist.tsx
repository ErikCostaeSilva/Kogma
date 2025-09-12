import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

type OrderMaterial = {
  id?: number;
  order_id?: number;
  description: string;
  qty: number;
  unit: "Peças" | "KG" | "M" | "M2" | "M3";
  in_stock: boolean;
};

type OrderRow = {
  id: number;
  company_name: string;
  title: string;
  status: "open" | "late" | "done";
  materials: OrderMaterial[];
};

function StatusPill({ status }: { status: OrderRow["status"] }) {
  const map = {
    open: { bg: "#FFF4CC", text: "#9F7A03", label: "Em aberto" },
    late: { bg: "#FFE2E0", text: "#8F1710", label: "Atrasado" },
    done: { bg: "#DCF7E8", text: "#0E6A3B", label: "Finalizado" },
  } as const;
  const s = map[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {s.label}
    </span>
  );
}

export default function Checklist() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"all" | "open" | "late" | "done">("all");
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({}); // salva por item

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("withMaterials", "1");
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await api(`/orders?${params.toString()}`);
      const data = await res.json();
      const list: OrderRow[] = (data.orders || []).map((o: any) => ({
        id: o.id,
        company_name: o.company_name,
        title: o.title,
        status: o.status,
        materials: (o.materials || []).map((m: any) => ({
          id: m.id,
          order_id: o.id,
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

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  function toggleExpand(id: number) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  async function patchOrder(id: number, payload: any) {
    const res = await api(`/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.message || "Falha ao atualizar pedido");
  }

  // Alterna “entregue/em estoque” do material (checkbox)
  async function toggleMaterial(o: OrderRow, idx: number) {
    const key = `mat-${o.id}-${idx}`;
    if (saving[key]) return;

    // impede que o clique na checkbox colapse/expanda a linha
    // (alguns navegadores disparam o onClick no pai antes)
    const optimistic = !o.materials[idx].in_stock;

    // Otimismo na UI
    setOrders((list) =>
      list.map((row) =>
        row.id !== o.id
          ? row
          : {
              ...row,
              materials: row.materials.map((m, i) =>
                i === idx ? { ...m, in_stock: optimistic } : m
              ),
            }
      )
    );

    setSaving((s) => ({ ...s, [key]: true }));
    try {
      // backend espera array completo de materials
      const materialsPayload = o.materials.map((m, i) => ({
        description: i === idx ? m.description : m.description,
        qty: Number(m.qty || 0),
        unit: m.unit,
        in_stock: i === idx ? optimistic : !!m.in_stock,
      }));
      await patchOrder(o.id, { materials: materialsPayload });
    } catch (e) {
      // reverte em caso de erro
      setOrders((list) =>
        list.map((row) =>
          row.id !== o.id
            ? row
            : {
                ...row,
                materials: row.materials.map((m, i) =>
                  i === idx ? { ...m, in_stock: !optimistic } : m
                ),
              }
        )
      );
      console.error(e);
      alert("Não foi possível atualizar o material. Tente novamente.");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  // Atualiza status do pedido (select na linha expandida)
  async function changeStatus(o: OrderRow, next: OrderRow["status"]) {
    const key = `status-${o.id}`;
    if (saving[key]) return;
    const prev = o.status;
    setSaving((s) => ({ ...s, [key]: true }));
    // otimismo
    setOrders((list) => list.map((r) => (r.id === o.id ? { ...r, status: next } : r)));
    try {
      await patchOrder(o.id, { status: next });
    } catch (e) {
      // reverte
      setOrders((list) => list.map((r) => (r.id === o.id ? { ...r, status: prev } : r)));
      console.error(e);
      alert("Não foi possível atualizar o status.");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div className="page-wrap">
      <h1 className="admin-title">CHECKLIST</h1>

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
              placeholder="Buscar por nome do pedido"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 360 }}
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <div
          className="table-head"
          style={{ gridTemplateColumns: "1fr 160px" }}
        >
          <div>Pedido</div>
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
                  style={{ gridTemplateColumns: "1fr 160px" }}
                  onClick={() => toggleExpand(o.id)}
                >
                  <div className="col-email" style={{ cursor: "pointer" }}>
                    <div style={{ fontWeight: 800, color: "#fff" }}>
                      {o.company_name}
                    </div>
                    <div style={{ color: "#cfd7e6", fontSize: 13 }}>
                      {o.title}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusPill status={o.status} />
                  </div>
                </div>

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
                    {/* Status rápido */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: "#cfd7e6", fontSize: 13 }}>Status do pedido:</span>
                      <select
                        className="input light"
                        value={o.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          changeStatus(o, e.target.value as OrderRow["status"]);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 220 }}
                      >
                        <option value="open">Em aberto</option>
                        <option value="late">Atrasado</option>
                        <option value="done">Finalizado</option>
                      </select>
                    </div>

                    {/* Materiais */}
                    <div className="table-head" style={{ gridTemplateColumns: "1fr 120px 100px" }}>
                      <div>Material</div>
                      <div style={{ textAlign: "right" }}>Qtd</div>
                      <div style={{ textAlign: "center" }}>Entregue</div>
                    </div>
                    <div className="table-body">
                      {o.materials.length === 0 ? (
                        <div className="helper">Nenhum material cadastrado.</div>
                      ) : (
                        o.materials.map((m, idx) => {
                          const key = `mat-${o.id}-${idx}`;
                          return (
                            <div
                              key={idx}
                              className="row"
                              style={{ gridTemplateColumns: "1fr 120px 100px" }}
                              // evita colapso ao clicar nas células internas
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className="col-email"
                                style={{
                                  textDecoration: m.in_stock ? "line-through" : "none",
                                  color: m.in_stock ? "#9fb3d1" : "#fff",
                                }}
                              >
                                {m.description}
                              </div>
                              <div style={{ textAlign: "right", color: "#cfd7e6" }}>
                                {m.qty} {m.unit}
                              </div>
                              <div style={{ display: "grid", placeItems: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={!!m.in_stock}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleMaterial(o, idx);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  disabled={!!saving[key]}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
