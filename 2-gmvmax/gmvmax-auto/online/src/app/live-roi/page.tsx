"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "../toast";
import DateRangePicker from "../DateRangePicker";
import { ModuleRedirect } from "../module-gate";

// /live-roi — Live ROI: one live session's GMV Max cost + linked TTAM adgroup
// cost in the same window, blended ROAS / net ROI.
// Link model: TTAM rows carry identity passthrough (identity_id / hint from
// adgroup/get); the page AUTO-SUGGESTS matches against the session account
// and the user confirms with manual checkboxes. No mapping is invented.
const inputCls =
  "bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100";
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

const fmt = (n: number) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => (n ?? 0).toLocaleString();

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cardCls}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

// Strict link rules (no substrings, no shared-word guessing — "samhan" is
// shared across brands so name matching can never separate accounts).
// Suggest ONLY on: exact TikTok identity_id equality, or @handle
// equal / session-handle-as-prefix (e.g. @drsamhan → @drsamhanofficial8).
// Suffix/infix never matches, so HIMCoffeedrsamhan stays out for Samhan
// sessions. Anything else stays unticked for manual confirmation.
function handlesOf(...parts: unknown[]): string[] {
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

// Returns "identity" | "handle @x" | null — null means do not suggest.
// Strict: exact identity_id equality, or exact @handle equality.
// Different handle = different account (no prefix guessing: @drsamhan
// must NOT suggest @drsamhanofficial8). Ad groups with no identity
// and no handle are never suggested — manual tick only.
function suggestedReason(session: any, g: any): string | null {
  const sid = String(session?.identityId ?? "").trim();
  const gid = String(g?.identity_id ?? "").trim();
  if (sid && gid && sid === gid) return "identity";
  const sh = handlesOf(session?.account, session?.campaignName, session?.title);
  const gh = handlesOf(g?.name, g?.campaign_name, g?.identity_hint);
  for (const a of sh) {
    for (const b of gh) {
      if (a === b) return `handle @${b}`;
    }
  }
  return null;
}

function autoLinked(session: any, g: any): boolean {
  return suggestedReason(session, g) !== null;
}

export default function LiveRoiPage() {
  const mytToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [start, setStart] = useState(() => mytToday());
  const [end, setEnd] = useState(() => mytToday());
  const [calOpen, setCalOpen] = useState(false);
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null);
  const rangeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessMsg, setSessMsg] = useState("");
  const [sessLoading, setSessLoading] = useState(false);
  const [picked, setPicked] = useState<any | null>(null);
  const [sessQ, setSessQ] = useState("");
  // All groups collapsed by default; user expands what they want.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

// Report-day buckets come back as "YYYY-MM-DD 00:00:00" — the 00:00:00 is
// the bucket midnight, never the live start time. Strip to date; collapse
// single-day ranges; real launch time comes from liveLaunchedMyt.
function dayOnly(v: unknown): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v ?? ""));
  return m ? m[1] : String(v ?? "?");
}

function sessDateLabel(s: any): string {
  const a = s?.firstDay ? dayOnly(s.firstDay) : "?";
  const b = s?.lastDay ? dayOnly(s.lastDay) : null;
  if (!b || b === a) return a;
  return `${a}→${b}`;
}

// TikTok exposes no live_end_time — only launched + duration. Derive end
// for finished rooms; ONGOING rooms keep launched-only (end = now anyway).
// Duration arrives in mixed shapes: plain seconds ("57540"), colon
// ("15:59:00" = h:m:s, "15:59" = m:s), human ("15h 59m", "2h13m", "45m",
// "90s", "1d 2h"). Parse all of them; unknown shapes return null and the
// row falls back to showing the raw value.
function durSecs(v: unknown): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  if (/[hmsd]/i.test(raw)) {
    const m = raw.match(/(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?!s))?\s*(?:(\d+)\s*s)?/i);
    if (!m || (!m[1] && !m[2] && !m[3] && !m[4])) return null;
    const t =
      Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
    return t > 0 ? t : null;
  }
  if (raw.includes(":")) {
    const p = raw.split(":").map((x) => Number(x));
    if (p.some((x) => !Number.isFinite(x))) return null;
    let t: number;
    if (p.length === 3) t = p[0] * 3600 + p[1] * 60 + p[2];
    else if (p.length === 2) t = p[0] * 60 + p[1];
    else t = p[0];
    return t > 0 ? t : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmtDur(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

function liveEndMyt(launchedMyt: unknown, dur: unknown): string | null {
  const lm = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(launchedMyt ?? ""));
  const secs = durSecs(dur);
  if (!lm || secs === null) return null;
  const t = Date.UTC(+lm[1], +lm[2] - 1, +lm[3], +lm[4], +lm[5]) + secs * 1000;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} MYT`;
}

// Short end label: same-day end shows "HH:MM MYT", next-day (overflow)
// shows "MM-DD HH:MM MYT" so 08:04 → 00:03 never reads backwards.
function shortEnd(launchedMyt: unknown, endMyt: string | null): string | null {
  if (!endMyt) return null;
  const l = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(launchedMyt ?? ""));
  const e = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(endMyt);
  if (!l || !e) return endMyt;
  if (`${l[1]}-${l[2]}-${l[3]}` === `${e[1]}-${e[2]}-${e[3]}`) return `${e[4]}:${e[5]} MYT`;
  return `${e[2]}-${e[3]} ${e[4]}:${e[5]} MYT`;
}

  const [options, setOptions] = useState<any[]>([]);
  const [optMsg, setOptMsg] = useState("");
  const [optLoading, setOptLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const [result, setResult] = useState<any | null>(null);
  const [combLoading, setCombLoading] = useState(false);
  const [feePct, setFeePct] = useState("25");

  async function loadSessions() {
    setSessLoading(true);
    setSessMsg("");
    setSessions([]);
    setPicked(null);
    setResult(null);
    try {
      const r = await fetch(
        `/api/live-roi/sessions?shopNumber=1&startDate=${start}&endDate=${end}`,
        { cache: "no-store" }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "sessions failed");
      setSessions(body.sessions ?? []);
      setSessMsg(
        `${(body.sessions ?? []).length} sessions · ${(body.campaigns ?? []).length} LIVE campaigns` +
          (body.skipped ? ` · ${body.skipped} zero-spend skipped` : "") +
          (body.errors?.length ? ` · ${body.errors.length} drill errs` : "")
      );
    } catch (e) {
      setSessMsg(e instanceof Error ? e.message : "sessions failed");
    } finally {
      setSessLoading(false);
    }
  }

  async function loadOptions() {
    setOptLoading(true);
    setOptMsg("");
    setOptions([]);
    try {
      const r = await fetch(
        `/api/live-roi/ttam-options?shopNumber=1&startDate=${start}&endDate=${end}`,
        { cache: "no-store" }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "ttam options failed");
      const list = body.adgroups ?? [];
      setOptions(list);
      // Preselect auto-suggested links for the picked session (user-editable).
      if (picked) {
        const pre = new Set<string>();
        for (const g of list) {
          if (autoLinked(picked, g)) pre.add(String(g.adgroup_id));
        }
        setChecked(pre);
      }
      setOptMsg(
        `${list.length} TTAM adgroups` +
          (body.skipped ? ` · ${body.skipped} zero-spend skipped` : "") +
          (body.errors?.length ? ` · ${body.errors.length} errs` : "")
      );
    } catch (e) {
      setOptMsg(e instanceof Error ? e.message : "ttam options failed");
    } finally {
      setOptLoading(false);
    }
  }

  async function combine() {
    if (!picked) return;
    const fee = Number(feePct);
    if (!Number.isFinite(fee) || fee < 0 || fee > 90) {
      toast("fee must be 0–90%", "err");
      return;
    }
    setCombLoading(true);
    setResult(null);
    try {
      const ids = [...checked].join(",");
      const r = await fetch(
        `/api/live-roi/combine?shopNumber=1&campaignId=${encodeURIComponent(picked.campaignId)}&roomId=${encodeURIComponent(picked.roomId)}&startDate=${start}&endDate=${end}&adgroupIds=${encodeURIComponent(ids)}&feeRate=${encodeURIComponent(String(fee))}`,
        { cache: "no-store" }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "combine failed");
      setResult(body);
      toast(`Live ROI: blended ROAS ${body.blendedRoas?.toFixed(2) ?? "n/a"}`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "combine failed", "err");
    } finally {
      setCombLoading(false);
    }
  }

  const filtered = options.filter((g: any) => {
    if (!q.trim()) return true;
    const hay = `${g.name} ${g.campaign_name} ${g.adgroup_id} ${g.identity_id ?? ""} ${g.identity_hint ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const suggTotal = picked ? options.filter((g: any) => autoLinked(picked, g)).length : 0;
  const selSpend = options
    .filter((g: any) => checked.has(String(g.adgroup_id)))
    .reduce((s: number, g: any) => s + Number(g.spend ?? 0), 0);

  // Group sessions by account handle only (identity-level, not campaign).
  const sessFiltered = useMemo(() => {
    const t = sessQ.trim().toLowerCase();
    if (!t) return sessions;
    return sessions.filter((s: any) =>
      `${s.title ?? ""} ${s.campaignName ?? ""} ${s.account ?? ""} ${s.roomId ?? ""}`.toLowerCase().includes(t)
    );
  }, [sessions, sessQ]);
  const sessGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of sessFiltered) {
      const key = s.account ? String(s.account) : "no account";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .map(([account, rows]) => ({
        account,
        rows: rows.sort((a: any, b: any) => Number(b.gmv ?? 0) - Number(a.gmv ?? 0)),
        cost: rows.reduce((x: number, r: any) => x + Number(r.cost ?? 0), 0),
        gmv: rows.reduce((x: number, r: any) => x + Number(r.gmv ?? 0), 0),
      }))
      .sort((a, b) => b.gmv - a.gmv);
  }, [sessFiltered]);

  function pickSession(s: any) {
    setPicked(s);
    setResult(null);
    if (options.length > 0) {
      const pre = new Set<string>();
      for (const g of options) {
        if (autoLinked(s, g)) pre.add(String(g.adgroup_id));
      }
      setChecked(pre);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-100">
      <ModuleRedirect module="live-roi" />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Live ROI</p>
      <h1 className="mt-1 text-xl font-semibold">Live session + TTAM blended ROI</h1>
      <p className="mt-1 text-xs text-zinc-400">
        Pick one live session (GMV Max room cost), tick the TTAM adgroups that fed it
        (auto-suggested from TikTok identity, you confirm), then Combine. Same date window on both legs.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          ref={rangeBtnRef}
          type="button"
          className={inputCls}
          onClick={() => {
            const r = rangeBtnRef.current?.getBoundingClientRect();
            if (r) setCalPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
            setCalOpen((v) => !v);
          }}
        >
          {start} → {end}
        </button>
        <button type="button" className={inputCls} onClick={loadSessions} disabled={sessLoading}>
          {sessLoading ? "Loading…" : "1 · Load sessions"}
        </button>
        <button type="button" className={inputCls} onClick={loadOptions} disabled={optLoading || !picked}>
          {optLoading ? "Loading…" : "2 · Load TTAM adgroups"}
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          onClick={combine}
          disabled={combLoading || !picked}
        >
          {combLoading ? "Combining…" : "3 · Combine"}
        </button>
        <label className="flex items-center gap-1 text-xs text-zinc-400">
          fee %
          <input
            className={`${inputCls} w-16 text-right tabular-nums`}
            value={feePct}
            inputMode="decimal"
            onChange={(e) => setFeePct(e.target.value)}
          />
        </label>
        {sessMsg && <span className="text-xs text-zinc-400">{sessMsg}</span>}
        {optMsg && <span className="text-xs text-zinc-400">{optMsg}</span>}
      </div>
      {calOpen && (
        <DateRangePicker
          from={start}
          to={end}
          onApply={(s: string, e: string) => {
            setStart(s);
            setEnd(e);
          }}
          onClose={() => setCalOpen(false)}
          pos={calPos ?? undefined}
        />
      )}

      {result && (
        <div className="mt-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Session GMV" value={`RM ${fmt(result.session?.gmv ?? 0)}`} sub={`${fmtInt(result.session?.orders ?? 0)} orders · room ${result.session?.roomId ?? ""}`} />
            <Kpi label="GMV Max session cost" value={`RM ${fmt(result.session?.cost ?? 0)}`} sub={`room ROI ${Number(result.session?.roi ?? 0).toFixed(2)}x`} />
            <Kpi label="TTAM picked cost" value={`RM ${fmt(result.ttamSpend ?? 0)}`} sub={`${(result.ttamPicked ?? []).length} adgroups`} />
            <Kpi label="Total ad cost" value={`RM ${fmt(result.totalCost ?? 0)}`} sub="GMV Max + TTAM" />
            <Kpi
              label="Blended ROAS"
              value={result.blendedRoas === null ? "n/a" : `${Number(result.blendedRoas).toFixed(2)}x`}
              sub="GMV / total cost"
            />
            <Kpi
              label="Blended net ROI"
              value={result.blendedNetRoi === null ? "n/a" : `${Number(result.blendedNetRoi).toFixed(2)}x`}
              sub={`gross × ${(1 - Number(result.feeRate ?? 0.25)).toFixed(2)} / total`}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{result.note}</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className={cardCls}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">Live sessions ({sessFiltered.length}/{sessions.length})</span>
            <input
              className={inputCls}
              placeholder="filter account / campaign / room…"
              value={sessQ}
              onChange={(e) => setSessQ(e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setExpanded(new Set(sessGroups.map((g) => g.account)))}
            >
              Expand all
            </button>
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => setExpanded(new Set())}
            >
              Collapse all
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-zinc-500">Load sessions for the range first.</p>
          ) : sessGroups.length === 0 ? (
            <p className="text-xs text-zinc-500">No sessions match the filter.</p>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              {sessGroups.map((grp) => {
                const open = expanded.has(grp.account);
                return (
                  <div key={grp.account} className="mb-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg bg-zinc-800/70 px-2 py-1 text-xs hover:bg-zinc-800"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(grp.account)) next.delete(grp.account);
                          else next.add(grp.account);
                          return next;
                        })
                      }
                    >
                      <span className="font-medium">
                        {open ? "▾" : "▸"} {grp.account} <span className="text-zinc-400">· {grp.rows.length}</span>
                      </span>
                      <span className="tabular-nums text-zinc-400">
                        RM {fmt(grp.cost)} · RM {fmt(grp.gmv)}
                      </span>
                    </button>
                    {open && (
                      <table className="w-full text-xs">
                        <tbody>
                          {grp.rows.map((s: any) => {
                            const active = picked && picked.campaignId === s.campaignId && String(picked.roomId) === String(s.roomId);
                            return (
                              <tr key={`${s.campaignId}:${s.roomId}`} className={active ? "bg-emerald-950/60" : undefined}>
                                <td className="py-1 pr-2">
                                  <button
                                    type="button"
                                    className="text-left hover:text-emerald-300"
                                    onClick={() => pickSession(s)}
                                  >
                                    <div className="font-medium">{s.title && String(s.title).trim() ? String(s.title) : `room ${s.roomId}`}</div>
                                    <div className="text-[11px] text-zinc-500">
                                      {s.campaignName} · {sessDateLabel(s)}
                                      {(() => {
                                        const secs = durSecs(s.liveDuration);
                                        const end = liveEndMyt(s.liveLaunchedMyt, s.liveDuration);
                                        const ongoing = String(s.liveStatus ?? "").toUpperCase() === "ONGOING";
                                        if (!s.liveLaunchedMyt) return null;
                                        if (ongoing) return ` · launched ${s.liveLaunchedMyt}${secs !== null ? ` · live ${fmtDur(secs)} so far` : s.liveDuration ? ` · dur ${s.liveDuration}` : ""}`;
                                        if (end && secs !== null) {
                                          const se = shortEnd(s.liveLaunchedMyt, end);
                                          const overflow = se && /^\d{2}-\d{2} /.test(se) ? " · +1d overflow" : "";
                                          return ` · ${s.liveLaunchedMyt} → ${se} (${fmtDur(secs)})${overflow}`;
                                        }
                                        if (s.liveDuration) return ` · launched ${s.liveLaunchedMyt} · dur ${s.liveDuration}`;
                                        return ` · launched ${s.liveLaunchedMyt}`;
                                      })()}
                                      {s.liveStatus ? ` · ${s.liveStatus}` : ""}
                                    </div>
                                  </button>
                                </td>
                                <td className="text-right tabular-nums">RM {fmt(s.cost)}</td>
                                <td className="text-right tabular-nums">RM {fmt(s.gmv)}</td>
                                <td className="text-right tabular-nums">{Number(s.roi ?? 0).toFixed(2)}x</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">TTAM adgroups ({filtered.length}/{options.length})</span>
            <span className="text-xs tabular-nums text-emerald-300">
              ✓ {checked.size} selected · RM {fmt(selSpend)}
            </span>
            <input
              className={inputCls}
              placeholder="filter name / id / identity…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {picked && options.length > 0 && suggTotal === 0 && (
              <span className="text-[11px] text-amber-400">
                no identity/handle link for this session — tick manually
              </span>
            )}
          </div>
          {!picked ? (
            <p className="text-xs text-zinc-500">Pick a session first — suggestions key off its TikTok account.</p>
          ) : options.length === 0 ? (
            <p className="text-xs text-zinc-500">Load TTAM adgroups for the range first.</p>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="py-1 text-left">✓</th>
                    <th className="text-left">Adgroup / campaign</th>
                    <th className="text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g: any) => {
                    const id = String(g.adgroup_id);
                    const on = checked.has(id);
                    const suggested = suggestedReason(picked, g);
                    return (
                      <tr key={id} className={on ? "bg-emerald-950/60" : undefined}>
                        <td className="py-1">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setChecked((prev) => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <div className="font-medium">
                            {g.name}
                            {suggested && <span className="ml-1 text-[10px] text-emerald-400">suggested · {suggested}</span>}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {g.campaign_name} · {g.status ?? "?"} · ag {g.adgroup_id} ·
                            {g.identity_id ? ` id ${g.identity_id}` : " no identity"}
                            {g.identity_hint ? ` · ${g.identity_hint}` : ""}
                          </div>
                        </td>
                        <td className="text-right tabular-nums">RM {fmt(g.spend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
