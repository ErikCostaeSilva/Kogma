// packages/main/src/routes/users.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

export const users = Router();

// >>> RESPONDE PREFLIGHT LOCALMENTE (extra segurança)
users.options("*", (_req, res) => res.sendStatus(204));

// Somente admin
users.use(requireAuth, requireRole("admin"));

// LISTA
users.get("/", async (req, res) => {
  console.log("[users][GET] by", req.user?.email, "role=", req.user?.role);
  try {
    const [rows]: any = await pool.query(
      `SELECT id, name, email, role, status, created_at, updated_at
         FROM users
        ORDER BY id DESC`
    );
    console.log("[users][GET] rows=", Array.isArray(rows) ? rows.length : "?");
    res.json({ users: rows });
  } catch (e: any) {
    console.error(
      "[users][GET] error:",
      e?.code,
      e?.sqlMessage || e?.message,
      "\nSQL=",
      e?.sql
    );
    res.status(500).json({ message: "Erro ao listar usuários" });
  }
});

// CRIA — aceita só email; gera nome/senha temporária se faltarem
users.post("/", async (req, res) => {
  const {
    name,
    email,
    password,
    role = "user",
    status = "active",
  } = req.body || {};
  console.log("[users][POST] by", req.user?.email, "payload=", {
    name,
    email,
    role,
    status,
    hasPassword: !!password,
  });

  if (!email) {
    console.log("[users][POST] falta email");
    return res.status(400).json({ message: "email é obrigatório" });
  }

  const safeName =
    (typeof name === "string" && name.trim()) ||
    (typeof email === "string" && email.includes("@") && email.split("@")[0]) ||
    "Usuário";

  try {
    const [dup]: any = await pool.query(`SELECT id FROM users WHERE email=?`, [
      email,
    ]);
    if (Array.isArray(dup) && dup.length) {
      console.log("[users][POST] email duplicado");
      return res.status(409).json({ message: "E-mail já cadastrado" });
    }

    const tempPassword =
      password && String(password).length
        ? String(password)
        : Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, 10);

    const sql = `INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    const params = [safeName, email, hash, role, status];

    console.log("[users][POST] SQL=", sql, "PARAMS=", params);
    const [ins]: any = await pool.query(sql, params);

    const payload: any = { id: ins.insertId };
    if (!password) payload.temp_password = tempPassword;

    console.log("[users][POST] ok id=", ins.insertId);
    res.status(201).json(payload);
  } catch (e: any) {
    console.error(
      "[users][POST] error:",
      e?.code,
      e?.sqlState,
      e?.sqlMessage || e?.message,
      "\nSQL=",
      e?.sql
    );
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
});

// ATUALIZA
users.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  console.log(
    "[users][PATCH]",
    id,
    "by",
    req.user?.email,
    "payload=",
    req.body
  );
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const { name, email, password, role, status } = req.body || {};
  const sets: string[] = [];
  const vals: any[] = [];

  if (name !== undefined) {
    sets.push("name=?");
    vals.push(name);
  }
  if (email !== undefined) {
    sets.push("email=?");
    vals.push(email);
  }
  if (role !== undefined) {
    sets.push("role=?");
    vals.push(role);
  }
  if (status !== undefined) {
    sets.push("status=?");
    vals.push(status);
  }

  if (password !== undefined) {
    const hash = await bcrypt.hash(String(password), 10);
    sets.push("password_hash=?");
    vals.push(hash);
  }

  if (!sets.length) {
    console.log("[users][PATCH] nada para atualizar");
    return res.json({ ok: true });
  }

  sets.push("updated_at=NOW()");
  vals.push(id);

  try {
    const sql = `UPDATE users SET ${sets.join(", ")} WHERE id=?`;
    console.log("[users][PATCH] SQL=", sql, "PARAMS=", vals);
    await pool.query(sql, vals);
    res.json({ ok: true });
  } catch (e: any) {
    if (e && e.code === "ER_DUP_ENTRY") {
      console.log("[users][PATCH] email duplicado");
      return res.status(409).json({ message: "E-mail já cadastrado" });
    }
    console.error(
      "[users][PATCH] error:",
      e?.code,
      e?.sqlState,
      e?.sqlMessage || e?.message,
      "\nSQL=",
      e?.sql
    );
    res.status(500).json({ message: "Erro ao atualizar usuário" });
  }
});

// Alias PUT -> delega
users.put("/:id", async (req, res, next) => {
  (users as any).handle(req, res, next);
});
