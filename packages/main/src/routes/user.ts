// CONFIRA QUE EXISTE: packages/main/src/routes/users.ts (idêntico ao que te enviei)
import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

export const users = Router();
users.use(requireAuth, requireRole("admin"));

users.get("/", async (_req, res) => {
  const [rows]: any = await pool.query(
    `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
      ORDER BY id DESC`
  );
  res.json({ users: rows });
});

users.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "user",
      status = "active",
    } = req.body || {};
    if (!name || !email)
      return res.status(400).json({ message: "name e email são obrigatórios" });

    const [dup]: any = await pool.query(`SELECT id FROM users WHERE email=?`, [
      email,
    ]);
    if (Array.isArray(dup) && dup.length)
      return res.status(409).json({ message: "E-mail já cadastrado" });

    const tempPassword =
      password && String(password).length
        ? String(password)
        : Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, 10);

    const [ins]: any = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, hash, role, status]
    );

    const payload: any = { id: ins.insertId };
    if (!password) payload.temp_password = tempPassword;
    res.status(201).json(payload);
  } catch (e) {
    console.error("POST /users error:", e);
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
});
