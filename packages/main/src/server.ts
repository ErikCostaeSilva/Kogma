import "dotenv/config";
import express from "express";
import cors from "cors";
import { auth } from "./routes/auth";
import { ensureSchema } from "./db-init";
import { requireAuth } from "./middlewares/requireAuth";
import { admin } from "./routes/admin";

async function bootstrap() {
  const app = express();

  app.use(cors({
    origin: [process.env.APP_URL || "http://localhost:5173"],
    credentials: true
  }));
  app.use(express.json());

  app.use("/auth", auth);

  app.use("/admin", admin);

  // Exige Token (middleware Require)
  app.get("/", requireAuth, (_req, res) => res.json({ ok: true }));

  await ensureSchema();
  const port = Number(process.env.PORT || 3333);
  app.listen(port, () => console.log(`API on http://localhost:${port}`));
}

bootstrap().catch(err => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
