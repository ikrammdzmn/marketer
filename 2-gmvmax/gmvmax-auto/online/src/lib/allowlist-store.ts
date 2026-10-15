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

/** Display names are cosmetic only (never a login key). Empty/whitespace clears to null. */
export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, 64);
}

/** Tolerates pre-026 databases (missing display_name column) by falling back to null. */
export async function getDisplayName(email: string): Promise<string | null> {
  try {
    const result = await query(
      `SELECT display_name FROM core.access_allowlist WHERE email = $1 LIMIT 1`,
      [normalizeEmail(email)]
    );
    const raw = result.rows[0]?.display_name;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

/** Tolerates pre-026 databases by returning false when the column is missing. */
export async function getDisplayNameMap(): Promise<Record<string, string>> {
  try {
    const result = await query(`SELECT email, display_name FROM core.access_allowlist`);
    const map: Record<string, string> = {};
    for (const row of result.rows) {
      if (typeof row.display_name === "string" && row.display_name.trim()) {
        map[row.email] = row.display_name.trim();
      }
    }
    return map;
  } catch {
    return {};
  }
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
