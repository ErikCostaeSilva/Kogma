// packages/main/src/middlewares/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: { sub: number; role: "admin" | "user"; email: string };
    }
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} não definida. Configure packages/main/.env`);
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // >>> PERMITIR PREFLIGHT/HEAD SEM TOKEN <<<
  if (req.method === "OPTIONS" || req.method === "HEAD") {
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    if (process.env.DEBUG_AUTH === "true") {
      console.log("[auth] falta token |", req.method, req.originalUrl);
    }
    return res.status(401).json({ error: "Não autenticado" });
  }

  const token = auth.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET as any) as any;
    req.user = {
      sub: Number(payload.sub),
      role: payload.role,
      email: payload.email,
    };
    if (process.env.DEBUG_AUTH === "true") {
      console.log(
        `[auth] ok | ${req.method} ${req.originalUrl} | ${req.user.email} (${req.user.role})`
      );
    }
    return next();
  } catch (e) {
    if (process.env.DEBUG_AUTH === "true") {
      console.log(
        "[auth] token inválido |",
        req.method,
        req.originalUrl,
        String(e)
      );
    }
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireRole(...roles: Array<"admin" | "user">) {
  return (req: Request, res: Response, next: NextFunction) => {
    // também deixa OPTIONS/HEAD passar
    if (req.method === "OPTIONS" || req.method === "HEAD") {
      return next();
    }
    if (!req.user) {
      if (process.env.DEBUG_AUTH === "true") {
        console.log("[role] sem req.user |", req.method, req.originalUrl);
      }
      return res.status(401).json({ error: "Não autenticado" });
    }
    const allowed = roles.includes(req.user.role);
    if (process.env.DEBUG_AUTH === "true") {
      console.log(
        `[role] need=${roles.join("|")} got=${req.user.role} -> ${
          allowed ? "PASS" : "DENY"
        }`
      );
    }
    if (!allowed) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}
