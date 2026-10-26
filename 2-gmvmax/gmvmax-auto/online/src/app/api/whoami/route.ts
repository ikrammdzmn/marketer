import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getUserModules, isAllowlistedEmail, isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";

export const dynamic = "force-dynamic";

// GET /api/whoami — own scope for nav/page gating (email, admin, modules).
export async function GET() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isBootstrapAdmin(email)) {
    return NextResponse.json({ email, isAdmin: true, modules: ["all"] });
  }
  if (!(await isAllowlistedEmail(email))) {
    return NextResponse.json({ error: "not allowlisted" }, { status: 403 });
  }
  return NextResponse.json({ email, isAdmin: false, modules: await getUserModules(email) });
}
