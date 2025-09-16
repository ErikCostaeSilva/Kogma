import { pool } from "./db";

export async function ensureSchema() {

  await pool.query("CREATE DATABASE IF NOT EXISTS metallurgica CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
  await pool.query("USE metallurgica");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT 'Usuário',
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      role ENUM('admin','user') NOT NULL DEFAULT 'user',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      reset_token VARCHAR(255),
      reset_expires DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(190) NOT NULL,
      cnpj VARCHAR(14) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      title VARCHAR(190) NOT NULL,
      qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit ENUM('Unidades','KG','M','M2','M3','Peças') NOT NULL DEFAULT 'Unidades',
      client_deadline DATE,
      final_deadline DATE,
      status ENUM('open','late','done') NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      INDEX idx_orders_company (company_id),
      INDEX idx_orders_status (status)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_processes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      name ENUM('Corte a laser','Calandragem','Dobra','Montagem','Soldagem','Pintura') NOT NULL,
      planned_date DATE NULL,
      done TINYINT(1) NOT NULL DEFAULT 0,
      CONSTRAINT fk_proc_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_order_process (order_id, name)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      qty DECIMAL(12,3) NOT NULL DEFAULT 0,
      unit ENUM('Peças','KG','M','M2','M3') NOT NULL DEFAULT 'Peças',
      in_stock TINYINT(1) NOT NULL DEFAULT 0,
      CONSTRAINT fk_mat_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_mat_order (order_id)
    ) ENGINE=InnoDB;
  `);

  const [cols]: any = await pool.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
  `);
  if (!cols.length) {
    await pool.query(`ALTER TABLE users ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'`);
  }
}
