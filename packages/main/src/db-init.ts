import { pool } from "./db";

/** pega o schema atual para consultar o information_schema */
async function getCurrentSchema(): Promise<string> {
  const [rows] = await pool.query("SELECT DATABASE() AS db");
  const db = Array.isArray(rows) ? (rows as any[])[0]?.db : null;
  if (!db) throw new Error("DATABASE() retornou vazio");
  return db;
}

/** verifica se uma coluna existe */
async function columnExists(table: string, column: string): Promise<boolean> {
  const schema = await getCurrentSchema();
  const [rows] = await pool.query(
    `SELECT 1
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME   = ?
        AND COLUMN_NAME  = ?
      LIMIT 1`,
    [schema, table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function ensureSchema() {
  // Cria a tabela base (já com status) se ainda não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT '',
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'user',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Se a tabela já existia sem 'status', adiciona agora (compatível com versões antigas)
  if (!(await columnExists("users", "status"))) {
    await pool.query(
      `ALTER TABLE users ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'`
    );
    // garante valor para linhas antigas
    await pool.query(`UPDATE users SET status = 'active' WHERE status IS NULL`);
  }
}
