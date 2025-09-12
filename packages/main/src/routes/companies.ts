import { Router } from "express";
import { pool } from "../db";

export const companies = Router();

// ---------------- CNPJ helpers ----------------
function onlyDigits(v: string) { return (v || "").replace(/\D+/g, ""); }
function isValidCNPJ(v: string) {
  const c = onlyDigits(v);
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  const nums = c.split("").map(n => Number(n));
  const w1  = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2  = [6,5,4,3,2,9,8,7,6,5,4,3,2];

  const sum1 = nums.slice(0,12).reduce((s, n, i) => s + n * w1[i], 0);
  const dv1  = sum1 % 11 < 2 ? 0 : 11 - (sum1 % 11);

  const sum2 = nums.slice(0,13).reduce((s, n, i) => s + n * w2[i], 0);
  const dv2  = sum2 % 11 < 2 ? 0 : 11 - (sum2 % 11);

  return dv1 === nums[12] && dv2 === nums[13];
}
// self-test para evitar futuro “falso inválido”
if (!isValidCNPJ("50331808000120")) {
  console.warn("[CNPJ] self-test falhou — verifique algoritmo");
} else {
  console.log("[CNPJ] self-test OK");
}
// ------------------------------------------------

companies.get("/", async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name, cnpj FROM companies ORDER BY name ASC");
  res.json({ companies: rows });
});

companies.post("/", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const cnpjDigits = onlyDigits(req.body?.cnpj || "");

    if (!name) return res.status(400).json({ message: "Nome obrigatório" });
    if (!isValidCNPJ(cnpjDigits)) {
      console.log("CNPJ inválido recebido:", req.body?.cnpj, "->", cnpjDigits);
      return res.status(400).json({ message: "CNPJ inválido" });
    }

    const [dup] = await pool.query("SELECT id FROM companies WHERE cnpj = ?", [cnpjDigits]);
    // @ts-ignore
    if (dup.length) return res.status(409).json({ message: "CNPJ já cadastrado" });

    const [ins] = await pool.query(
      "INSERT INTO companies (name, cnpj) VALUES (?, ?)",
      [name, cnpjDigits]
    );
    // @ts-ignore
    res.status(201).json({ id: ins.insertId, name, cnpj: cnpjDigits });
  } catch (e) {
    console.error("POST /companies error:", e);
    res.status(500).json({ message: "Erro ao criar empresa" });
  }
});

companies.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const sets: string[] = [];
    const vals: any[] = [];

    if (req.body?.name !== undefined) {
      const name = (req.body.name || "").trim();
      if (!name) return res.status(400).json({ message: "Nome obrigatório" });
      sets.push("name = ?"); vals.push(name);
    }
    if (req.body?.cnpj !== undefined) {
      const cnpjDigits = onlyDigits(req.body.cnpj || "");
      if (!isValidCNPJ(cnpjDigits)) {
        console.log("CNPJ inválido (PATCH):", req.body?.cnpj, "->", cnpjDigits);
        return res.status(400).json({ message: "CNPJ inválido" });
      }
      const [dup] = await pool.query(
        "SELECT id FROM companies WHERE cnpj = ? AND id <> ?",
        [cnpjDigits, id]
      );
      // @ts-ignore
      if (dup.length) return res.status(409).json({ message: "CNPJ já cadastrado" });
      sets.push("cnpj = ?"); vals.push(cnpjDigits);
    }

    if (!sets.length) return res.status(400).json({ message: "Nada para atualizar" });

    vals.push(id);
    await pool.query(`UPDATE companies SET ${sets.join(", ")} WHERE id = ?`, vals);
    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /companies error:", e);
    res.status(500).json({ message: "Erro ao atualizar empresa" });
  }
});
