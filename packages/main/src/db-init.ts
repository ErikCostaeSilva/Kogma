import { pool } from "./db";
import bcrypt from "bcryptjs";

export async function ensureSchema() {
  // cria tabela se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      role VARCHAR(30) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // cria admin padrão se não existir
  const adminEmail = "erikcostaesilvadev@gmail.com";
  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [adminEmail]);
  const exists = Array.isArray(rows) && rows.length > 0;

  if (!exists) {
    const hash = await bcrypt.hash("senha123", 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      ["Admin", adminEmail, hash, "admin"]
    );
    console.log("✅ Usuário admin criado (email:", adminEmail, " / senha: senha123 )");
  }
}