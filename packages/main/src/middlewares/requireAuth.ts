import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const [scheme, token] = auth.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    (req as any).user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
