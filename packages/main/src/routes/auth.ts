import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { sendResetEmail } from "../mailer";
import { requireAuth } from "../middlewares/requireAuth";

export const auth = Router();

/*
SQL base:

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(30) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/


auth.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const [rows] = await pool.query(
    "SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?",
    [email]
  );
  const user = Array.isArray(rows) ? (rows as any[])[0] : null;
  if (!user) return res.status(401).json({ message: "E-mail inválido" });
  if (user.status === "inactive") return res.status(403).json({ message: "Usuário desabilitado" });

  const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) return res.status(401).json({ message: "senha inválida" });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

auth.post("/password/recover", async (req, res) => {
  const { email } = req.body as { email: string };

  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  const u = Array.isArray(rows) ? (rows as any[])[0] : null;

  if (!u) return res.status(404).json({ message: "E-mail não pode ser encontrado" });

  const token = jwt.sign({ sub: u.id, intent: "reset" }, process.env.JWT_SECRET!, { expiresIn: "30m" });
  const link = `${process.env.APP_URL || "http://localhost:5173"}/auth/definir-senha?token=${token}`;

  const mode = String(process.env.MAIL_MODE || "console");
  if (mode === "smtp" || mode === "ethereal") {
    await sendResetEmail(email, link);
    return res.json({ ok: true });
  } else {
    return res.json({ ok: true, link });
  }
});

auth.post("/password/reset", async (req, res) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  if (!token || !newPassword) return res.status(400).json({ message: "Dados inválidos" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.intent !== "reset") return res.status(400).json({ message: "Token inválido" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, decoded.sub]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ message: "Token inválido ou expirado" });
  }
});

auth.get("/me", requireAuth, async (req, res) => {
  const userId = (req as any).user.id;
  const [rows] = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
    [userId]
  );
  const user = Array.isArray(rows) ? (rows as any[])[0] : null;
  if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
  res.json({ user });
});
