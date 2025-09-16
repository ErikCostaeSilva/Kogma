// packages/main/src/routes/auth.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import crypto from "crypto";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { sendResetEmail } from "../../../main/src/mailer";

const router = Router();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não definida. Configure packages/main/.env`);
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const FRONTEND_RESET_PATH =
  process.env.FRONTEND_RESET_PATH || "/cadastrar-senha";

function normalizeExpiresIn(v: string): string | number {
  return /^\d+$/.test(v) ? Number(v) : v;
}
const EXPIRES_IN_OPT: string | number = normalizeExpiresIn(JWT_EXPIRES_IN);

type UserRole = "admin" | "user";
type UserStatus = "active" | "inactive";

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  role: UserRole;
  status: UserStatus;
  reset_token?: string | null;
  reset_expires?: Date | null;
};

// REGISTER
router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      role = "user",
      status = "active",
    } = (req.body || {}) as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      status?: UserStatus;
    };

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email e password são obrigatórios." });
    }

    const [dup] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE email=?`,
      [email]
    );
    if ((dup as any[]).length) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const [ins]: any = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, hash, role, status]
    );

    const token = jwt.sign(
      { sub: ins.insertId, role, email },
      JWT_SECRET as any,
      { expiresIn: EXPIRES_IN_OPT, issuer: "kogma-api" } as any
    ) as string;

    return res.status(201).json({
      id: ins.insertId,
      token,
      user: { id: ins.insertId, name, email, role, status },
    });
  } catch (err) {
    console.error("[auth/register] error:", err);
    return res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

// LOGIN
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password)
      return res.status(400).json({ error: "Informe email e senha." });

    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, name, email, password_hash, role, status
         FROM users
        WHERE email = ?`,
      [email]
    );
    if (!(rows as any[]).length)
      return res.status(401).json({ error: "Credenciais inválidas." });

    const user = (rows as any[])[0] as UserRow;
    if (user.status === "inactive")
      return res.status(403).json({ error: "Usuário inativo." });
    if (!user.password_hash)
      return res.status(401).json({ error: "Credenciais inválidas." });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

    const token = jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      JWT_SECRET as any,
      { expiresIn: EXPIRES_IN_OPT, issuer: "kogma-api" } as any
    ) as string;

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// ME
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, name, email, role, status FROM users WHERE id=?`,
      [req.user!.sub]
    );
    if (!Array.isArray(rows) || !rows.length)
      return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Erro ao carregar perfil" });
  }
});

// ADMIN GATE
router.get("/admin-gate", requireAuth, requireRole("admin"), (_req, res) => {
  res.sendStatus(204);
});

// PASSWORD RECOVER
router.post("/password/recover", async (req: Request, res: Response) => {
  const { email } = (req.body || {}) as { email?: string };
  if (!email) return res.status(400).json({ error: "email é obrigatório" });

  try {
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id, status FROM users WHERE email=? LIMIT 1`,
      [email]
    );

    if (Array.isArray(rows) && rows.length && rows[0].status === "active") {
      const user = rows[0];
      const token = crypto.randomBytes(32).toString("hex");

      await pool.query(
        `UPDATE users
           SET reset_token=?, reset_expires=DATE_ADD(NOW(), INTERVAL 2 HOUR), updated_at=NOW()
         WHERE id=?`,
        [token, user.id]
      );

      const base = FRONTEND_BASE_URL.replace(/\/+$/, "");
      const path = FRONTEND_RESET_PATH.startsWith("/")
        ? FRONTEND_RESET_PATH
        : `/${FRONTEND_RESET_PATH}`;
      const link = `${base}${path}?token=${encodeURIComponent(token)}`;

      await sendResetEmail(email, link);
      if (process.env.DEBUG_AUTH === "true") {
        console.log("[recover] token gerado para", email, "->", link);
      }
    } else {
      if (process.env.DEBUG_AUTH === "true") {
        console.log("[recover] email inexistente ou inativo:", email);
      }
    }

    // Resposta amigável (não vaza existência)
    return res.status(200).json({
      message:
        "Se o e-mail estiver cadastrado e ativo, você receberá um link para cadastrar uma nova senha.",
    });
  } catch (e) {
    console.error("[auth/password/recover] error:", e);
    return res.status(200).json({
      message:
        "Se o e-mail estiver cadastrado e ativo, você receberá um link para cadastrar uma nova senha.",
    });
  }
});

// PASSWORD CHECK
router.get("/password/check", async (req: Request, res: Response) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ error: "token é obrigatório" });

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users
        WHERE reset_token=? AND reset_expires IS NOT NULL AND reset_expires > NOW()
        LIMIT 1`,
      [token]
    );
    if (Array.isArray(rows) && rows.length) return res.sendStatus(204);
    return res.status(400).json({ error: "token inválido ou expirado" });
  } catch (_e) {
    return res.status(400).json({ error: "token inválido" });
  }
});

// PASSWORD RESET (aceita "password" OU "newPassword")
router.post("/password/reset", async (req: Request, res: Response) => {
  const body = (req.body || {}) as {
    token?: string;
    password?: string;
    newPassword?: string;
  };
  const token = body.token;
  const pwd = body.password ?? body.newPassword;
  if (!token || !pwd)
    return res.status(400).json({ error: "token e password são obrigatórios" });

  try {
    const [rows] = await pool.query<UserRow[]>(
      `SELECT id FROM users
        WHERE reset_token=? AND reset_expires IS NOT NULL AND reset_expires > NOW()
        LIMIT 1`,
      [token]
    );
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: "token inválido ou expirado" });
    }

    const userId = rows[0].id;
    const hash = await bcrypt.hash(String(pwd), 10);

    await pool.query(
      `UPDATE users
          SET password_hash=?, reset_token=NULL, reset_expires=NULL, updated_at=NOW()
        WHERE id=?`,
      [hash, userId]
    );

    return res
      .status(200)
      .json({ message: "Senha definida com sucesso. Você já pode entrar." });
  } catch (e) {
    console.error("[auth/password/reset] error:", e);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

export const auth = router;
export default router;
