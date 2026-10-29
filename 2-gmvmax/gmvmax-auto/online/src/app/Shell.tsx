"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logOut } from "./logout-action";
import type { ToastKind } from "./toast";
import { canSee, useWhoami } from "./module-gate";

function I({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

const P = {
  grid: "M3 3h7v7H3zM14 3h7v4h-7zM14 12h7v9h-7zM3 14h7v7H3z",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4",
  film: "M3 5h18v14H3zM3 9h18M7 5v14M17 5v14M10 13l4-2-4-2z",
  key: "M14 10a4 4 0 1 0-4 4c.4 0 .8-.1 1.1-.2L13 15h2v2h2v2h3v-3l-5.3-5.3c.1-.2.3-.5.3-.7z",
  store: "M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  live: "M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  box: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01",
  coins: "M12 3v18M7 6h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  bag: "M6 8h15l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2",
  cal: "M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  tag: "M20 12l-8 8-9-9V4h7zM7.5 7.5h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  gauge: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 12l4-4M12 12h.01",
};

const DASH_LINK = { href: "/", label: "Dashboard", icon: P.grid, match: "/" };
const AI_LINK = { href: "/ai", label: "AI Analyst", icon: P.target, match: "/ai" };
const CAL_LINK = { href: "/calendar", label: "Calendar", icon: P.cal, match: "/calendar" };

const SETTINGS_LINKS = [
  { href: "/presets", label: "Presets", icon: P.sliders, match: "/presets", mod: "presets" },
  { href: "/ai/guardrail", label: "AI guardrails", icon: P.gauge, match: "/ai/guardrail", mod: "ai" },
  { href: "/creative", label: "Creative", icon: P.film, match: "/creative", mod: "creative" },
  { href: "/accounts", label: "Accounts", icon: P.users, match: "/accounts", mod: "accounts" },
  { href: "/accounts/live", label: "Live board", icon: P.live, match: "/accounts/live", mod: "accounts" },
  { href: "/catalog", label: "Catalog", icon: P.tag, match: "/catalog", mod: "catalog" },
  { href: "/calendar-settings", label: "Calendar filters", icon: P.sliders, match: "/calendar-settings", mod: "calendar" },
  { href: "/access", label: "Access", icon: P.key, match: "/access", admin: true },
  { href: "/shop-auth/grant", label: "Shop grants", icon: P.bag, match: "/shop-auth/grant", admin: true },
];

const SHOP_LINKS = [{ value: "1", label: "Him.DrSamhan", icon: P.store }];

const ADS_LINKS = [
  { id: "total", name: "Total GMV Max", icon: P.layers },
  { id: "LIVE_GMV_MAX", name: "LIVE GMV Max", icon: P.live },
  { id: "PRODUCT_GMV_MAX", name: "Product GMV Max", icon: P.box },
  { id: "ttam", name: "TTAM (Manual, excl GMV)", icon: P.target },
  { id: "roas", name: "ROAS", icon: P.coins },
  { id: "hourly", name: "Hourly Ads", icon: P.clock },
];

const SHOP_METRIC_LINKS = [
  { id: "hourly-shop", name: "Hourly Shop", icon: P.clock, mod: "gmv-max" },
  { id: "shop-gmv", name: "Shop GMV", icon: P.bag, mod: ["gmv-max", "shop-cost"] },
];

const SHOP_COST_LINK = { href: "/shop-cost", label: "Shop Cost", icon: P.coins, match: "/shop-cost" };
const LIVE_ROI_LINK = { href: "/live-roi", label: "Live ROI", icon: P.gauge, match: "/live-roi" };

const VALID_METRICS = new Set([...ADS_LINKS, ...SHOP_METRIC_LINKS].map((m) => m.id));

// Header today-pill: same MYT day edges as lib/calendar edgeMs, client-safe copy
// (client code must not import lib/calendar — it pulls crypto/pg).
type PillEv = { title: string; start: string; end: string; allDay: boolean };

function pillEdge(s: string, allDay: boolean, isEnd: boolean): number {
  if (allDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - 8 * 3600 * 1000;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  return isEnd ? Infinity : -Infinity;
}

function titlesToday(events: PillEv[]): string[] {
  const now = Date.now();
  const dayStart = Math.floor((now + 8 * 3600 * 1000) / 86400000) * 86400000 - 8 * 3600 * 1000;
  const dayEnd = dayStart + 86400000;
  const out: string[] = [];
  for (const e of events) {
    const s = pillEdge(e.start, e.allDay, false);
    const rawEnd = pillEdge(e.end || e.start, e.allDay, true);
    const end = rawEnd > s ? rawEnd : s + 1;
    if (s < dayEnd && end > dayStart) out.push(e.title);
    if (out.length >= 10) break;
  }
  return out;
}

export default function Shell({
  email,
  displayName,
  isAdmin,
  children,
}: {
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => {
    try { return localStorage.getItem("shell-settings-open") === "1"; } catch { return false; }
  });
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const [todayTitles, setTodayTitles] = useState<string[] | null>(null);

  // Global save-toast host: any page dispatches window event "app-toast".
  useEffect(() => {
    let nextId = 1;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent).detail as { message?: string; kind?: ToastKind };
      const id = nextId++;
      setToasts((p) => [...p.slice(-3), { id, message: String(d?.message ?? "Done."), kind: d?.kind === "err" ? "err" : "ok" }]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
    };
    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  // Header today-pill: one quiet fetch, fail silent (pill just stays hidden).
  useEffect(() => {
    if (!email) return;
    fetch("/api/calendar-events", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body.events)) return;
        setTodayTitles(titlesToday(body.events as PillEv[]));
      })
      .catch(() => {});
  }, [email]);

  // Bare login page: no sidebar, top bar, or menus for signed-out visitors.
  if (pathname === "/sign-in") {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>;
  }

  const rawShop = sp.get("shop") ?? "1";
  const rawMetric = sp.get("metric") ?? "total";
  const shop = rawShop === "1" ? rawShop : "1";
  const metric = VALID_METRICS.has(rawMetric) ? rawMetric : "total";
  const onBoard = pathname === "/gmv-max";

  const itemCls = (active: boolean) =>
    `mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm ${
      active ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-300 hover:bg-zinc-900"
    } ${collapsed ? "lg:justify-center lg:px-0" : ""}`;

  const labelCls = collapsed ? "lg:hidden" : "";
  const headCls = `px-2 text-[11px] uppercase tracking-wide text-zinc-500 ${collapsed ? "lg:hidden" : ""}`;

  const settingsLinks = SETTINGS_LINKS.filter((m) => !m.admin || isAdmin);
  const { modules: scope } = useWhoami();
  const visibleSettings = settingsLinks.filter((m) => !("mod" in m) || canSee(scope, (m as { mod: string }).mod));
  const settingsActive = visibleSettings.some((m) => pathname === m.match || pathname.startsWith(m.match + "/"));
  const showSettings = settingsOpen || settingsActive;
  const toggleSettings = () => {
    setSettingsOpen((v) => {
      try { localStorage.setItem("shell-settings-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };

  const nav = (
    <>
      <div>
        <div className={headCls}>Menu</div>
        {canSee(scope, "dashboard") && (
        <Link
          href={DASH_LINK.href}
          title={DASH_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === DASH_LINK.match)}
        >
          <I d={DASH_LINK.icon} />
          <span className={labelCls}>{DASH_LINK.label}</span>
        </Link>
        )}
        {canSee(scope, "ai") && (
        <Link
          href={AI_LINK.href}
          title={AI_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === AI_LINK.match)}
        >
          <I d={AI_LINK.icon} />
          <span className={labelCls}>{AI_LINK.label}</span>
        </Link>
        )}
        {canSee(scope, "calendar") && (
        <Link
          href={CAL_LINK.href}
          title={CAL_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === CAL_LINK.match)}
        >
          <I d={CAL_LINK.icon} />
          <span className={labelCls}>{CAL_LINK.label}</span>
        </Link>
        )}
      </div>
      {canSee(scope, "gmv-max") && (
      <div className="mt-4">
        <div className={headCls}>Shop</div>
        {SHOP_LINKS.map((s) => (
          <Link
            key={s.value}
            href={`/gmv-max?shop=${s.value}&metric=${metric}`}
            scroll={false}
            title={s.label}
            onClick={() => setOpen(false)}
            className={itemCls(shop === s.value && onBoard)}
          >
            <I d={s.icon} />
            <span className={labelCls}>{s.label}</span>
          </Link>
        ))}
      </div>
      )}
      {canSee(scope, "gmv-max") && (
      <div className="mt-4">
        <div className={headCls}>TikTok Ads</div>
        {ADS_LINKS.map((m) => (
          <Link
            key={m.id}
            href={`/gmv-max?shop=${shop}&metric=${m.id}`}
            scroll={false}
            title={m.name}
            onClick={() => setOpen(false)}
            className={itemCls(metric === m.id && onBoard)}
          >
            <I d={m.icon} />
            <span className={labelCls}>{m.name}</span>
          </Link>
        ))}
      </div>
      )}
      {canSee(scope, "gmv-max") && (
      <div className="mt-4">
        <div className={headCls}>TikTok Shops</div>
        {SHOP_METRIC_LINKS.filter((m) => canSee(scope, (m as { mod: string | string[] }).mod)).map((m) => (
          <Link
            key={m.id}
            href={`/gmv-max?shop=${shop}&metric=${m.id}`}
            scroll={false}
            title={m.name}
            onClick={() => setOpen(false)}
            className={itemCls(metric === m.id && onBoard)}
          >
            <I d={m.icon} />
            <span className={labelCls}>{m.name}</span>
          </Link>
        ))}
        {canSee(scope, "shop-live") && (
        <Link
          href="/shop-live"
          title="Shop Live"
          onClick={() => setOpen(false)}
          className={itemCls(pathname === "/shop-live")}
        >
          <I d={P.live} />
          <span className={labelCls}>Shop Live</span>
        </Link>
        )}
        {canSee(scope, "shop-cost") && (
        <Link
          href={SHOP_COST_LINK.href}
          title={SHOP_COST_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === SHOP_COST_LINK.match)}
        >
          <I d={SHOP_COST_LINK.icon} />
          <span className={labelCls}>{SHOP_COST_LINK.label}</span>
        </Link>
        )}
        {canSee(scope, "live-roi") && (
        <Link
          href={LIVE_ROI_LINK.href}
          title={LIVE_ROI_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === LIVE_ROI_LINK.match)}
        >
          <I d={LIVE_ROI_LINK.icon} />
          <span className={labelCls}>{LIVE_ROI_LINK.label}</span>
        </Link>
        )}
      </div>
      )}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={toggleSettings}
          title="Settings"
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-900 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
        >
          <I d={P.gear} />
          <span className={labelCls}>Settings</span>
          <span className={`ml-auto text-xs text-zinc-500 ${labelCls}`}>{showSettings ? "▾" : "▸"}</span>
        </button>
        {showSettings && visibleSettings.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            title={m.label}
            onClick={() => setOpen(false)}
            className={itemCls(pathname === m.match)}
          >
            <I d={m.icon} />
            <span className={labelCls}>{m.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 border-t border-zinc-800 pt-3">
        {email ? (
          <>
            <div className={`truncate px-3 text-sm font-medium text-zinc-100 ${labelCls}`} title={email}>{displayName || email}</div>
            {displayName && <div className={`mt-0.5 truncate px-3 text-xs text-zinc-500 ${labelCls}`} title={email}>{email}</div>}
            <form action={logOut} className="mt-1" onSubmit={() => setOpen(false)}>
              <button type="submit" title="Sign out" className={itemCls(false)}>
                <span aria-hidden="true">↪</span>
                <span className={labelCls}>Sign out</span>
              </button>
            </form>
          </>
        ) : (
          <Link href="/sign-in" onClick={() => setOpen(false)} title="Sign in" className={itemCls(pathname === "/sign-in")}>
            <span aria-hidden="true">↪</span>
            <span className={labelCls}>Sign in</span>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          className="rounded-lg px-2 py-1.5 text-zinc-200 hover:bg-zinc-800 lg:hidden"
        >
          ☰
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Collapse sidebar"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden rounded-lg px-2 py-1.5 text-zinc-200 hover:bg-zinc-800 lg:block"
        >
          {collapsed ? "»" : "«"}
        </button>
        <h1 className="text-sm font-semibold">Marketer HW</h1>
        <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">PROD</span>
        {todayTitles !== null && (
          <Link
            href="/calendar"
            title={todayTitles.length > 0 ? todayTitles.join(" · ") : "Open calendar"}
            className="ml-auto inline-flex max-w-56 items-center truncate rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600 md:max-w-md"
          >
            <span className="hidden truncate md:inline">
              {todayTitles.length > 0
                ? `· ${todayTitles.length} today: ${todayTitles.slice(0, 2).join(", ")}${todayTitles.length > 2 ? ` +${todayTitles.length - 2}` : ""}`
                : "· nothing today"}
            </span>
            <span className="md:hidden">{todayTitles.length > 0 ? `[${todayTitles.length} today]` : "[none today]"}</span>
          </Link>
        )}
        {!email && (
          <Link href="/sign-in" className="ml-auto rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-800">Sign in</Link>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          className={`hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3 lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto ${
            collapsed ? "lg:w-16" : ""
          }`}
        >
          {nav}
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-3">
              {nav}
            </aside>
          </div>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${
              t.kind === "err"
                ? "border-red-800 bg-red-950 text-red-100"
                : "border-emerald-800 bg-emerald-950 text-emerald-100"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
