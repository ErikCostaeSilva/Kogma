import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import StatusFilterPill, { StatusFilterValue } from "../components/StatusFilterPill";
import SearchPill from "../components/SearchPill";
import StatusPillSelect from "../components/StatusPillSelect";

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

export default function Checklist() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"all" | "open" | "late" | "done">("all");
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

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

  async function toggleMaterial(o: OrderRow, idx: number) {
    const key = `mat-${o.id}-${idx}`;
    if (saving[key]) return;

    const optimistic = !o.materials[idx].in_stock;

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
      const materialsPayload = o.materials.map((m, i) => ({
        description: m.description,
        qty: Number(m.qty || 0),
        unit: m.unit,
        in_stock: i === idx ? optimistic : !!m.in_stock,
      }));
      await patchOrder(o.id, { materials: materialsPayload });
    } catch (e) {
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

  async function changeStatus(o: OrderRow, next: OrderRow["status"]) {
    const key = `status-${o.id}`;
    if (saving[key]) return;
    const prev = o.status;
    setSaving((s) => ({ ...s, [key]: true }));

    setOrders((list) => list.map((r) => (r.id === o.id ? { ...r, status: next } : r)));
    try {
      await patchOrder(o.id, { status: next });
    } catch (e) {
      setOrders((list) => list.map((r) => (r.id === o.id ? { ...r, status: prev } : r)));
      console.error(e);
      alert("Não foi possível atualizar o status.");
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div className="page-wrap checklistTable">
      <h1 className="admin-title">CHECKLIST</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div
          className="card-header"
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <StatusFilterPill
            value={status as StatusFilterValue}
            onChange={(v) => setStatus(v)}
          />

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <SearchPill
              value={q}
              onChange={setQ}
              placeholder="Pesquisar"
              onSubmit={() => load()} 
            />
          </div>
        </div>
      </div>

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
                  style={{ gridTemplateColumns: "1fr 225px" }}
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
                    <div
                      style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <StatusPillSelect
                        value={o.status}
                        onChange={(next) => changeStatus(o, next)}
                      />
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

                    <div className="table-head-materials" style={{ gridTemplateColumns: "1fr 120px 100px" }}>
                      <div>Material</div>
                      <div style={{ textAlign: "right" }}>Qtd</div>
                      <div style={{ textAlign: "center" }}>Entregue</div>
                    </div>
                    <div className="table-body tableMaterials">
                      {o.materials.length === 0 ? (
                        <div className="helper">Nenhum material cadastrado.</div>
                      ) : (
                        o.materials.map((m, idx) => {
                          const key = `mat-${o.id}-${idx}`;
                          return (
                            <div
                              key={idx}
                              className="row rowMaterials"
                              style={{ gridTemplateColumns: "1fr 120px 100px" }}
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
                              <div>
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
