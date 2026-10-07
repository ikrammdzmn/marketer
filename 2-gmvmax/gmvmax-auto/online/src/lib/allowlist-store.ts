import { auth } from "../../auth";
import { query } from "./db";

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isBootstrapAdmin(email: string): boolean {
  const adminEmail = normalizeEmail(process.env.AUTH_ADMIN_EMAIL);
  return !!adminEmail && email === adminEmail;
}

export function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function isAllowlistedEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized)) return false;
  const result = await query(
    `SELECT 1 FROM core.access_allowlist WHERE email = $1 LIMIT 1`,
    [normalized]
  );
  return result.rowCount === 1;
}
