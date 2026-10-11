import Link from "next/link";
import Agenda from "./agenda";
import Affiliates from "./affiliates";

// Index landing — intentionally empty for now. The boards live under
// /gmv-max (tabs), /presets, /creative, /accounts, /catalog.
export default function DashboardIndex() {
  const cards = [
    { href: "/gmv-max?shop=1&metric=total", title: "GMV Max", desc: "Live + Product GMV, TTAM, ROAS, hourly, shop truth." },
    { href: "/creative", title: "Creative", desc: "Probe + cached creative rows." },
    { href: "/accounts", title: "Accounts", desc: "TikTok account allowlist + SOP targets." },
    { href: "/catalog", title: "Catalog", desc: "Friendly campaign + product names." },
    { href: "/presets", title: "Presets", desc: "TTAM scoring bands manager." },
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Index</p>
      <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-400">Landing page — empty for now. Pick a board to open it.</p>
      <div className="mt-6">
        <Agenda />
      </div>
      <div className="mt-3">
        <Affiliates />
      </div>
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
