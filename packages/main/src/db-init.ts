// packages/main/src/db-init.ts
import { pool } from "./db";

/** Verifica se a coluna existe na tabela atual do schema selecionado */
async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows]: any = await pool.query(
    `
    SELECT 1
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

/** Executa ALTER TABLE para adicionar uma coluna, se ela não existir */
async function ensureColumn(table: string, column: string, columnDDL: string) {
  const exists = await columnExists(table, column);
  if (!exists) {
    const sql = `ALTER TABLE ${table} ADD COLUMN ${columnDDL}`;
    await pool.query(sql);
  }
}

export async function ensureSchema() {
  // =========================
  // TABELA USERS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT 'Usuário',
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      role ENUM('admin','user') NOT NULL DEFAULT 'user',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      reset_token VARCHAR(255) NULL,
      reset_expires DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  // Garantias para bancos já existentes
  await ensureColumn(
    "users",
    "status",
    `status ENUM('active','inactive') NOT NULL DEFAULT 'active'`
  );
  await ensureColumn("users", "reset_token", `reset_token VARCHAR(255) NULL`);
  await ensureColumn("users", "reset_expires", `reset_expires DATETIME NULL`);
  await ensureColumn(
    "users",
    "created_at",
    `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  );
  await ensureColumn(
    "users",
    "updated_at",
    `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );

  // =========================
  // TABELA COMPANIES
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(190) NOT NULL,
      cnpj VARCHAR(14) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await ensureColumn(
    "companies",
    "created_at",
    `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  );
  await ensureColumn(
    "companies",
    "updated_at",
    `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );

  // =========================
  // TABELA ORDERS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      title VARCHAR(190) NOT NULL,
      qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit ENUM('Unidades','KG','M','M2','M3','Peças') NOT NULL DEFAULT 'Unidades',
      client_deadline DATE NULL,
      final_deadline DATE NULL,
      status ENUM('open','late','done') NOT NULL DEFAULT 'open',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_company FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      INDEX idx_orders_company (company_id),
      INDEX idx_orders_status (status)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn(
    "orders",
    "created_at",
    `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  );
  await ensureColumn(
    "orders",
    "updated_at",
    `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );

  // =========================
  // TABELA PROCESSES
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS processes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      name ENUM('Corte a laser','Calandragem','Dobra','Montagem','Soldagem','Pintura') NOT NULL,
      planned_date DATE NULL,
      done TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_proc_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_order_process (order_id, name)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn(
    "processes",
    "created_at",
    `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  );
  await ensureColumn(
    "processes",
    "updated_at",
    `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );

  // =========================
  // TABELA ORDER_MATERIALS
  // =========================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit ENUM('Peças','KG','M','M2','M3') NOT NULL DEFAULT 'Peças',
      in_stock TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mat_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_mat_order (order_id)
    ) ENGINE=InnoDB;
  `);

  await ensureColumn(
    "order_materials",
    "created_at",
    `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  );
  await ensureColumn(
    "order_materials",
    "updated_at",
    `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );
}
