// packages/main/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureSchema } from "./db-init";
import { auth } from "./routes/auth";
import { orders } from "./routes/orders";
import { companies } from "./routes/companies";
import { users } from "./routes/users";
import { pool } from "./db";
import { requireAuth, requireRole } from "./middlewares/requireAuth";
import { requestLogger } from "./middlewares/requestLogger"; // se estiver usando

const app = express();

/**
 * CORS e preflight precisam vir ANTES de qualquer guard (/admin),
 * senão o OPTIONS é bloqueado pelo requireAuth.
 */
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// Resposta rápida a qualquer preflight
app.options("*", cors(), (_req, res) => res.sendStatus(204));

app.use(express.json());
app.use(requestLogger); // ok ficar antes; ele só loga

// Gate de admin DEPOIS do CORS/preflight
app.use("/admin", requireAuth, requireRole("admin"));

app.get("/health", (_req, res) => res.send("ok"));
app.get("/debug/db", async (_req, res) => {
  const [r]: any = await pool.query(
    "SELECT DATABASE() AS db, @@hostname AS host, @@port AS port"
  );
  const data = Array.isArray(r) ? r[0] : null;
  const masked = String(process.env.DATABASE_URL || "").replace(
    /(mysql:\/\/)(.*?)(@)/,
    "$1***$3"
  );
  res.json({
    database: data?.db,
    host: data?.host,
    port: data?.port,
    DATABASE_URL: masked,
  });
});

console.log("[CNPJ] self-test OK");

// Rotas
app.use("/auth", auth);
app.use("/orders", orders);
app.use("/companies", companies);
app.use("/users", users);

// >>> Alias para compatibilizar com o front atual <<<
app.use("/admin/users", users);

// 404 verboso para pegar paths errados
app.use((req, res) => {
  console.error("[404]", req.method, req.originalUrl);
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

async function bootstrap() {
  await ensureSchema();
  const PORT = Number(process.env.PORT || 3333);
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}

bootstrap().catch((e) => {
  console.error("Falha ao iniciar:", e);
  process.exit(1);
});
