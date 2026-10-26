import { NextResponse } from "next/server";
import { auth } from "../../auth";
import { getUserModules, isAllowlistedEmail, isBootstrapAdmin, normalizeEmail } from "./allowlist-store";

type AccessResult =
  | { ok: true; email: string; isAdmin: boolean }
  | { ok: false; response: NextResponse };

export async function requireAllowlistedUser(): Promise<AccessResult> {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const isAdmin = isBootstrapAdmin(email);
  if (!isAdmin && !(await isAllowlistedEmail(email))) {
    return { ok: false, response: NextResponse.json({ error: "not allowlisted" }, { status: 403 }) };
  }
  return { ok: true, email, isAdmin };
}

export async function requireAllowlistAdmin(): Promise<AccessResult> {
  const access = await requireAllowlistedUser();
  if (!access.ok) return access;
  if (!access.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "admin only" }, { status: 403 }) };
  }
  return access;
}

// Shop-token gate (one swap point for the future per-module model):
// today = bootstrap admin only; later = allowlist modules[] contains
// 'shop-token'. Callers must use this, never inline the admin check.
export async function requireShopTokenAccess(): Promise<AccessResult> {
  return requireAllowlistAdmin();
}

/**
 * Per-module gate (031, deny-by-default). Pass ANY of the modules that serve
 * the data (shared reads list several). Bootstrap admin and 'all' always pass.
 * Unknown/empty scope on the row denies (normalizeModules drops it to []).
 */
export async function requireModule(...modules: string[]): Promise<AccessResult> {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (isBootstrapAdmin(email)) {
    return { ok: true, email, isAdmin: true };
  }
  if (!(await isAllowlistedEmail(email))) {
    return { ok: false, response: NextResponse.json({ error: "not allowlisted" }, { status: 403 }) };
  }
  const have = await getUserModules(email);
  if (have.includes("all")) {
    return { ok: true, email, isAdmin: false };
  }
  const want = modules.map((m) => String(m).trim().toLowerCase());
  if (want.length > 0 && want.some((m) => have.includes(m))) {
    return { ok: true, email, isAdmin: false };
  }
  return { ok: false, response: NextResponse.json({ error: "module not granted" }, { status: 403 }) };
}
