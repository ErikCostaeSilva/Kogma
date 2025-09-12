import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

export const admin = Router();

// Lista usuários
admin.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY id ASC"
  );
  res.json({ users: rows });
});

// Cria usuário (apenas email+role; senha será definida depois no fluxo de recuperar/cadastrar)
admin.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: "E-mail inválido" });
  if (!role || !["admin", "user"].includes(role))
    return res.status(400).json({ message: "Permissão inválida" });

  // já existe?
  const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (Array.isArray(exists) && exists.length > 0)
    return res.status(409).json({ message: "E-mail já cadastrado" });

  await pool.query(
    "INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, NULL)",
    ["", email, role]
  );
  res.status(201).json({ ok: true });
});

// Atualiza permissão
admin.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body as { role?: string };
  if (!id) return res.status(400).json({ message: "ID inválido" });
  if (!role || !["admin", "user"].includes(role))
    return res.status(400).json({ message: "Permissão inválida" });

  const [r] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  // @ts-ignore
  if (r.affectedRows === 0) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json({ ok: true });
});

// Exclui usuário
admin.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });
  const me = (req as any).user?.id;
  if (me === id) return res.status(400).json({ message: "Você não pode excluir a si mesmo" });

  const [r] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  // @ts-ignore
  if (r.affectedRows === 0) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json({ ok: true });
});
