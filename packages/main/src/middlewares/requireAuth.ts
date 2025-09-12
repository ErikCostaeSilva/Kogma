import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const [scheme, token] = auth.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = Number(payload.sub);
    if (!userId) return res.status(401).json({ message: "Token inválido" });

    const [rows] = await pool.query("SELECT id, role, status FROM users WHERE id = ?", [userId]);
    const user = Array.isArray(rows) ? (rows as any[])[0] : null;
    if (!user) return res.status(401).json({ message: "Usuário não encontrado" });
    if (user.status === "inactive") return res.status(403).json({ message: "Usuário desabilitado" });

    (req as any).user = { id: user.id, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
