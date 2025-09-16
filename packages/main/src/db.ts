// packages/main/src/db.ts
import mysql from "mysql2/promise";

function parseDbNameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const name = u.pathname.replace(/^\//, "");
    return name || null;
  } catch {
    return null;
  }
}

const {
  DATABASE_URL,
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME,
} = process.env;

export const pool = DATABASE_URL
  ? mysql.createPool({
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    } as any)
  : mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME || parseDbNameFromUrl(DATABASE_URL || "") || "kogma",
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
