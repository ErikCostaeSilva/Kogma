import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

export const admin = Router();

// Lista usuários
admin.get("/users", requireAuth, requireRole("admin"), async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, status, created_at FROM users ORDER BY id ASC"
  );
  res.json({ users: rows });
});

// Cria usuário (status = active)
admin.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: "E-mail inválido" });
  if (!role || !["admin", "user"].includes(role))
    return res.status(400).json({ message: "Permissão inválida" });

  const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (Array.isArray(exists) && exists.length > 0)
    return res.status(409).json({ message: "E-mail já cadastrado" });

  await pool.query(
    "INSERT INTO users (name, email, role, status, password_hash) VALUES (?, ?, ?, 'active', NULL)",
    ["", email, role]
  );
  res.status(201).json({ ok: true });
});

// Atualiza permissão e/ou status
admin.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "ID inválido" });

  const { role, status } = req.body as { role?: "admin"|"user"; status?: "active"|"inactive" };
  if (!role && !status) return res.status(400).json({ message: "Nada para atualizar" });

  if (role && !["admin","user"].includes(role)) return res.status(400).json({ message: "Permissão inválida" });
  if (status && !["active","inactive"].includes(status)) return res.status(400).json({ message: "Status inválido" });

  // evita auto-desabilitar
  const me = (req as any).user?.id;
  if (status === "inactive" && me === id) {
    return res.status(400).json({ message: "Você não pode desabilitar a si mesmo" });
  }

  const clauses: string[] = [];
  const params: any[] = [];
  if (role) { clauses.push("role = ?"); params.push(role); }
  if (status) { clauses.push("status = ?"); params.push(status); }
  params.push(id);

  const [r] = await pool.query(`UPDATE users SET ${clauses.join(", ")} WHERE id = ?`, params);
  // @ts-ignore
  if (r.affectedRows === 0) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json({ ok: true });
});

// (opcional) manter DELETE mas inutilizado
admin.delete("/users/:id", requireAuth, requireRole("admin"), (_req, res) => {
  return res.status(405).json({ message: "Ação desabilitada. Use PATCH status=inactive." });
});
