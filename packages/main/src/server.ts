import "dotenv/config";
import express from "express";
import cors from "cors";
import { auth } from "./routes/auth";
import { ensureSchema } from "./db-init";


async function bootstrap() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use("/auth", auth);
  app.get("/", (_req, res) => res.json({ ok: true }));

  await ensureSchema(); // <- cria/semeia se faltar
  const port = Number(process.env.PORT || 3333);
  app.listen(port, () => console.log(`API on http://localhost:${port}`));
}

bootstrap().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
