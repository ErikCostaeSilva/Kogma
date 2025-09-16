import express from "express";
import cors from "cors";
import { ensureSchema } from "./db-init";

import { auth } from "./routes/auth";
import { admin as adminRoutes } from "./routes/admin";
import { companies } from "./routes/companies";
import { orders } from "./routes/orders";

const app = express();

app.use(
  cors({
    origin: [/^http:\/\/localhost:5173$/, /^http:\/\/192\.168\.\d+\.\d+:5173$/],
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", auth);
app.use("/admin", adminRoutes);
app.use("/companies", companies);
app.use("/orders", orders);

const PORT = process.env.PORT || 3333;

async function bootstrap() {
  try {
    await ensureSchema();
    app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  } catch (e) {
    console.error("Falha ao iniciar:", e);
    process.exit(1);
  }
}

bootstrap();
