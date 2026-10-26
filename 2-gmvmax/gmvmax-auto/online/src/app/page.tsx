import Link from "next/link";
import Agenda from "./agenda";
import Affiliates from "./affiliates";
import { auth } from "../../auth";
import { getUserModules, isBootstrapAdmin, normalizeEmail } from "@/lib/allowlist-store";

// Index landing — intentionally empty for now. The boards live under
// /gmv-max (tabs), /presets, /creative, /accounts, /catalog.
// Cards are filtered by the viewer's module scope (031, deny-by-default).
export default async function DashboardIndex() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  let modules: string[] = ["all"];
  if (email && !isBootstrapAdmin(email)) {
    modules = await getUserModules(email);
  }
  const can = (m: string) => modules.includes("all") || modules.includes(m);
  const cards = [
    { href: "/gmv-max?shop=1&metric=total", title: "GMV Max", desc: "Live + Product GMV, TTAM, ROAS, hourly, shop truth.", mod: "gmv-max" },
    { href: "/creative", title: "Creative", desc: "Probe + cached creative rows.", mod: "creative" },
    { href: "/accounts", title: "Accounts", desc: "TikTok account allowlist + SOP targets.", mod: "accounts" },
    { href: "/accounts/live", title: "Live board", desc: "Live accounts by type.", mod: "accounts" },
    { href: "/catalog", title: "Catalog", desc: "Friendly campaign + product names.", mod: "catalog" },
    { href: "/presets", title: "Presets", desc: "TTAM scoring bands manager.", mod: "presets" },
    { href: "/shop-live", title: "Shop Live", desc: "Shop live sessions.", mod: "shop-live" },
    { href: "/shop-cost", title: "Shop Cost", desc: "Shop cost breakdown.", mod: "shop-cost" },
    { href: "/live-roi", title: "Live ROI", desc: "Live session GMV Max + TTAM blended ROI.", mod: "live-roi" },
    { href: "/ai", title: "AI Analyst", desc: "AI analysis of cached metrics.", mod: "ai" },
    { href: "/calendar", title: "Calendar", desc: "Events calendar.", mod: "calendar" },
  ].filter((c) => can(c.mod));
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Index</p>
      <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-400">Landing page — empty for now. Pick a board to open it.</p>
      {can("calendar") && (
      <div className="mt-6">
        <Agenda />
      </div>
      )}
      {can("dashboard") && (
      <div className="mt-3">
        <Affiliates />
      </div>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:bg-zinc-800"
          >
            <div className="font-medium">{c.title}</div>
            <div className="mt-1 text-xs text-zinc-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
