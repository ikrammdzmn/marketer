"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logOut } from "./logout-action";
import type { ToastKind } from "./toast";

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
};

const DASH_LINK = { href: "/", label: "Dashboard", icon: P.grid, match: "/" };

const SETTINGS_LINKS = [
  { href: "/presets", label: "Presets", icon: P.sliders, match: "/presets" },
  { href: "/creative", label: "Creative", icon: P.film, match: "/creative" },
  { href: "/accounts", label: "Accounts", icon: P.users, match: "/accounts" },
  { href: "/catalog", label: "Catalog", icon: P.tag, match: "/catalog" },
  { href: "/calendar-settings", label: "Calendar", icon: P.cal, match: "/calendar-settings" },
  { href: "/access", label: "Access", icon: P.key, match: "/access", admin: true },
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
  { id: "hourly-shop", name: "Hourly Shop", icon: P.clock },
  { id: "shop-gmv", name: "Shop GMV", icon: P.bag },
];

const VALID_METRICS = new Set([...ADS_LINKS, ...SHOP_METRIC_LINKS].map((m) => m.id));

export default function Shell({
  email,
  isAdmin,
  children,
}: {
  email: string | null;
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
  const settingsActive = settingsLinks.some((m) => pathname === m.match);
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
        <Link
          href={DASH_LINK.href}
          title={DASH_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === DASH_LINK.match)}
        >
          <I d={DASH_LINK.icon} />
          <span className={labelCls}>{DASH_LINK.label}</span>
        </Link>
      </div>
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
      <div className="mt-4">
        <div className={headCls}>TikTok Shops</div>
        {SHOP_METRIC_LINKS.map((m) => (
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
        <Link
          href="/shop-live"
          title="Shop Live"
          onClick={() => setOpen(false)}
          className={itemCls(pathname === "/shop-live")}
        >
          <I d={P.live} />
          <span className={labelCls}>Shop Live</span>
        </Link>
      </div>
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
        {showSettings && settingsLinks.map((m) => (
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
        <h1 className="text-sm font-semibold">GMV Max Online</h1>
        <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">PROD</span>
        <span className="hidden text-xs text-zinc-400 md:inline">Neon prod · live TikTok API (lag 15m–2h)</span>
        <span className="ml-auto text-xs text-zinc-400">{email || ""}</span>
        {email ? (
          <form action={logOut}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">Sign out</button>
          </form>
        ) : (
          <Link href="/sign-in" className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-800">Sign in</Link>
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
