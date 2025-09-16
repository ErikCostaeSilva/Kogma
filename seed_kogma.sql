-- seed_kogma.sql
CREATE DATABASE IF NOT EXISTS kogma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kogma;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  qty INT NOT NULL,
  unit ENUM('Peças','KG','M','M2','M3') NOT NULL,
  client_deadline DATE NULL,
  final_deadline DATE NULL,
  status ENUM('open','late','done') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  qty INT NOT NULL,
  unit ENUM('Peças','KG','M','M2','M3') NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materials_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS processes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  planned_date DATE NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_processes_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrador', 'admin@kogma.com',
        '$2b$10$4l6kxx3xvV8rQm2h0VI/3uYo2t5r6oY8l6v8mP7c9J3Qy9cVQyJQO',
        'admin')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO companies (name, cnpj)
VALUES ('Kogma Indústria Ltda', '12.345.678/0001-90')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO orders (company_id, title, qty, unit, client_deadline, final_deadline, status)
VALUES (1, 'Ordem de Produção Inicial', 100, 'Peças', '2025-09-30', '2025-10-15', 'open');

INSERT INTO materials (order_id, description, qty, unit, in_stock)
VALUES (1, 'Chapas de Aço', 50, 'KG', FALSE);

INSERT INTO processes (order_id, name, planned_date, done)
VALUES (1, 'Corte de chapas', '2025-09-20', FALSE);
