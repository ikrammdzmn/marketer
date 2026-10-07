import { NextResponse } from "next/server";
import { auth } from "../../auth";
import { isAllowlistedEmail, isBootstrapAdmin, normalizeEmail } from "./allowlist-store";

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
