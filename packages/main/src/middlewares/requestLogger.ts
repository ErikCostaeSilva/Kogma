// packages/main/src/middlewares/requestLogger.ts
import { Request, Response, NextFunction } from "express";

const MAX = 300;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (process.env.DEBUG_HTTP !== "true") return next();

  const bodyStr = (() => {
    try {
      const s = JSON.stringify(req.body);
      return s.length > MAX ? s.slice(0, MAX) + "…" : s;
    } catch {
      return String(req.body);
    }
  })();

  console.log(
    `[http] ${req.method} ${req.originalUrl} ` +
      `auth=${req.headers.authorization ? "yes" : "no"} ` +
      `user=${
        (req as any).user
          ? `${(req as any).user.email}/${(req as any).user.role}`
          : "-"
      } ` +
      `query=${JSON.stringify(req.query)} body=${bodyStr}`
  );

  next();
}
