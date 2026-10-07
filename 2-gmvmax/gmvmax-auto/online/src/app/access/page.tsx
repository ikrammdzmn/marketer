import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";
import AccessManager from "./access-manager";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email || !isBootstrapAdmin(email)) redirect("/");
  return <AccessManager />;
}
