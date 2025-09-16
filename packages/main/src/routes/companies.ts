// packages/main/src/routes/companies.ts
import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middlewares/requireAuth";
import { normalizeCnpjForDb } from "../utils/cnpj";

export const companies = Router();
companies.use(requireAuth);

const STRICT_CNPJ =
  String(process.env.STRICT_CNPJ ?? "").toLowerCase() === "true";

companies.get("/", async (req, res) => {
  const { q } = req.query as any;
  const where: string[] = [];
  const vals: any[] = [];
  if (q) {
    where.push("(c.name LIKE ? OR c.cnpj LIKE ?)");
    vals.push(`%${q}%`, `%${q}%`);
  }
  const [rows]: any = await pool.query(
    `
    SELECT c.id, c.name, c.cnpj, c.created_at, c.updated_at
    FROM companies c
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY c.id DESC
    `,
    vals
  );
  res.json({ companies: rows });
});

companies.post("/", async (req, res) => {
  try {
    const { name, cnpj } = req.body || {};
    if (!name) return res.status(400).json({ message: "name é obrigatório" });

    const norm = normalizeCnpjForDb(cnpj, STRICT_CNPJ);
    if (STRICT_CNPJ && norm.error) {
      return res.status(400).json({ message: norm.error });
    }

    // >>> ALTERADO: incluir updated_at no INSERT <<<
    const [ins]: any = await pool.query(
      `INSERT INTO companies (name, cnpj, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
      [name, norm.value]
    );

    res.status(201).json({ id: ins.insertId });
  } catch (e: any) {
    if (e && e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "CNPJ já cadastrado" });
    }
    console.error("POST /companies error:", e);
    res.status(500).json({ message: "Erro ao criar cliente" });
  }
});

companies.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const { name, cnpj } = req.body || {};
    const sets: string[] = [];
    const vals: any[] = [];

    if (name !== undefined) {
      sets.push("name=?");
      vals.push(name);
    }

    if (cnpj !== undefined) {
      const norm = normalizeCnpjForDb(cnpj, STRICT_CNPJ);
      if (STRICT_CNPJ && norm.error) {
        return res.status(400).json({ message: norm.error });
      }
      sets.push("cnpj=?");
      vals.push(norm.value);
    }

    if (!sets.length) return res.json({ ok: true });

    // >>> ALTERADO: atualizar updated_at no UPDATE <<<
    sets.push("updated_at=NOW()");
    vals.push(id);

    await pool.query(
      `UPDATE companies SET ${sets.join(", ")} WHERE id=?`,
      vals
    );
    res.json({ ok: true });
  } catch (e: any) {
    if (e && e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "CNPJ já cadastrado" });
    }
    console.error("PATCH /companies/:id error:", e);
    res.status(500).json({ message: "Erro ao atualizar cliente" });
  }
});
