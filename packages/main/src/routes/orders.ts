import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middlewares/requireAuth";

export const orders = Router();

// exige login
orders.use(requireAuth);

// helper: aceita "2025-06-23", Date, ou "2025-06-23T00:00:00.000Z" e devolve "2025-06-23"
function dateOnly(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v);
  // se já vier "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // se vier ISO "YYYY-MM-DDTHH:mm:ss.sssZ"
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (m) return m[1];
  // tenta parse geral
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// util p/ group
function groupBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  const map = new Map<number, T[]>();
  for (const r of rows) {
    const k = Number(r[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return map;
}

/** GET /orders?status=open|late|done&q=texto&withMaterials=1 */
orders.get("/", async (req, res) => {
  const { status, q, withMaterials } = req.query as any;

  const where: string[] = [];
  const vals: any[] = [];
  if (status && ["open", "late", "done"].includes(status)) {
    where.push("o.status=?"); vals.push(status);
  }
  if (q) {
    where.push("(o.title LIKE ? OR c.name LIKE ?)");
    vals.push(`%${q}%`, `%${q}%`);
  }

  const [rows]: any = await pool.query(
    `
    SELECT o.*, c.name AS company_name
    FROM orders o
    JOIN companies c ON c.id = o.company_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY o.id DESC
    `,
    vals
  );

  if (!withMaterials) return res.json({ orders: rows });

  const ids = rows.map((r: any) => r.id);
  if (!ids.length) return res.json({ orders: [] });

  const [procs]: any = await pool.query(
    `SELECT id, order_id, name, planned_date, done
     FROM order_processes
     WHERE order_id IN (?)
     ORDER BY FIELD(name,'Corte a laser','Calandragem','Dobra','Montagem','Soldagem','Pintura')`,
    [ids]
  );
  const [mats]: any = await pool.query(
    `SELECT id, order_id, description, qty, unit, in_stock
     FROM order_materials
     WHERE order_id IN (?)`,
    [ids]
  );

  const gProcs = groupBy(procs, "order_id");
  const gMats = groupBy(mats, "order_id");

  const out = rows.map((r: any) => ({
    ...r,
    processes: gProcs.get(r.id) || [],
    materials: gMats.get(r.id) || [],
  }));

  res.json({ orders: out });
});

/** POST /orders */
orders.post("/", async (req, res) => {
  const {
    company_id, title, qty = 0, unit = "Unidades",
    client_deadline, final_deadline, status = "open",
    materials = [], processes = []
  } = req.body || {};

  if (!company_id || !title) {
    return res.status(400).json({ message: "company_id e title são obrigatórios" });
  }

  const clientD = dateOnly(client_deadline);
  const finalD  = dateOnly(final_deadline);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins]: any = await conn.query(
      `INSERT INTO orders (company_id, title, qty, unit, client_deadline, final_deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [company_id, title, qty, unit, clientD, finalD, status]
    );
    const orderId = ins.insertId;

    const defaultProcs = [
      "Corte a laser", "Calandragem", "Dobra", "Montagem", "Soldagem", "Pintura"
    ].map(n => ({ name: n, planned_date: null, done: 0 }));

    const toInsertProcs = (processes?.length ? processes : defaultProcs).map((p: any) => [
      orderId, p.name, dateOnly(p.planned_date), p.done ? 1 : 0
    ]);
    if (toInsertProcs.length) {
      await conn.query(
        `INSERT INTO order_processes (order_id, name, planned_date, done) VALUES ?`,
        [toInsertProcs]
      );
    }

    if (materials?.length) {
      const toInsertMats = materials.map((m: any) => [
        orderId, m.description, m.qty || 0, m.unit || "Peças", m.in_stock ? 1 : 0
      ]);
      await conn.query(
        `INSERT INTO order_materials (order_id, description, qty, unit, in_stock) VALUES ?`,
        [toInsertMats]
      );
    }

    await conn.commit();
    res.status(201).json({ id: orderId });
  } catch (e) {
    await conn.rollback();
    console.error("POST /orders error:", e);
    res.status(500).json({ message: "Erro ao criar pedido" });
  } finally {
    conn.release();
  }
});

/** PATCH /orders/:id */
orders.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const {
    company_id, title, qty, unit,
    client_deadline, final_deadline, status,
    processes, materials
  } = req.body || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sets: string[] = [];
    const vals: any[] = [];

    if (company_id !== undefined) { sets.push("company_id=?"); vals.push(company_id); }
    if (title !== undefined)      { sets.push("title=?"); vals.push(title); }
    if (qty !== undefined)        { sets.push("qty=?"); vals.push(qty); }
    if (unit !== undefined)       { sets.push("unit=?"); vals.push(unit); }

    if (client_deadline !== undefined) {
      sets.push("client_deadline=?"); vals.push(dateOnly(client_deadline));
    }
    if (final_deadline !== undefined) {
      sets.push("final_deadline=?"); vals.push(dateOnly(final_deadline));
    }
    if (status !== undefined)     { sets.push("status=?"); vals.push(status); }

    if (sets.length) {
      vals.push(id);
      await conn.query(`UPDATE orders SET ${sets.join(", ")} WHERE id=?`, vals);
    }

    if (Array.isArray(processes)) {
      await conn.query(`DELETE FROM order_processes WHERE order_id=?`, [id]);
      if (processes.length) {
        const values = processes.map((p: any) => [id, p.name, dateOnly(p.planned_date), p.done ? 1 : 0]);
        await conn.query(
          `INSERT INTO order_processes (order_id, name, planned_date, done) VALUES ?`,
          [values]
        );
      }
    }

    if (Array.isArray(materials)) {
      await conn.query(`DELETE FROM order_materials WHERE order_id=?`, [id]);
      if (materials.length) {
        const values = materials.map((m: any) => [id, m.description, m.qty || 0, m.unit || "Peças", m.in_stock ? 1 : 0]);
        await conn.query(
          `INSERT INTO order_materials (order_id, description, qty, unit, in_stock) VALUES ?`,
          [values]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error("PATCH /orders/:id error:", e);
    res.status(500).json({ message: "Erro ao atualizar pedido" });
  } finally {
    conn.release();
  }
});
