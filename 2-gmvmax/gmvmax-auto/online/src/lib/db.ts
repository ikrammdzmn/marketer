import { Pool } from "pg";

// Neon: pooled URL from Vercel Env. Never commit values.
const connectionString =
  process.env.NEON_URL_PROD ||
  process.env.NEON_URL_DEV ||
  process.env.DATABASE_URL ||
  "";

if (!connectionString) {
  throw new Error("NEON_URL_PROD (or NEON_URL_DEV) env var is not set");
}

const needsSsl =
  /neon\.tech|sslmode=require/i.test(connectionString) ||
  process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
