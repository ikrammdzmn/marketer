"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logOut } from "./logout-action";
import type { ToastKind } from "./toast";
import { canSee, useWhoami } from "./module-gate";
import { useTheme } from "./theme";

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
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  receipt: "M6 3h12v18l-2-1.6-2 1.6-2-1.6L10 21l-2-1.6L6 21zM9 8h6M9 12h6",
  chart: "M4 20h16M7 20v-6M12 20V6M17 20v-9",
};

const DASH_LINK = { href: "/", label: "Dashboard", icon: P.grid, match: "/" };
const AI_LINK = { href: "/ai", label: "AI Analyst", icon: P.target, match: "/ai" };
const CAL_LINK = { href: "/calendar", label: "Calendar", icon: P.cal, match: "/calendar" };
const ALL_CREATIVE_LINK = { href: "/all-creative", label: "All Creative", icon: P.film, match: "/all-creative", mod: ["gmv-max", "creative", "shop-live", "seller-creative", "live-roi"] };

const SETTINGS_LINKS = [
  { href: "/presets", label: "Presets", icon: P.sliders, match: "/presets", mod: "presets" },
  { href: "/ai/guardrail", label: "AI guardrails", icon: P.shield, match: "/ai/guardrail", mod: "ai" },
  { href: "/catalog", label: "Catalog", icon: P.tag, match: "/catalog", mod: "catalog" },
  { href: "/calendar-settings", label: "Calendar filters", icon: P.cal, match: "/calendar-settings", mod: "calendar" },
  { href: "/access", label: "Access", icon: P.key, match: "/access", admin: true },
  { href: "/shop-auth/grant", label: "Shop grants", icon: P.bag, match: "/shop-auth/grant", admin: true },
];

// Accounts group (collapsible, collapsed by default): Accounts + Live board.
const ACCOUNTS_LINK = { href: "/accounts", label: "Accounts", icon: P.users, match: "/accounts", mod: "accounts" };
const LIVE_BOARD_LINK = { href: "/accounts/live", label: "Live board", icon: P.live, match: "/accounts/live", mod: "accounts" };

const SELLER_CREATIVE_LINK = { href: "/seller-creative", label: "Seller Creative", icon: P.store, match: "/seller-creative", mod: "seller-creative" };

const ADS_LINKS = [
  { id: "total", name: "Total GMV Max", icon: P.layers },
  { id: "LIVE_GMV_MAX", name: "LIVE GMV Max", icon: P.live },
  { id: "PRODUCT_GMV_MAX", name: "Product GMV Max", icon: P.box },
  { id: "ttam", name: "TTAM campaign", icon: P.target },
  { id: "roas", name: "ROAS", icon: P.coins },
  { id: "hourly", name: "Hourly Ads", icon: P.chart },
];

// Product group header doubles as the Product GMV Max row (collapsible,
// collapsed by default). PGMVM Creative lives inside it.
const GMV_CREATIVE_LINK = { href: "/creative", label: "PGMVM Creative", icon: P.film, match: "/creative", mod: "creative" };
// Live group header (collapsible, collapsed by default). Live Dashboard
// (/shop-live) lives inside it.
const LIVE_DASHBOARD_LINK = { href: "/shop-live", label: "Live Dashboard", icon: P.live, match: "/shop-live", mod: "shop-live" };

const SHOP_METRIC_LINKS = [
  { id: "shop-gmv", name: "Shop GMV", icon: P.bag, mod: ["gmv-max", "shop-cost"] },
  { id: "hourly-shop", name: "Hourly Shop", icon: P.clock, mod: "gmv-max" },
];

const SHOP_COST_LINK = { href: "/shop-cost", label: "Shop Cost", icon: P.receipt, match: "/shop-cost" };
const LIVE_ROI_LINK = { href: "/live-roi", label: "Live ROI", icon: P.gauge, match: "/live-roi" };

const VALID_METRICS = new Set([...ADS_LINKS, ...SHOP_METRIC_LINKS].map((m) => m.id));

// Header today-pill: same MYT day edges as lib/calendar edgeMs, client-safe copy
// (client code must not import lib/calendar — it pulls crypto/pg).
type PillEv = { title: string; start: string; end: string; allDay: boolean; task: boolean; promo: boolean };

function pillEdge(s: string, allDay: boolean, isEnd: boolean): number {
  if (allDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - 8 * 3600 * 1000;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  return isEnd ? Infinity : -Infinity;
}

function pillWhen(e: PillEv): string {
  if (e.allDay) return "all day";
  const f = (s: string) => {
    const t = Date.parse(s);
    if (Number.isNaN(t)) return "";
    return new Date(t).toLocaleTimeString("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit" });
  };
  const a = f(e.start), b = f(e.end || e.start);
  if (!a) return "";
  return b && b !== a ? `${a}–${b}` : a;
}

function pillDayIdx(ms: number): number {
  return Math.floor((ms + 8 * 3600 * 1000) / 86400000);
}

function pillSpan(e: PillEv): { first: number; last: number } {
  const s = pillEdge(e.start, e.allDay, false);
  const raw = pillEdge(e.end || e.start, e.allDay, true);
  const first = pillDayIdx(s);
  let last: number;
  if (!(raw > s)) last = first;
  else if ((raw + 8 * 3600 * 1000) % 86400000 === 0) last = pillDayIdx(raw) - 1;
  else last = pillDayIdx(raw);
  if (last < first) last = first;
  return { first, last };
}

function spanSuffix(pos: number, total: number): string {
  if (!(total > 1)) return "";
  if (pos <= 1) return ` [1st day of ${total}]`;
  if (pos >= total) return ` [last day ${total} of ${total}]`;
  return ` [day ${pos} of ${total}]`;
}

type PillItem = { title: string; suffix: string; when: string; task: boolean; promo: boolean; overdue: boolean };

function itemsToday(events: PillEv[], notes: { date: string; title: string; kind: string; done: boolean }[], todayMYT: string): PillItem[] {
  const now = Date.now();
  const dayStart = Math.floor((now + 8 * 3600 * 1000) / 86400000) * 86400000 - 8 * 3600 * 1000;
  const dayEnd = dayStart + 86400000;
  const todayIdx = pillDayIdx(dayStart);
  const out: PillItem[] = [];
  for (const e of events) {
    const s = pillEdge(e.start, e.allDay, false);
    const rawEnd = pillEdge(e.end || e.start, e.allDay, true);
    const end = rawEnd > s ? rawEnd : s + 1;
    if (s < dayEnd && end > dayStart) {
      const r = pillSpan(e);
      const total = r.last - r.first + 1;
      const pos = todayIdx - r.first + 1;
      out.push({ title: e.title, suffix: spanSuffix(pos, total), when: pillWhen(e), task: !!e.task, promo: !!e.promo, overdue: false });
    }
  }
  // Task notes: today's undone + up to 3 overdue (oldest first), tagged so
  // the ticker stays honest about what is late.
  const open = notes.filter((n) => !n.done && n.date <= todayMYT);
  for (const n of open.filter((n) => n.date === todayMYT)) {
    out.push({ title: n.title, suffix: "", when: n.kind || "note", task: true, promo: false, overdue: false });
  }
  const overdue = open.filter((n) => n.date < todayMYT).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3);
  for (const n of overdue) {
    out.push({ title: n.title, suffix: " [overdue]", when: n.date, task: true, promo: false, overdue: true });
  }
  // Today's tasks first, then overdue notes, then the rest — high-priority
  // items surface even when truncated.
  out.sort((a, b) => Number(b.task && !b.overdue) - Number(a.task && !a.overdue) || Number(b.overdue) - Number(a.overdue) || Number(b.promo) - Number(a.promo));
  return out.slice(0, 10);
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
  const [productOpen, setProductOpen] = useState(() => {
    try { return localStorage.getItem("shell-product-open") === "1"; } catch { return false; }
  });
  const [liveOpen, setLiveOpen] = useState(() => {
    try { return localStorage.getItem("shell-live-open") === "1"; } catch { return false; }
  });
  const [adsSecOpen, setAdsSecOpen] = useState(() => {
    try { return localStorage.getItem("shell-adssec-open") !== "0"; } catch { return true; }
  });
  const [shopsSecOpen, setShopsSecOpen] = useState(() => {
    try { return localStorage.getItem("shell-shopssec-open") !== "0"; } catch { return true; }
  });
  const [accountsOpen, setAccountsOpen] = useState(() => {
    try { return localStorage.getItem("shell-accounts-open") === "1"; } catch { return false; }
  });
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const [todayItems, setTodayItems] = useState<PillItem[] | null>(null);
  const [theme, setTheme] = useTheme();
  // Pill ticker + dropdown: rotate one title at a time (~3s), pause on
  // hover/focus/open, static when reduced-motion is preferred.
  const [tick, setTick] = useState(0);
  const [pillPaused, setPillPaused] = useState(false);
  const [pillOpen, setPillOpen] = useState(false);
  const [reduceMotion] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pillWrapRef = useRef<HTMLDivElement | null>(null);

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

  // Header today-pill: quiet fetches, fail silent (pill just stays hidden).
  // Re-runs on mount + whenever task notes change anywhere (toggle/add/edit/delete).
  const loadPill = useCallback(() => {
    if (!email) return;
    const todayMYT = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    Promise.allSettled([
      fetch("/api/calendar-events", { cache: "no-store" }).then(async (r) => {
        const body = await r.json();
        return r.ok && Array.isArray(body.events) ? (body.events as PillEv[]) : [];
      }),
      fetch("/api/task-notes?days=1", { cache: "no-store" }).then(async (r) => {
        const body = await r.json();
        return r.ok && Array.isArray(body.notes) ? body.notes : [];
      }),
    ])
      .then(([ev, nt]) => {
        const events = ev.status === "fulfilled" ? ev.value : [];
        const notes = nt.status === "fulfilled" ? nt.value : [];
        setTodayItems(itemsToday(events, notes, todayMYT));
      })
      .catch(() => {});
  }, [email]);
  useEffect(() => { loadPill(); }, [loadPill]);
  useEffect(() => {
    window.addEventListener("task-notes-changed", loadPill);
    return () => window.removeEventListener("task-notes-changed", loadPill);
  }, [loadPill]);

  // Ticker rotation + dropdown close (outside-click / Esc).
  useEffect(() => {
    if (!todayItems || todayItems.length < 2 || pillPaused || pillOpen || reduceMotion) return;
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, [todayItems, pillPaused, pillOpen, reduceMotion]);
  useEffect(() => {
    if (!pillOpen) return;
    const onDown = (e: PointerEvent) => {
      if (pillWrapRef.current && !pillWrapRef.current.contains(e.target as Node)) setPillOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPillOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pillOpen]);

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
  const canAccounts = canSee(scope, ACCOUNTS_LINK.mod);
  const accountsActive =
    pathname === ACCOUNTS_LINK.match || pathname.startsWith(ACCOUNTS_LINK.match + "/") ||
    pathname === LIVE_BOARD_LINK.match || pathname.startsWith(LIVE_BOARD_LINK.match + "/");
  const settingsActive = visibleSettings.some((m) => pathname === m.match || pathname.startsWith(m.match + "/")) || (canAccounts && accountsActive);
  const showSettings = settingsOpen || settingsActive;
  const toggleSettings = () => {
    setSettingsOpen((v) => {
      try { localStorage.setItem("shell-settings-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };
  const canProduct = canSee(scope, "gmv-max");
  const canGmvCreative = canSee(scope, GMV_CREATIVE_LINK.mod);
  const productBoardActive = metric === "PRODUCT_GMV_MAX" && onBoard;
  const gmvCreativeActive = pathname === GMV_CREATIVE_LINK.match || pathname.startsWith(GMV_CREATIVE_LINK.match + "/");
  const productActive = productBoardActive || gmvCreativeActive;
  const showProduct = productOpen || productActive;
  const toggleProduct = () => {
    setProductOpen((v) => {
      try { localStorage.setItem("shell-product-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };
  const canLiveBoard = canSee(scope, "gmv-max");
  const canLiveDash = canSee(scope, LIVE_DASHBOARD_LINK.mod);
  const liveBoardActive = metric === "LIVE_GMV_MAX" && onBoard;
  const liveDashActive = pathname === LIVE_DASHBOARD_LINK.match || pathname.startsWith(LIVE_DASHBOARD_LINK.match + "/");
  const liveActive = liveBoardActive || liveDashActive;
  const showLive = liveOpen || liveActive;
  const toggleLive = () => {
    setLiveOpen((v) => {
      try { localStorage.setItem("shell-live-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };
  const ADS_METRICS = ["total", "LIVE_GMV_MAX", "PRODUCT_GMV_MAX", "ttam", "roas", "hourly"];
  const sellerCreativeActive = pathname === SELLER_CREATIVE_LINK.match || pathname.startsWith(SELLER_CREATIVE_LINK.match + "/");
  const adsSecActive = liveActive || productActive || (onBoard && ADS_METRICS.includes(metric));
  const shopsSecActive =
    (onBoard && (metric === "hourly-shop" || metric === "shop-gmv")) ||
    pathname === SHOP_COST_LINK.match || pathname.startsWith(SHOP_COST_LINK.match + "/") ||
    pathname === LIVE_ROI_LINK.match || pathname.startsWith(LIVE_ROI_LINK.match + "/") ||
    sellerCreativeActive;
  const showAdsSec = adsSecOpen || adsSecActive || collapsed;
  const showShopsSec = shopsSecOpen || shopsSecActive || collapsed;
  const toggleAdsSec = () => {
    setAdsSecOpen((v) => {
      try { localStorage.setItem("shell-adssec-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };
  const toggleShopsSec = () => {
    setShopsSecOpen((v) => {
      try { localStorage.setItem("shell-shopssec-open", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };
  const showAccounts = accountsOpen || accountsActive;
  const toggleAccounts = () => {
    setAccountsOpen((v) => {
      try { localStorage.setItem("shell-accounts-open", v ? "0" : "1"); } catch { /* private mode */ }
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
        {canSee(scope, ALL_CREATIVE_LINK.mod) && (
        <Link
          href={ALL_CREATIVE_LINK.href}
          title={ALL_CREATIVE_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(pathname === ALL_CREATIVE_LINK.match)}
        >
          <I d={ALL_CREATIVE_LINK.icon} />
          <span className={labelCls}>{ALL_CREATIVE_LINK.label}</span>
        </Link>
        )}
      </div>
      {canSee(scope, "gmv-max") && (
      <div className="mt-4">
        <button
          type="button"
          onClick={toggleAdsSec}
          title="TikTok Ads"
          className={`flex w-full items-center gap-2 px-2 text-left text-[11px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300 ${collapsed ? "lg:hidden" : ""}`}
        >
          <span>TikTok Ads</span>
          <span className="ml-auto text-xs">{showAdsSec ? "▾" : "▸"}</span>
        </button>
        {showAdsSec && (<>
        {ADS_LINKS.filter((m) => m.id === "total").map((m) => (
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
        {(canLiveBoard || canLiveDash) && (
          <div>
            <button
              type="button"
              onClick={toggleLive}
              title="Live GMV Max"
              className={itemCls(liveActive && !showLive)}
            >
              <I d={P.live} />
              <span className={labelCls}>Live GMV Max</span>
              <span className={`ml-auto text-xs text-zinc-500 ${labelCls}`}>{showLive ? "▾" : "▸"}</span>
            </button>
            {showLive && (
              <div className={`ml-4 border-l border-zinc-800 pl-2 ${collapsed ? "lg:ml-0 lg:border-l-0 lg:pl-0" : ""}`}>
                {canLiveBoard && (
                  <Link
                    href={`/gmv-max?shop=${shop}&metric=LIVE_GMV_MAX`}
                    scroll={false}
                    title="LGMVM campaign"
                    onClick={() => setOpen(false)}
                    className={itemCls(liveBoardActive)}
                  >
                    <I d={P.live} />
                    <span className={labelCls}>LGMVM campaign</span>
                  </Link>
                )}
                {canLiveDash && (
                  <Link
                    href={LIVE_DASHBOARD_LINK.href}
                    title={LIVE_DASHBOARD_LINK.label}
                    onClick={() => setOpen(false)}
                    className={itemCls(liveDashActive)}
                  >
                    <I d={LIVE_DASHBOARD_LINK.icon} />
                    <span className={labelCls}>{LIVE_DASHBOARD_LINK.label}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        {(canProduct || canGmvCreative) && (
          <div>
            <button
              type="button"
              onClick={toggleProduct}
              title="Product GMV Max"
              className={itemCls(productActive && !showProduct)}
            >
              <I d={P.box} />
              <span className={labelCls}>Product GMV Max</span>
              <span className={`ml-auto text-xs text-zinc-500 ${labelCls}`}>{showProduct ? "▾" : "▸"}</span>
            </button>
            {showProduct && (
              <div className={`ml-4 border-l border-zinc-800 pl-2 ${collapsed ? "lg:ml-0 lg:border-l-0 lg:pl-0" : ""}`}>
                {canProduct && (
                  <Link
                    href={`/gmv-max?shop=${shop}&metric=PRODUCT_GMV_MAX`}
                    scroll={false}
                    title="PGMVM campaign"
                    onClick={() => setOpen(false)}
                    className={itemCls(productBoardActive)}
                  >
                    <I d={P.box} />
                    <span className={labelCls}>PGMVM campaign</span>
                  </Link>
                )}
                {canGmvCreative && (
                  <Link
                    href={GMV_CREATIVE_LINK.href}
                    title={GMV_CREATIVE_LINK.label}
                    onClick={() => setOpen(false)}
                    className={itemCls(gmvCreativeActive)}
                  >
                    <I d={GMV_CREATIVE_LINK.icon} />
                    <span className={labelCls}>{GMV_CREATIVE_LINK.label}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
        {ADS_LINKS.filter((m) => m.id !== "total" && m.id !== "LIVE_GMV_MAX" && m.id !== "PRODUCT_GMV_MAX").map((m) => (
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
        </>)}
      </div>
      )}
      {(canSee(scope, "gmv-max") || canSee(scope, SELLER_CREATIVE_LINK.mod)) && (
      <div className="mt-4">
        <button
          type="button"
          onClick={toggleShopsSec}
          title="TikTok Shops"
          className={`flex w-full items-center gap-2 px-2 text-left text-[11px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300 ${collapsed ? "lg:hidden" : ""}`}
        >
          <span>TikTok Shops</span>
          <span className="ml-auto text-xs">{showShopsSec ? "▾" : "▸"}</span>
        </button>
        {showShopsSec && (<>
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
        {canSee(scope, SELLER_CREATIVE_LINK.mod) && (
        <Link
          href={SELLER_CREATIVE_LINK.href}
          title={SELLER_CREATIVE_LINK.label}
          onClick={() => setOpen(false)}
          className={itemCls(sellerCreativeActive)}
        >
          <I d={SELLER_CREATIVE_LINK.icon} />
          <span className={labelCls}>{SELLER_CREATIVE_LINK.label}</span>
        </Link>
        )}
        </>)}
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
        {showSettings && (<>
        {visibleSettings.filter((m) => m.match === "/presets" || m.match === "/ai/guardrail").map((m) => (
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
        {canAccounts && (
          <div>
            <button
              type="button"
              onClick={toggleAccounts}
              title="Accounts"
              className={itemCls(accountsActive && !showAccounts)}
            >
              <I d={P.users} />
              <span className={labelCls}>Accounts</span>
              <span className={`ml-auto text-xs text-zinc-500 ${labelCls}`}>{showAccounts ? "▾" : "▸"}</span>
            </button>
            {showAccounts && (
              <div className={`ml-4 border-l border-zinc-800 pl-2 ${collapsed ? "lg:ml-0 lg:border-l-0 lg:pl-0" : ""}`}>
                {[ACCOUNTS_LINK, LIVE_BOARD_LINK].map((a) => {
                  const aActive = pathname === a.match || pathname.startsWith(a.match + "/");
                  return (
                    <Link
                      key={a.href}
                      href={a.href}
                      title={a.label}
                      onClick={() => setOpen(false)}
                      className={itemCls(aActive)}
                    >
                      <I d={a.icon} />
                      <span className={labelCls}>{a.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {visibleSettings.filter((m) => m.match !== "/presets" && m.match !== "/ai/guardrail").map((m) => (
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
        </>)}
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
        {todayItems !== null && (
          <div
            ref={pillWrapRef}
            className="relative ml-auto"
            onMouseEnter={() => setPillPaused(true)}
            onMouseLeave={() => setPillPaused(false)}
          >
            <div className="flex items-center">
              <Link
                href="/calendar"
                title={todayItems.length > 0 ? todayItems.map((t) => `${t.title}${t.suffix}${t.task ? " (#task)" : t.promo ? " (#event)" : ""}`).join(" · ") : "Open calendar"}
                onFocus={() => setPillPaused(true)}
                onBlur={() => setPillPaused(false)}
                className="inline-flex max-w-56 items-center truncate rounded-l-full border border-r-0 border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600 md:max-w-md"
              >
                {todayItems.some((t) => t.task) ? (
                  <span title="Has high-priority tasks today" className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                ) : todayItems.some((t) => t.promo) ? (
                  <span title="Has sale/campaign events today" className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                ) : null}
                <span className="hidden truncate md:inline">
                  {todayItems.length > 0 ? (
                    reduceMotion || todayItems.length < 2 ? (
                      `· ${todayItems.length} today: ${todayItems.slice(0, 2).map((t) => `${t.title}${t.suffix}`).join(", ")}${todayItems.length > 2 ? ` +${todayItems.length - 2}` : ""}`
                    ) : (
                      (() => {
                        const cur = todayItems[tick % todayItems.length];
                        const cls = cur.task ? "text-rose-200" : cur.promo ? "text-amber-200" : "";
                        return <>· {todayItems.length} today: <span key={tick % todayItems.length} className={`pill-tick inline-block ${cls}`}>{cur.title}{cur.suffix} ({(tick % todayItems.length) + 1}/{todayItems.length})</span></>;
                      })()
                    )
                  ) : (
                    "· nothing today"
                  )}
                </span>
                <span className="md:hidden">{todayItems.length > 0 ? `[${todayItems.length} today]` : "[none today]"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setPillOpen((v) => !v)}
                aria-expanded={pillOpen}
                aria-label={pillOpen ? "Hide today's agenda" : "Show all of today's agenda"}
                title="See all today"
                className="rounded-r-full border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                {pillOpen ? "▴" : "▾"}
              </button>
            </div>
            {pillOpen && (
              <div className="absolute right-0 top-full z-[70] mt-1 w-72 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                <div className="border-b border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300">
                  Today · {todayItems.length} {todayItems.length === 1 ? "item" : "items"}
                </div>
                <div className="max-h-64 overflow-auto">
                  {todayItems.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-zinc-500">Nothing today.</div>
                  ) : (
                    todayItems.map((t, i) => (
                      <Link
                        key={i}
                        href="/calendar"
                        onClick={() => setPillOpen(false)}
                        title={t.task ? `${t.title}${t.suffix} (#task)` : t.promo ? `${t.title}${t.suffix} (#event)` : `${t.title}${t.suffix}`}
                        className="flex items-baseline gap-2 px-3 py-1.5 text-xs hover:bg-zinc-800"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] self-center rounded-full ${t.task ? "bg-rose-400" : t.promo ? "bg-amber-400" : "bg-zinc-600"}`} />
                        <span className="shrink-0 tabular-nums text-zinc-500">{t.when}</span>
                        <span className={`truncate ${t.task ? "font-medium text-rose-200" : t.promo ? "text-amber-200" : "text-zinc-200"}`}>{t.title}{t.suffix}</span>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/calendar"
                  onClick={() => setPillOpen(false)}
                  className="block border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Open calendar →
                </Link>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className={`rounded-lg px-2 py-1.5 text-zinc-200 hover:bg-zinc-800 ${todayItems === null ? "ml-auto" : ""}`}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
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
