"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "../toast";
import DateRangePicker from "../DateRangePicker";
import { ModuleRedirect } from "../module-gate";
import { rangeLabel } from "@/lib/ttam-scores";

// /shop-live — Shop LIVE minute performance module (Partner API 202510).
// Server lib: src/lib/shop-live.ts. Read-only (no DB writes yet).
// Ads-side columns (Cost/ROI/Active) + avg watch are documented gaps,
// not fetched — see the note card below.
const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? "n/a"
    : `${(Number(v) * 100).toFixed(digits)}%`;

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardCls}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

// Whole MYT hour (0-23) for a millisecond timestamp.
function mytHourOfDay(ms: number): number {
  if (!Number.isFinite(ms)) return NaN;
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", hourCycle: "h23",
  }).format(new Date(ms)));
}
// Report-day buckets come back as "YYYY-MM-DD HH:mm:ss" — the 00:00:00 is the
// bucket midnight, not a time. Strip to the date.
function dayOnly(v: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ""));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(v ?? "?");
}
function parseRoomMs(v: unknown): number {
  // Shop LIVE list rows carry start/end either as unix seconds (doc) or as
  // "YYYY-MM-DD HH:mm:ss" shop-time strings. Parse both; bare date-times are
  // shop (MYT) wall-clock, so pin +08:00 instead of trusting server locale.
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v < 1e12 ? v * 1000 : v;
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? "0")) - 8 * 3600_000;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}

export default function ShopLivePage() {
  const mytToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const daysAgo = (n: number) => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
  };
  // Range is inclusive on both ends (calendar-picker skill). The sessions
  // list API takes an exclusive end, so callers add +1 day (addDays below).
  const addDays = (iso: string, n: number) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
  };
  const [liveId, setLiveId] = useState("");
  const [currency, setCurrency] = useState("LOCAL");
  const [sessStart, setSessStart] = useState(() => daysAgo(14));
  const [sessEnd, setSessEnd] = useState(() => mytToday());
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [sessType, setSessType] = useState("MARKETING_ACCOUNTS");
  const [sessions, setSessions] = useState<any[]>([]);
  const [latestAvail, setLatestAvail] = useState<string | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsMsg, setRoomsMsg] = useState("");
  const [nextPageToken, setNextPageToken] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [roomFilter, setRoomFilter] = useState("");
  const [data, setData] = useState<any>(null);
  const [probe, setProbe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [grants, setGrants] = useState<string[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomMsg, setRoomMsg] = useState("");
  const [ads, setAds] = useState<any>(null);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsMsg, setAdsMsg] = useState("");
  const [ttamOptions, setTtamOptions] = useState<any[]>([]);
  const [ttamMsg, setTtamMsg] = useState("");
  const [ttamLoading, setTtamLoading] = useState(false);
  const [ttamChecked, setTtamChecked] = useState<Set<string>>(new Set());
  const [ttamQ, setTtamQ] = useState("");
  const [ttamUntickedOpen, setTtamUntickedOpen] = useState(false);
  const [blend, setBlend] = useState<any>(null);
  const [blendLoading, setBlendLoading] = useState(false);
  const [blendMsg, setBlendMsg] = useState("");
  const [hrDate, setHrDate] = useState("");
  const [hrFrom, setHrFrom] = useState("9");
  const [hrTo, setHrTo] = useState("11");
  const [hrData, setHrData] = useState<any>(null);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrMsg, setHrMsg] = useState("");
  const [feePct, setFeePct] = useState("25");
  const [tab, setTab] = useState<"shop" | "ads" | "hours">("shop");
  const [showPasteId, setShowPasteId] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [showListGrain, setShowListGrain] = useState(false);
  const [showZeroHourTtam, setShowZeroHourTtam] = useState(false);

  useEffect(() => {
    fetch("/api/shop-live/creator-grants", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const body = await r.json();
        if (Array.isArray(body.users)) setGrants(body.users);
      })
      .catch(() => {});
  }, []);

  async function loadRooms() {
    setRoomsLoading(true);
    setRoomsMsg("");
    setSessions([]);
    setAds(null);
    setAdsMsg("");
    setTtamOptions([]);
    setTtamMsg("");
    setTtamChecked(new Set());
    setTtamUntickedOpen(false);
    setBlend(null);
    setBlendMsg("");
    setNextPageToken("");
    setTotalCount(0);
    try {
      const r = await fetch(
        `/api/shop-live/sessions?shopNumber=1&startDateGe=${sessStart}&endDateLt=${addDays(sessEnd, 1)}&accountType=${encodeURIComponent(sessType)}&currency=${currency}&pages=1`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setSessions(body.sessions ?? []);
      setNextPageToken(body.nextPageToken ?? "");
      setTotalCount(Number(body.totalCount ?? (body.sessions ?? []).length) || 0);
      setLatestAvail(body.latestAvailableDate ?? null);
      const n = (body.sessions ?? []).length;
      const total = Number(body.totalCount ?? n) || n;
      setRoomsMsg(n === 0 ? "No rooms in this range." : `${n} room(s)${total > n ? ` of ${total}` : ""}${body.nextPageToken ? " · more available — Load more" : ""}.`);
      if (n === 1 && body.sessions[0]?.id) setLiveId(String(body.sessions[0].id));
    } catch (e) {
      const m = e instanceof Error ? e.message : "rooms failed";
      setRoomsMsg(m);
      toast(m, "err");
    } finally {
      setRoomsLoading(false);
    }
  }

  async function loadMoreRooms() {
    if (!nextPageToken || roomsLoading || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(
        `/api/shop-live/sessions?shopNumber=1&startDateGe=${sessStart}&endDateLt=${addDays(sessEnd, 1)}&accountType=${encodeURIComponent(sessType)}&currency=${currency}&pages=1&pageToken=${encodeURIComponent(nextPageToken)}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      const seen = new Set(sessions.map((s: any) => String(s.id)));
      const merged = [...sessions];
      for (const s of body.sessions ?? []) {
        if (!seen.has(String((s as any).id))) { merged.push(s); seen.add(String((s as any).id)); }
      }
      setSessions(merged);
      setNextPageToken(body.nextPageToken ?? "");
      const total = Number(body.totalCount ?? totalCount ?? merged.length) || merged.length;
      setTotalCount(total);
      if (body.latestAvailableDate) setLatestAvail(body.latestAvailableDate);
      setRoomsMsg(`${merged.length} room(s)${total > merged.length ? ` of ${total}` : ""}${body.nextPageToken ? " · more available — Load more" : ""}.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "load more failed", "err");
    } finally {
      setLoadingMore(false);
    }
  }

  function copyLiveId() {
    const v = liveId.trim();
    if (!v) { toast("No Live ID to copy.", "err"); return; }
    navigator.clipboard?.writeText(v).then(
      () => toast("Live ID copied."),
      () => toast("Copy blocked — select it manually.", "err")
    );
  }

  async function runProbe() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (sessions.some((s: any) => String(s.id) === liveId.trim() && s.author_type === "AFFILIATE")) {
      toast("AFFILIATE room: TikTok denies minute detail (28001022) — metadata only.", "err");
      return;
    }
    setProbing(true);
    setProbe(null);
    try {
      const r = await fetch(
        `/api/shop-live/probe?shopNumber=1&liveId=${encodeURIComponent(liveId.trim())}&currency=${currency}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setProbe(body);
      toast("Probe ok — first page shape captured.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "probe failed";
      toast(m, "err");
    } finally {
      setProbing(false);
    }
  }

  async function runFetch() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (sessions.some((s: any) => String(s.id) === liveId.trim() && s.author_type === "AFFILIATE")) {
      toast("AFFILIATE room: use Room detail below (creator grant) — minute detail denied 28001022.", "err");
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const r = await fetch(
        `/api/shop-live/overview?shopNumber=1&liveId=${encodeURIComponent(liveId.trim())}&currency=${currency}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setData(body);
      toast(`Fetched ${body.intervals} minute intervals (${body.pages} page(s)).`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "fetch failed";
      toast(m, "err");
    } finally {
      setLoading(false);
    }
  }

  async function runAdsCost() {
    const target = sessions.find((s: any) => String(s.id) === liveId.trim());
    if (!target) { toast("Load rooms and pick a session first.", "err"); return; }
    const startMs = parseRoomMs((target as any)?.start_time);
    const endMs = parseRoomMs((target as any)?.end_time);
    if (!Number.isFinite(startMs) || startMs <= 0) {
      toast("Selected session has no usable start_time.", "err");
      return;
    }
    const startSec = Math.floor(startMs / 1000);
    const endSec = Number.isFinite(endMs) && endMs > 0 ? Math.floor(endMs / 1000) : 0;
    setAdsLoading(true);
    setAds(null);
    setAdsMsg("");
    setTtamOptions([]);
    setTtamMsg("");
    setTtamChecked(new Set());
    setBlend(null);
    setBlendMsg("");
    try {
      let qs = `/api/shop-live/ads?shopNumber=1&roomId=${encodeURIComponent(String((target as any).id))}&startSec=${startSec}`;
      if (Number.isFinite(endSec) && endSec > 0) qs += `&endSec=${endSec}`;
      const r = await fetch(qs, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setAds(body);
      setHrDate(body.startDate ?? "");
      const h0 = mytHourOfDay(startMs);
      if (Number.isFinite(h0)) {
        setHrFrom(String(h0));
        setHrTo(String(Math.min(h0 + 2, 24)));
      }
      setHrData(null);
      setHrMsg("");
      const warn = (body.errors ?? []).length > 0 ? ` · ${body.errors.length} campaign pull(s) failed` : "";
      const skip = Number(body.skippedCampaigns ?? 0) > 0 ? ` · skipped ${body.skippedCampaigns} campaign(s)` : "";
      setAdsMsg(
        body.matched
          ? `${body.startDate}..${body.endDate} · checked ${body.checkedCampaigns} campaign(s)${skip}${warn}.`
          : `No GMV Max cost matched room ${body.roomId} in ${body.startDate}..${body.endDate} · checked ${body.checkedCampaigns} campaign(s)${skip}${warn}.`
      );
      toast(body.matched ? "Ads cost matched." : "No ads cost matched.");
      return body;
    } catch (e) {
      const m = e instanceof Error ? e.message : "ads join failed";
      setAdsMsg(m);
      toast(m, "err");
      return null;
    } finally {
      setAdsLoading(false);
    }
  }

  const selRoom = sessions.find((s: any) => String(s.id) === liveId.trim());
  const selCreator = selRoom?.creator_user ?? "";
  const selGranted = selCreator && grants.includes(String(selCreator).replace(/^@/, "").toLowerCase());
  const selSales: any = (selRoom as any)?.sales ?? (selRoom as any)?.sales_performance ?? null;

  // Picker helpers: unix-sec start_time (doc) or shop wall-clock → MYT label, duration, GMV.
  const fmtStartMYT = (v: any) => {
    const ms = parseRoomMs(v);
    if (Number.isFinite(ms)) {
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date(ms));
    }
    return "?";
  };
  const roomStartMs = (r: any) => {
    const ms = parseRoomMs(r?.start_time);
    return Number.isFinite(ms) ? ms : 0;
  };
  const fmtDur = (r: any) => {
    const a = parseRoomMs(r?.start_time);
    const b = parseRoomMs(r?.end_time);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      const m = Math.round((b - a) / 60000);
      const h = Math.floor(m / 60);
      return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
    }
    return "";
  };
  const isLiveNow = (r: any) => {
    const ms = parseRoomMs(r?.end_time);
    if (!Number.isFinite(ms)) return true;
    return ms > Date.now();
  };
  const roomGmv = (r: any) => Number(r?.sales?.live_gmv?.amount ?? r?.sales_performance?.live_gmv?.amount ?? 0) || 0;
  const grantTag = (r: any) =>
    r?.author_type === "AFFILIATE"
      ? (grants.includes(String(r?.creator_user ?? "").replace(/^@/, "").toLowerCase()) ? " · creator ✓" : " · metadata only")
      : "";
  const roomLabel = (r: any) =>
    `${fmtStartMYT(r?.start_time)} · ${String(r?.id ?? "")} · ${(r?.title ?? "(untitled)").toString().slice(0, 40)} · GMV ${roomGmv(r).toLocaleString()}${fmtDur(r) ? ` · ${fmtDur(r)}` : ""} · ${isLiveNow(r) ? "LIVE NOW" : "ended"}${grantTag(r)}`;

  const filterQ = roomFilter.trim().toLowerCase();
  const filteredSessions = filterQ
    ? sessions.filter((r: any) =>
        String(r?.id ?? "").toLowerCase().includes(filterQ) ||
        String(r?.title ?? "").toLowerCase().includes(filterQ) ||
        String(r?.creator_nick ?? "").toLowerCase().includes(filterQ) ||
        String(r?.creator_user ?? "").toLowerCase().includes(filterQ))
    : sessions;
  const groupedSessions = (() => {
    const map = new Map<string, { name: string; rooms: any[]; gmv: number; latest: number }>();
    for (const r of filteredSessions) {
      const name = String((r as any)?.creator_nick ?? (r as any)?.creator_user ?? "Unknown");
      const g = map.get(name) ?? { name, rooms: [], gmv: 0, latest: 0 };
      g.rooms.push(r);
      g.gmv += roomGmv(r);
      g.latest = Math.max(g.latest, roomStartMs(r));
      map.set(name, g);
    }
    const groups = [...map.values()];
    for (const g of groups) g.rooms.sort((a, b) => roomStartMs(b) - roomStartMs(a));
    groups.sort((a, b) => b.latest - a.latest);
    return groups;
  })();

  // Strict TTAM link rules (same as /live-roi): exact identity_id equality
  // or exact normalized @handle equality. No substrings, prefixes, or
  // shared-word guessing. Anything else stays unticked for manual confirm.
  function ttamHandles(...parts: unknown[]): string[] {
    const out: string[] = [];
    for (const p of parts) {
      const m = String(p ?? "").match(/@([A-Za-z0-9._]+)/g);
      if (!m) continue;
      for (const h of m) {
        const n = h.slice(1).toLowerCase().replace(/[._]/g, "");
        if (n.length >= 4) out.push(n);
      }
    }
    return [...new Set(out)];
  }
  function ttamSuggestedReason(g: any): string | null {
    const gid = String(g?.identity_id ?? "").trim();
    if (gid) {
      for (const c of (ads?.campaigns ?? [])) {
        if (String(c?.identityId ?? "") === gid) return "identity";
      }
    }
    const sh = ttamHandles(
      (selRoom as any)?.creator_user, (selRoom as any)?.creator_nick, (selRoom as any)?.title,
      ...((ads?.campaigns ?? []).flatMap((c: any) => [c?.campaignName, c?.account]))
    );
    const gh = ttamHandles(g?.name, g?.campaign_name, g?.identity_hint);
    for (const a of sh) {
      for (const b of gh) {
        if (a === b) return `handle @${b}`;
      }
    }
    return null;
  }
  const ttamFiltered = (() => {
    const q = ttamQ.trim().toLowerCase();
    return q
      ? ttamOptions.filter((g: any) =>
          `${g?.name ?? ""} ${g?.campaign_name ?? ""} ${g?.adgroup_id ?? ""} ${g?.identity_id ?? ""} ${g?.identity_hint ?? ""}`.toLowerCase().includes(q))
      : ttamOptions;
  })();
  const bySpendDesc = (a: any, b: any) => Number(b?.spend ?? 0) - Number(a?.spend ?? 0);
  const ttamTickedRows = ttamFiltered.filter((g: any) => ttamChecked.has(String(g?.adgroup_id))).sort(bySpendDesc);
  const ttamUntickedRows = ttamFiltered.filter((g: any) => !ttamChecked.has(String(g?.adgroup_id))).sort(bySpendDesc);
  function groupTtamCampaigns(rows: any[]) {
    const map = new Map<string, { campaign: string; rows: any[]; spend: number }>();
    for (const r of rows) {
      const key = String((r as any)?.campaign_name ?? "").trim() || "Unnamed campaign";
      const g = map.get(key) ?? { campaign: key, rows: [], spend: 0 };
      g.rows.push(r);
      g.spend += Number((r as any)?.spend ?? 0) || 0;
      map.set(key, g);
    }
    const groups = [...map.values()];
    for (const g of groups) g.rows.sort(bySpendDesc);
    groups.sort((a, b) => b.spend - a.spend);
    return groups;
  }
  const ttamTickedGroups = groupTtamCampaigns(ttamTickedRows);
  const ttamUntickedGroups = groupTtamCampaigns(ttamUntickedRows);
  const ttamUntickedSpend = ttamUntickedRows.reduce((s: number, g: any) => s + (Number(g?.spend ?? 0) || 0), 0);
  const showUnticked = ttamUntickedOpen || ttamQ.trim() !== "";
  function toggleTtamGroup(ids: string[], tick: boolean) {
    setTtamChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (tick) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }
  function renderTtamRow(g: any) {
    const id = String(g.adgroup_id);
    const reason = ttamSuggestedReason(g);
    return (
      <tr key={id} className="border-t border-zinc-800">
        <td className="px-2 py-1">
          <input type="checkbox" checked={ttamChecked.has(id)}
            onChange={() => setTtamChecked((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })} />
        </td>
        <td className="max-w-64 truncate px-2 py-1" title={g.name}>{g.name}</td>
        <td className="px-2 py-1 text-right tabular-nums">{fmt(Number(g.spend ?? 0))}</td>
        <td className="px-2 py-1">{reason ?? <span className="text-zinc-600">manual only</span>}</td>
        <td className="px-2 py-1">{g.status ?? "?"}</td>
      </tr>
    );
  }
  const ttamSuggTotal = ttamOptions.filter((g: any) => ttamSuggestedReason(g) !== null).length;
  const ttamSelSpend = ttamOptions
    .filter((g: any) => ttamChecked.has(String(g?.adgroup_id)))
    .reduce((s: number, g: any) => s + Number(g?.spend ?? 0), 0);

  async function loadTtamOptions(adsBody?: any) {
    const a = adsBody ?? ads;
    if (!a) { toast("Fetch ads cost first — it sets the room window.", "err"); return; }
    setTtamLoading(true);
    setTtamMsg("");
    setTtamOptions([]);
    setTtamChecked(new Set());
    setTtamUntickedOpen(false);
    setBlend(null);
    setBlendMsg("");
    setHrData(null);
    setHrMsg("");
    try {
      const r = await fetch(
        `/api/shop-live/ttam-options?shopNumber=1&startDate=${a.startDate}&endDate=${a.endDate}`,
        { cache: "no-store" }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      const list = body.adgroups ?? [];
      setTtamOptions(list);
      const pre = new Set<string>();
      for (const g of list) {
        // Auto-tick only rows with real spend — RM 0.00 rows stay available
        // in the unticked list for manual picks.
        if (ttamSuggestedReason(g) !== null && Number(g?.spend ?? 0) > 0) pre.add(String(g.adgroup_id));
      }
      setTtamChecked(pre);
      setTtamMsg(
        `${list.length} TTAM adgroups · ${pre.size} suggested` +
          (body.skipped ? ` · ${body.skipped} zero-spend skipped` : "") +
          (body.errors?.length ? ` · ${body.errors.length} errs` : "")
      );
    } catch (e) {
      setTtamMsg(e instanceof Error ? e.message : "ttam options failed");
    } finally {
      setTtamLoading(false);
    }
  }

  async function loadAdsAndTtam() {
    if (!selRoom) { toast("Load rooms and pick a session first.", "err"); return; }
    const a = await runAdsCost();
    if (a) await loadTtamOptions(a);
  }

  async function runBlend() {
    if (!ads || !selRoom) { toast("Fetch ads cost first.", "err"); return; }
    if (ttamChecked.size === 0) { toast("Tick at least one TTAM adgroup.", "err"); return; }
    const fee = Number(feePct);
    if (!Number.isFinite(fee) || fee < 0 || fee > 90) {
      toast("fee must be 0–90%", "err");
      return;
    }
    const startMs = parseRoomMs((selRoom as any)?.start_time);
    const endMs = parseRoomMs((selRoom as any)?.end_time);
    if (!Number.isFinite(startMs) || startMs <= 0) { toast("Selected session has no usable start_time.", "err"); return; }
    setBlendLoading(true);
    setBlend(null);
    setBlendMsg("");
    try {
      let qs = `/api/shop-live/blended?shopNumber=1&roomId=${encodeURIComponent(String((selRoom as any).id))}&startSec=${Math.floor(startMs / 1000)}`;
      if (Number.isFinite(endMs) && endMs > 0) qs += `&endSec=${Math.floor(endMs / 1000)}`;
      qs += `&adgroupIds=${encodeURIComponent([...ttamChecked].join(","))}&feeRate=${encodeURIComponent(String(fee))}`;
      const r = await fetch(qs, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setBlend(body);
      const errs = (body.errors ?? []).length > 0 ? ` · ${(body.errors ?? []).length} TTAM pull(s) failed` : "";
      setBlendMsg(
        body.ads?.matched
          ? `blended over ${body.ads.startDate}..${body.ads.endDate}${errs}.`
          : `TTAM spend-only — no GMV Max room match, blended ROI suppressed${errs}.`
      );
      toast(body.ads?.matched ? "Blended." : "TTAM spend listed (no blend).");
    } catch (e) {
      const m = e instanceof Error ? e.message : "blend failed";
      setBlendMsg(m);
      toast(m, "err");
    } finally {
      setBlendLoading(false);
    }
  }

  async function runHourBlend() {
    if (!ads || !selRoom) { toast("Fetch ads cost first.", "err"); return; }
    const fee = Number(feePct);
    if (!Number.isFinite(fee) || fee < 0 || fee > 90) {
      toast("fee must be 0–90%", "err");
      return;
    }
    const from = parseInt(hrFrom, 10);
    const to = parseInt(hrTo, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hrDate) || !Number.isInteger(from) || !Number.isInteger(to)) {
      toast("Pick a date and whole hours (e.g. 9 to 11).", "err");
      return;
    }
    setHrLoading(true);
    setHrData(null);
    setHrMsg("");
    try {
      const cids = ((ads.campaigns ?? []) as any[]).map((c: any) => String(c?.campaignId ?? "")).filter(Boolean);
      let qs = `/api/shop-live/hourly-blend?shopNumber=1&roomId=${encodeURIComponent(String((selRoom as any).id))}&date=${hrDate}&fromHour=${from}&toHour=${to}`;
      qs += `&campaignIds=${encodeURIComponent(cids.join(","))}&adgroupIds=${encodeURIComponent([...ttamChecked].join(","))}&feeRate=${encodeURIComponent(String(fee))}`;
      const r = await fetch(qs, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setHrData(body);
      const errs = (body.errors ?? []).length > 0 ? ` · ${(body.errors ?? []).length} pull(s) failed` : "";
      setHrMsg(`hour range ${body.date} ${String(body.fromHour).padStart(2, "0")}:00–${String(body.toHour).padStart(2, "0")}:00${errs}.`);
      toast("Hour range fetched.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "hour blend failed";
      setHrMsg(m);
      toast(m, "err");
    } finally {
      setHrLoading(false);
    }
  }

  async function runRoomDetail() {
    if (!liveId.trim()) { toast("Enter a liveId first.", "err"); return; }
    if (!selRoom) { toast("Load rooms first (or paste a liveId from the AFFILIATE list).", "err"); return; }
    const creator = String(selRoom.creator_user ?? "").trim();
    if (!creator) { toast("Room has no creator user — cannot match a grant.", "err"); return; }
    setRoomLoading(true);
    setRoom(null);
    setRoomMsg("");
    try {
      const r = await fetch(
        `/api/shop-live/room-detail?shopNumber=1&roomId=${encodeURIComponent(liveId.trim())}&creatorUser=${encodeURIComponent(creator)}`
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setRoom(body);
      const n = (body.errors ?? []).length;
      setRoomMsg(n > 0 ? `${4 - n}/4 blocks ok (${(body.errors ?? []).map((e: any) => e.endpoint).join(", ")} failed).` : "4/4 blocks ok.");
      toast("Room detail fetched.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "room detail failed";
      setRoomMsg(m);
      toast(m, "err");
    } finally {
      setRoomLoading(false);
    }
  }

  const s = data?.summary;
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ModuleRedirect module="shop-live" />
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Shop Live Performance</h2>
        <p className="text-xs text-zinc-500">
          Minute-grain LIVE dashboard data (Partner API 202510). Pick a room
          below or paste a liveId. Read-only — no cache writes yet. Data lags
          ~2 days (watch latest-available date).
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="text-xs text-zinc-400">Range<br />
            <button ref={rangeBtnRef} onClick={() => {
              if (!calOpen && rangeBtnRef.current) {
                const r = rangeBtnRef.current.getBoundingClientRect();
                setCalPos({ top: r.bottom + 8, left: r.left });
              }
              setCalOpen((v) => !v);
            }} className={`${inputCls}`}>{rangeLabel(sessStart, sessEnd)} 📅</button>
          </div>
          <label className="text-xs text-zinc-400">Rooms
            <select value={sessType} onChange={(e) => setSessType(e.target.value)} className={`${inputCls} ml-2`}>
              <option value="MARKETING_ACCOUNTS">MARKETING (detail readable)</option>
              <option value="AFFILIATE_ACCOUNTS">AFFILIATE (metadata only)</option>
            </select>
          </label>
          <button onClick={loadRooms} disabled={roomsLoading}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
            {roomsLoading ? "Loading…" : "Load rooms"}
          </button>
          {sessions.length > 0 && (
            <>
              <label className="text-xs text-zinc-400">Filter
                <input value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}
                  placeholder="id / title / creator" className={`${inputCls} ml-2 w-44`} />
              </label>
              <label className="text-xs text-zinc-400">Room
                <select value={liveId} onChange={(e) => setLiveId(e.target.value)} className={`${inputCls} ml-2 max-w-72`}>
                  <option value="">— pick —</option>
                  {groupedSessions.map((g) => (
                    <optgroup key={g.name} label={`${g.name} — ${g.rooms.length} room(s) · GMV ${g.gmv.toLocaleString()}`}>
                      {g.rooms.map((s: any) => (
                        <option key={s.id} value={s.id} title={roomLabel(s)}>
                          {roomLabel(s)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </>
          )}
          {nextPageToken && (
            <button onClick={loadMoreRooms} disabled={loadingMore}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
              {loadingMore ? "Loading…" : "Load more rooms"}
            </button>
          )}
        </div>
        {(roomsMsg || latestAvail) && (
          <p className="mt-1 text-[11px] text-zinc-500">
            {roomsMsg}{latestAvail ? ` Latest data: ${latestAvail}.` : ""}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <button onClick={() => setShowPasteId((v) => !v)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
            {showPasteId ? "Hide paste" : "Paste ID"}
          </button>
          <button onClick={() => setDebugOpen((v) => !v)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800">
            {debugOpen ? "Hide debug" : "Admin / debug"}
          </button>
        </div>
        {showPasteId && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-400">Live ID
              <input value={liveId} onChange={(e) => setLiveId(e.target.value)}
                placeholder="or paste id directly" className={`${inputCls} ml-2 w-56`} />
            </label>
            <button onClick={copyLiveId} title="Copy the selected Live ID"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">
              Copy
            </button>
          </div>
        )}
        {selRoom && (
          <div className={`${cardCls} mt-2 text-xs`}>
            <span className="text-sm font-medium">{(selRoom.title ?? "(untitled)").toString().slice(0, 60)}</span>
            <span className="ml-2 text-zinc-400">{selRoom.creator_nick ?? selRoom.creator_user ?? ""}{grantTag(selRoom)}</span>
            <span className="ml-2 text-zinc-500">{fmtStartMYT(selRoom.start_time)}{fmtDur(selRoom) ? ` · ${fmtDur(selRoom)}` : ""} · {isLiveNow(selRoom) ? "LIVE NOW" : "ended"}</span>
            <span className="ml-2 font-mono text-zinc-500">{String(selRoom.id)}</span>
            <button onClick={copyLiveId} className="ml-2 rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Copy ID</button>
          </div>
        )}
        {debugOpen && (
          <div className={`${cardCls} mt-2 text-xs`}>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={runProbe} disabled={probing}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">
                {probing ? "Probing…" : "Probe shape"}
              </button>
              <a href="/api/shop-auth/start?app=analytics" title="Admin + seller login; grant lands in Neon"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
                Authorize analytics app
              </a>
            </div>
            {probe && (
              <div className="mt-2">
                <div className="text-zinc-400">Title: {probe.overall?.live_title ?? "—"} · intervals on page: {probe.intervalsOnFirstPage}</div>
                <pre className="mt-2 overflow-x-auto text-[11px] text-zinc-300">{JSON.stringify({ keys: probe.intervalKeys, coverage: probe.coverage }, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
        {selRoom && (
          <div className="mt-3 flex gap-1 border-b border-zinc-800" role="tablist">
            {([["shop", "Shop room"], ["ads", "Ads & blended"], ["hours", "Hour slice"]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" onClick={() => setTab(k)}
                className={`px-4 py-2 text-sm ${tab === k ? "border-b-2 border-emerald-500 font-medium text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {calOpen && (
        <DateRangePicker
          from={sessStart} to={sessEnd} pos={calPos}
          onApply={(f, t) => { setSessStart(f); setSessEnd(t); setCalOpen(false); }}
          onClose={() => setCalOpen(false)}
        />
      )}

      <div className="px-4 pb-16 pt-4">
        {tab === "shop" && (
          selRoom ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-zinc-400">Currency
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} ml-2`}>
                  <option value="LOCAL">LOCAL (MYR)</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              {selRoom.author_type === "AFFILIATE" ? (
                <button onClick={runRoomDetail} disabled={roomLoading}
                  title="AFFILIATE room detail via the labeled creator grant (Live Data v202502)"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50">
                  {roomLoading ? "Fetching…" : "Fetch room detail"}
                </button>
              ) : (
                <button onClick={runFetch} disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
                  {loading ? "Fetching…" : "Fetch overview"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Pick a room above to load its data.</p>
          )
        )}

        {tab === "ads" && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button onClick={loadAdsAndTtam} disabled={adsLoading || ttamLoading || !selRoom}
              title="Fetch GMV Max room cost, then list TTAM feeder adgroups"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-50">
              {(adsLoading || ttamLoading) ? "Loading…" : "Load ads + TTAM"}
            </button>
            <label className="text-xs text-zinc-400">Fee %
              <input value={feePct} onChange={(e) => setFeePct(e.target.value)} inputMode="decimal"
                className={`${inputCls} ml-2 w-16 text-right tabular-nums`} />
            </label>
            <button onClick={runBlend} disabled={blendLoading || !ads || ttamChecked.size === 0}
              title="Blend GMV Max room cost with ticked TTAM adgroup spend"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
              {blendLoading ? "Blending…" : "Blend selected"}
            </button>
          </div>
        )}

        {tab === "hours" && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-400">Hour date
              <input value={hrDate} onChange={(e) => setHrDate(e.target.value)} placeholder="YYYY-MM-DD"
                className={`${inputCls} ml-2 w-32 tabular-nums`} />
            </label>
            <label className="text-xs text-zinc-400">Hours
              <input value={hrFrom} onChange={(e) => setHrFrom(e.target.value)} inputMode="numeric"
                className={`${inputCls} ml-2 w-14 text-right tabular-nums`} />
              <span className="mx-1">–</span>
              <input value={hrTo} onChange={(e) => setHrTo(e.target.value)} inputMode="numeric"
                className={`${inputCls} w-14 text-right tabular-nums`} />
            </label>
            <button onClick={runHourBlend} disabled={hrLoading || !ads}
              title="Blend room cost + ticked TTAM spend and impressions for the picked hour range"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500 disabled:opacity-50">
              {hrLoading ? "Fetching…" : "Fetch hour range"}
            </button>
            <span className="text-[11px] text-zinc-500">Using {ttamChecked.size} ticked TTAM adgroup(s) — edit in Ads tab.</span>
          </div>
        )}

        {tab === "ads" && adsMsg && (
          <p className="mb-2 text-[11px] text-zinc-500">{adsMsg}</p>
        )}
        {tab === "ads" && ads && (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>Ads cost — room {ads.roomId}</span>
              {ads.isLiveNow && (
                <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] text-amber-200">Partial · live now</span>
              )}
              {ads.matched && (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">Active during room</span>
              )}
              {!ads.matched && (
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-200">No attributed spend</span>
              )}
            </div>
            {(ads.errors ?? []).length > 0 && (
              <div className={`${cardCls} mb-3 text-xs text-amber-300`}>
                Partial join: {(ads.errors ?? []).join(" · ")}
              </div>
            )}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi label="Ads cost" value={fmt(Number(ads.cost ?? 0))} sub={`${ads.startDate}..${ads.endDate}`} />
              <Kpi label="Attributed GMV" value={fmt(Number(ads.gmv ?? 0))} sub="gross, TikTok report grain" />
              <Kpi label="Gross ROI" value={`${Number(ads.grossRoi ?? 0).toFixed(2)}x`} sub="GMV ÷ cost" />
              <Kpi label="Net ROI" value={`${Number(ads.netRoi ?? 0).toFixed(2)}x`} sub="GMV × 0.75 ÷ cost" />
              <Kpi label="Attributed orders" value={String(ads.orders ?? 0)} sub={`${(ads.campaigns ?? []).length} campaign(s)`} />
              <Kpi label="Coverage" value={`${ads.checkedCampaigns ?? 0} checked`} sub={`${ads.skippedCampaigns ?? 0} skipped`} />
            </div>
            {(ads.campaigns ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Campaigns with room-window spend</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Campaign</th>
                      <th className="px-2 py-2 font-medium">Account</th>
                      <th className="px-2 py-2 font-medium">Status now</th>
                      <th className="px-2 py-2 text-right font-medium">Cost</th>
                      <th className="px-2 py-2 text-right font-medium">GMV</th>
                      <th className="px-2 py-2 text-right font-medium">Gross</th>
                      <th className="px-2 py-2 text-right font-medium">Net</th>
                      <th className="px-2 py-2 text-right font-medium">Days</th>
                    </tr></thead>
                    <tbody>
                      {(ads.campaigns ?? []).map((c: any) => (
                        <tr key={c.campaignId} className="border-t border-zinc-800">
                          <td className="max-w-72 truncate px-2 py-2" title={c.campaignName}>{c.campaignName}</td>
                          <td className="px-2 py-2">{c.account}</td>
                          <td className="px-2 py-2">{c.statusNow ?? "?"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(c.cost ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(c.gmv ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{`${Number(c.grossRoi ?? 0).toFixed(2)}x`}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{`${Number(c.netRoi ?? 0).toFixed(2)}x`}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{c.firstDay && c.lastDay ? (c.firstDay === c.lastDay ? dayOnly(c.firstDay) : `${dayOnly(c.firstDay)}..${dayOnly(c.lastDay)}`) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={`${cardCls} mb-4 text-xs text-zinc-400`}>
              {ads.method}. Active during room means report activity was attributed to this room in that window; Status now is the cached current toggle, not history. No match can mean no attributed spend or a Shop/Marketing room-ID mismatch.
            </div>
          </>
        )}

        {tab === "ads" && (ttamMsg || ttamOptions.length > 0) && (
          <div className={`${cardCls} mb-4 text-xs`}>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>TTAM feeder — {ads?.startDate}..{ads?.endDate}</span>
              <span className="text-[11px] font-normal text-zinc-500">
                {ttamSuggTotal} suggested · {ttamChecked.size} ticked · RM {fmt(ttamSelSpend)} selected
              </span>
            </div>
            {ttamMsg && <p className="mb-2 text-[11px] text-zinc-500">{ttamMsg}</p>}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input value={ttamQ} onChange={(e) => setTtamQ(e.target.value)}
                placeholder="filter name / campaign / id / identity" className={`${inputCls} w-64`} />
              <span className="text-[11px] text-zinc-500">Suggestions only — no auto mapping. Full window spend counts in full per room.</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-900"><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-2 py-2 font-medium"></th>
                  <th className="px-2 py-2 font-medium">Adgroup</th>
                  <th className="px-2 py-2 text-right font-medium">Spend</th>
                  <th className="px-2 py-2 font-medium">Link</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {ttamTickedGroups.length === 0 && ttamUntickedGroups.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-2 text-zinc-500">No adgroups match the filter.</td></tr>
                  )}
                  {ttamTickedGroups.map((grp) => (
                    <Fragment key={`t-${grp.campaign}`}>
                      <tr key={`t-${grp.campaign}`} className="border-t border-zinc-700 bg-zinc-800/60">
                        <td colSpan={5} className="px-2 py-1">
                          <span className="font-medium">✓ {grp.campaign}</span>
                          <span className="text-zinc-400"> · {grp.rows.length} ticked · RM {fmt(grp.spend)}</span>
                          <button type="button" onClick={() => toggleTtamGroup(grp.rows.map((r: any) => String(r.adgroup_id)), false)}
                            className="ml-2 text-[11px] text-zinc-400 hover:text-zinc-100">clear</button>
                        </td>
                      </tr>
                      {grp.rows.map(renderTtamRow)}
                    </Fragment>
                  ))}
                  {ttamUntickedGroups.length > 0 && (
                    <tr className="border-t border-zinc-700 bg-zinc-800/60">
                      <td colSpan={5} className="px-2 py-1">
                        <button type="button" onClick={() => setTtamUntickedOpen((v) => !v)}
                          className="text-zinc-300 hover:text-white">
                          {showUnticked ? "▾" : "▸"} Unticked ({ttamUntickedRows.length} adgroups · RM {fmt(ttamUntickedSpend)})
                          {ttamQ.trim() === "" ? (showUnticked ? " — hide" : " — show") : ""}
                        </button>
                      </td>
                    </tr>
                  )}
                  {showUnticked && ttamUntickedGroups.map((grp) => (
                    <Fragment key={`u-${grp.campaign}`}>
                      <tr key={`u-${grp.campaign}`} className="border-t border-zinc-800 bg-zinc-800/30">
                        <td colSpan={5} className="px-2 py-1">
                          <span className="font-medium">{grp.campaign}</span>
                          <span className="text-zinc-400"> · {grp.rows.length} adgroups · RM {fmt(grp.spend)}</span>
                          <button type="button" onClick={() => toggleTtamGroup(grp.rows.map((r: any) => String(r.adgroup_id)), true)}
                            className="ml-2 text-[11px] text-zinc-400 hover:text-zinc-100">tick all</button>
                        </td>
                      </tr>
                      {grp.rows.map(renderTtamRow)}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "ads" && blendMsg && (
          <p className="mb-2 text-[11px] text-zinc-500">{blendMsg}</p>
        )}
        {tab === "ads" && blend && (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>Blended — room {blend.ads?.roomId}</span>
              {blend.ads?.isLiveNow && (
                <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] text-amber-200">Partial · live now</span>
              )}
              {blend.ads?.matched ? (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">Blended ROI</span>
              ) : (
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-200">Spend-only · no ROI</span>
              )}
            </div>
            {(blend.errors ?? []).length > 0 && (
              <div className={`${cardCls} mb-3 text-xs text-amber-300`}>
                Partial blend: {(blend.errors ?? []).join(" · ")}
              </div>
            )}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi label="GMV Max cost" value={fmt(Number(blend.ads?.cost ?? 0))} sub={`${(blend.ads?.campaigns ?? []).length} campaign(s)`} />
              <Kpi label="Attributed GMV" value={fmt(Number(blend.ads?.gmv ?? 0))} sub="gross, room grain" />
              <Kpi label="TTAM picked" value={fmt(Number(blend.ttamSpend ?? 0))} sub={`${(blend.ttamPicked ?? []).length} adgroup(s)`} />
              <Kpi label="Total ad cost" value={fmt(Number(blend.totalCost ?? 0))} sub="GMV Max + TTAM" />
              <Kpi label="Blended gross" value={blend.blendedGrossRoi === null ? "n/a" : `${Number(blend.blendedGrossRoi).toFixed(2)}x`} sub="GMV ÷ total" />
              <Kpi label="Blended net" value={blend.blendedNetRoi === null ? "n/a" : `${Number(blend.blendedNetRoi).toFixed(2)}x`} sub={`GMV × ${(1 - Number(blend.feeRate ?? 0.25)).toFixed(2)} ÷ total`} />
            </div>
            {(blend.ttamPicked ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Picked TTAM adgroups (full window spend)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Adgroup</th>
                      <th className="px-2 py-2 font-medium">Campaign</th>
                      <th className="px-2 py-2 text-right font-medium">Spend</th>
                    </tr></thead>
                    <tbody>
                      {(blend.ttamPicked ?? []).map((p: any) => (
                        <tr key={p.adgroup_id} className="border-t border-zinc-800">
                          <td className="max-w-72 truncate px-2 py-2" title={p.name}>{p.name}</td>
                          <td className="max-w-72 truncate px-2 py-2" title={p.campaign_name}>{p.campaign_name}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(p.spend ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={`${cardCls} mb-4 text-xs text-zinc-400`}>
              {blend.note} Fee {feePct}% applies to this blend panel.
            </div>
          </>
        )}

        {tab === "hours" && hrMsg && (
          <p className="mb-2 text-[11px] text-zinc-500">{hrMsg}</p>
        )}
        {tab === "hours" && hrData && (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
              <span>Hour range — room {hrData.roomId} · {hrData.date} {String(hrData.fromHour).padStart(2, "0")}:00–{String(hrData.toHour).padStart(2, "0")}:00</span>
              {hrData.isToday && (
                <span className="rounded-full bg-amber-900 px-2 py-0.5 text-[10px] text-amber-200">Partial · today</span>
              )}
              {hrData.totalCost > 0 && hrData.gmvGmv > 0 ? (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-200">Blended ROI</span>
              ) : (
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-200">No ROI in range</span>
              )}
            </div>
            {(hrData.errors ?? []).length > 0 && (
              <div className={`${cardCls} mb-3 text-xs text-amber-300`}>
                Partial hour join: {(hrData.errors ?? []).join(" · ")}
              </div>
            )}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi label="GMV cost (hrs)" value={fmt(Number(hrData.gmvCost ?? 0))} sub={`${(hrData.gmvCampaigns ?? []).length} campaign(s)`} />
              <Kpi label="GMV in hrs" value={fmt(Number(hrData.gmvGmv ?? 0))} sub={`${hrData.gmvOrders ?? 0} orders`} />
              <Kpi label="TTAM spend (hrs)" value={fmt(Number(hrData.ttamSpend ?? 0))} sub={`${(hrData.ttamPicked ?? []).length} adgroup(s)`} />
              <Kpi label="TTAM impressions" value={Number(hrData.ttamImpressions ?? 0).toLocaleString()} sub="picked adgroups" />
              <Kpi label="Blended gross" value={hrData.blendedGrossRoi === null ? "n/a" : `${Number(hrData.blendedGrossRoi).toFixed(2)}x`} sub={`total ${fmt(Number(hrData.totalCost ?? 0))}`} />
              <Kpi label="Blended net" value={hrData.blendedNetRoi === null ? "n/a" : `${Number(hrData.blendedNetRoi).toFixed(2)}x`} sub={`fee ${feePct}%`} />
            </div>
            {(hrData.hourly ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Hourly buckets (MYT)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Hour</th>
                      <th className="px-2 py-2 text-right font-medium">GMV cost</th>
                      <th className="px-2 py-2 text-right font-medium">GMV</th>
                      <th className="px-2 py-2 text-right font-medium">TTAM spend</th>
                      <th className="px-2 py-2 text-right font-medium">Impressions</th>
                    </tr></thead>
                    <tbody>
                      {(hrData.hourly ?? []).map((h: any) => (
                        <tr key={h.hour} className="border-t border-zinc-800">
                          <td className="px-2 py-2">{h.hour}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(h.gmvCost ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(h.gmvGmv ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(h.ttamSpend ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{Number(h.ttamImpressions ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(hrData.ttamPicked ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span>TTAM in range (spend + impressions)</span>
                  {(hrData.ttamPicked ?? []).some((p: any) => !(Number(p.spend ?? 0) > 0 || Number(p.impressions ?? 0) > 0)) && (
                    <button type="button" onClick={() => setShowZeroHourTtam((v) => !v)}
                      className="text-[11px] font-normal text-zinc-400 hover:text-zinc-100">
                      {showZeroHourTtam ? "Hide 0-activity" : `Show 0-activity (${(hrData.ttamPicked ?? []).filter((p: any) => !(Number(p.spend ?? 0) > 0 || Number(p.impressions ?? 0) > 0)).length})`}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Adgroup</th>
                      <th className="px-2 py-2 font-medium">Campaign</th>
                      <th className="px-2 py-2 text-right font-medium">Spend</th>
                      <th className="px-2 py-2 text-right font-medium">Impressions</th>
                    </tr></thead>
                    <tbody>
                      {(showZeroHourTtam ? (hrData.ttamPicked ?? []) : (hrData.ttamPicked ?? []).filter((p: any) => Number(p.spend ?? 0) > 0 || Number(p.impressions ?? 0) > 0)).map((p: any) => (
                        <tr key={p.adgroup_id} className="border-t border-zinc-800">
                          <td className="max-w-72 truncate px-2 py-2" title={p.name}>{p.name}</td>
                          <td className="max-w-72 truncate px-2 py-2" title={p.campaign_name}>{p.campaign_name}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(p.spend ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{Number(p.impressions ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className={`${cardCls} mb-4 text-xs text-zinc-400`}>
              {hrData.method}. Hours are [{hrData.fromHour}, {hrData.toHour}) MYT. Hours with no rows are omitted. TTAM spend counts the picked adgroups' full spend in each hour; a feeder shared by several rooms counts in full on every room.
            </div>
          </>
        )}

        {tab === "shop" && roomMsg && (
          <p className="mb-2 text-[11px] text-zinc-500">{roomMsg}</p>
        )}
        {tab === "shop" && room && (
          <>
            <div className="mb-1 text-sm font-medium">
              Room detail — {room.creator} · {room.liveRoomId}
            </div>
            {(room.errors ?? []).length > 0 && (
              <div className={`${cardCls} mb-3 text-xs text-amber-300`}>
                Partial: {(room.errors ?? []).map((e: any) => `${e.endpoint}: ${e.code}`).join(" · ")}
              </div>
            )}
            {room.core && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="GMV" value={`${room.core.local_gmv?.currency ?? ""} ${fmt(Number(room.core.local_gmv?.amount ?? 0))}`} sub={`${room.core.sales ?? 0} items sold`} />
                <Kpi label="Paid orders" value={String(room.core.paid_order_count ?? 0)} sub={`${room.core.buyer_count ?? 0} buyers · AOV ${fmt(Number(room.core.local_unit_price?.amount ?? 0))}`} />
                <Kpi label="Watch PV" value={Number(room.core.watch_pv ?? 0).toLocaleString()} sub={`${Number(room.core.product_view_count ?? 0).toLocaleString()} product views`} />
                <Kpi label="CTR" value={pct(Number(room.core.click_through_rate))} sub={`CTOR ${pct(Number(room.core.click_order_rate))}`} />
                <Kpi label="Avg watch" value={`${room.core.avg_watching_duration ?? 0}s`} sub={`peak ${Number(room.core.peak_concurrent_user_count ?? 0).toLocaleString()} concurrent`} />
                <Kpi label="Engagement" value={Number(room.core.accumulated_comment_count ?? 0).toLocaleString()} sub={`${Number(room.core.accumulated_new_follower_count ?? 0).toLocaleString()} new followers · ${Number(room.core.accumulated_sharing_count ?? 0).toLocaleString()} shares`} />
              </div>
            )}
            {selRoom?.traffic && (
              <button type="button" onClick={() => setShowListGrain((v) => !v)}
                className="mb-2 text-[11px] text-zinc-400 hover:text-zinc-200">
                {showListGrain ? "Hide list grain ▾" : "Compare list grain ▸"}
              </button>
            )}
            {showListGrain && selRoom?.traffic && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="Impressions (list)" value={selRoom.traffic.impressions == null ? "n/a" : Number(selRoom.traffic.impressions).toLocaleString()} sub="session grain — absent on affiliate rows" />
                <Kpi label="Views (list)" value={selRoom.traffic.views == null ? "n/a" : Number(selRoom.traffic.views).toLocaleString()} sub={`${selRoom.traffic.viewers == null ? "?" : Number(selRoom.traffic.viewers).toLocaleString()} unique · dashboard Views`} />
                <Kpi label="Product clicks (list)" value={selRoom.traffic.product_clicks == null ? "n/a" : Number(selRoom.traffic.product_clicks).toLocaleString()} sub="dashboard Product clicks" />
                <Kpi label="Tap-through (list)" value={pct(selRoom.traffic.tap_through_rate == null ? null : Number(selRoom.traffic.tap_through_rate))} sub={`CTR ${pct(selRoom.traffic.ctr == null ? null : Number(selRoom.traffic.ctr))} · CTOR ${pct(selRoom.traffic.ctor_sku_order == null ? null : Number(selRoom.traffic.ctor_sku_order))} · exact fields, not derived`} />
                <Kpi label="Avg viewing (list)" value={`${selRoom.traffic.avg_viewing_duration ?? "n/a"}${selRoom.traffic.avg_viewing_duration == null ? "" : "s"}`} sub={`GMV/h ${(selRoom.traffic.gmv_per_hour?.amount ?? "—")} ${selRoom.traffic.gmv_per_hour?.currency ?? ""}`} />
                <Kpi label="Live GMV (list)" value={`${selSales?.live_gmv?.currency ?? ""} ${fmt(Number(selSales?.live_gmv?.amount ?? 0))}`} sub={`indirect ${fmt(Number(selSales?.live_indirect_gmv?.amount ?? 0))} · attributed ${fmt(Number(selSales?.live_attributed_gmv?.amount ?? 0))}${isLiveNow(selRoom) ? " · live now — list lags, trust room grain" : ""}`} />
              </div>
            )}
            {(room.traffic ?? []).length > 0 && (() => {
              const totalPV = (room.traffic ?? []).reduce((a: number, t: any) => a + Number(t.source?.watch_pv ?? 0), 0);
              const share = (v: number) => totalPV > 0 ? `${(v / totalPV * 100).toFixed(1)}%` : "—";
              return (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Traffic sources (watch PV + share)</div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-medium">Channel</th>
                    <th className="px-2 py-2 text-right font-medium">Watch PV</th>
                    <th className="px-2 py-2 text-right font-medium">Share</th>
                    <th className="px-2 py-2 font-medium">Breakdown</th>
                  </tr></thead>
                  <tbody>
                    {(room.traffic ?? []).map((t: any, i: number) => (
                      <tr key={i} className="border-t border-zinc-800 first:border-t-0">
                        <td className="px-2 py-1">{t.source?.name ?? "?"}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{Number(t.source?.watch_pv ?? 0).toLocaleString()}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{share(Number(t.source?.watch_pv ?? 0))}</td>
                        <td className="px-2 py-1 text-zinc-500">{(t.sub_sources ?? []).map((x: any) => `${x.name} ${Number(x.watch_pv ?? 0).toLocaleString()}`).join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
            {(room.products ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">Products ({(room.products ?? []).length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="px-2 py-2 font-medium">Product</th>
                      <th className="px-2 py-2 text-right font-medium">GMV</th>
                      <th className="px-2 py-2 text-right font-medium">Paid</th>
                      <th className="px-2 py-2 text-right font-medium">CTR</th>
                      <th className="px-2 py-2 text-right font-medium">CTOR</th>
                      <th className="px-2 py-2 text-right font-medium">Exposure</th>
                      <th className="px-2 py-2 text-right font-medium">Stock</th>
                    </tr></thead>
                    <tbody>
                      {[...(room.products ?? [])].sort((a: any, b: any) => Number(b.local_gmv?.amount ?? 0) - Number(a.local_gmv?.amount ?? 0)).map((p: any) => (
                        <tr key={p.product_id} className="border-t border-zinc-800">
                          <td className="max-w-72 truncate px-2 py-2" title={p.product_name}>{p.product_name}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmt(Number(p.local_gmv?.amount ?? 0))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.paid_order_count}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pct(Number(p.click_through_rate))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{pct(Number(p.click_to_order_rate ?? p.click_order_rate))}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.exposure_count == null ? "n/a" : Number(p.exposure_count).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{p.inventory_left_count == null ? "n/a" : Number(p.inventory_left_count).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(room.gmvTrend ?? []).length > 0 && (
              <div className={`${cardCls} mb-4 text-xs`}>
                <div className="mb-1 text-sm font-medium">GMV trend (15-min, MYT)</div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {(room.gmvTrend.find((g: any) => g.stats_type === "TREND_GMV")?.data_points ?? []).map((d: any) => {
                        const o = (room.gmvTrend.find((g: any) => g.stats_type === "TREND_CREATED_ORDER")?.data_points ?? []).find((x: any) => x.timestamp === d.timestamp);
                        return (
                          <tr key={d.timestamp} className="border-t border-zinc-800 first:border-t-0">
                            <td className="px-2 py-1 tabular-nums">{new Date(Number(d.timestamp) * 1000).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmt(Number(d.gmv?.amount ?? 0))}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{o?.order_count ?? 0} orders</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "shop" && s && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="GMV" value={`${s.currency ?? ""} ${fmt(s.gmv)}`} sub={s.live_title ?? ""} />
              <Kpi label="SKU orders" value={String(s.sku_orders)} sub={`${s.main_orders} main · ${s.customers} customers`} />
              <Kpi label="Impressions" value={Number(s.impressions).toLocaleString()} sub={`${Number(s.views).toLocaleString()} views · ${Number(s.unique_viewers).toLocaleString()} unique`} />
              <Kpi label="CTR (mean)" value={pct(s.mean_ctr)} sub={`tap-through~ ${pct(s.tap_through_rate)}`} />
              <Kpi label="CTOR sku (derived)" value={pct(s.derived_ctor_sku)} sub={`mean interval ${pct(s.mean_ctor_sku)}`} />
              <Kpi label="AOV" value={`${s.currency ?? ""} ${s.aov !== null ? fmt(s.aov) : "n/a"}`} sub="avg_price (main order)" />
              <Kpi label="GMV / hour" value={s.gmv_per_hour !== null ? fmt(s.gmv_per_hour) : "n/a"} sub={`${s.items_sold} items sold`} />
              <Kpi label="Peak viewers" value={String(s.peak_viewers)} sub={`${s.product_clicks.toLocaleString()} product clicks`} />
            </div>
            <div className={`${cardCls} mb-4 text-xs text-zinc-400`}>
              Gaps (by design, not fetched): Ads Cost / GMV Max ROI / GMV MAX active live on the
              Marketing-API side (join follows); avg viewing duration has no field in this payload.
              Tap-through~ = product_clicks ÷ views. GMV includes returns/refunds per the doc.
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium">
                Hourly buckets (MYT, {data.hourly?.length ?? 0}h · {data.intervals} minute intervals)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-medium">Hour</th>
                    <th className="px-2 py-2 text-right font-medium">GMV</th>
                    <th className="px-2 py-2 text-right font-medium">SKU orders</th>
                    <th className="px-2 py-2 text-right font-medium">Views</th>
                    <th className="px-2 py-2 text-right font-medium">Clicks</th>
                    <th className="px-2 py-2 text-right font-medium">Impr</th>
                  </tr></thead>
                  <tbody>
                    {(data.hourly ?? []).map((h: any) => (
                      <tr key={h.hour} className="border-t border-zinc-800">
                        <td className="px-2 py-2">{h.hour}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt(h.gmv)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{h.sku_orders}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.views).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.product_clicks).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{Number(h.impressions).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
