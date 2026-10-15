"use client";

import { useEffect, useState } from "react";

// Date-range popup ported from the creative-analysis v51 calendar pattern:
// preset rail + two-month grid + two-click pick with hover preview.
// GMV differences: no file-availability logic (API serves any past date —
// only future days disable) + 31-day span cap (API/Hobby safety).

function mytToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

function isoAdd(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setDate(d.getDate() + n);
  const mm = ("0" + (d.getMonth() + 1)).slice(-2);
  const dd = ("0" + d.getDate()).slice(-2);
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isoDiff(a: string, b: string): number {
  const ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(a || ""));
  const mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(b || ""));
  if (!ma || !mb) return NaN;
  const da = new Date(+ma[1], +ma[2] - 1, +ma[3]);
  const db = new Date(+mb[1], +mb[2] - 1, +mb[3]);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function isoMonth(iso: string, delta = 0): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(+m[1], +m[2] - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}`;
}

// MYT weekday (Monday-first 0..6) for an ISO date. Server-local Date math
// would shift week edges on UTC clocks, so anchor on UTC+8 explicitly.
function mytWeekdayMon0(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return NaN;
  const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + 8 * 3600 * 1000).getUTCDay();
  return (dow + 6) % 7;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "Last 3 days", days: 3 },
  { id: "thisWeek", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last14", label: "Last 14 days", days: 14 },
  { id: "last30", label: "Last 30 days", days: 30 },
];

const MAX_DAYS = 31;
const MIN_MONTH = "2022-01";

export default function DateRangePicker({
  from, to, onApply, onClose, pos,
}: {
  from: string; to: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
  pos?: { top: number; left: number } | null;
}) {
  const today = mytToday();
  const maxMonth = isoMonth(today);
  const [left, setLeft] = useState(() => {
    const init = isoMonth(to || today, -1);
    return init > maxMonth ? maxMonth : init;
  });
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const right = isoMonth(left, 1);
  const canPrev = left > MIN_MONTH;
  const canNext = right < maxMonth;

  // Esc closes. Panel stays fixed so page scroll doesn't detach it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Desktop: pin under the Range button, clamped off the right edge.
  // Mobile: full-width sheet (left/right 8px) so the single month fits.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const panelStyle: React.CSSProperties = pos && !isMobile
    ? { top: Math.min(pos.top, window.innerHeight - 420), left: Math.max(8, Math.min(pos.left, window.innerWidth - 700)) }
    : pos && isMobile
      ? { top: Math.min(pos.top, window.innerHeight - 420), left: 8, right: 8 }
      : { top: 64, left: 8 };

  function applyPreset(id: string) {
    let f = today, t = today;
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (id === "yesterday") {
      f = isoAdd(today, -1);
      t = f;
    } else if (id === "thisWeek") {
      const wd = mytWeekdayMon0(today);
      f = Number.isFinite(wd) ? isoAdd(today, -wd) : today;
      t = today;
    } else if (id === "lastWeek") {
      const wd = mytWeekdayMon0(today);
      if (Number.isFinite(wd)) {
        f = isoAdd(today, -wd - 7);
        t = isoAdd(today, -wd - 1);
      }
    } else if (id === "thisMonth") {
      f = today.slice(0, 8) + "01";
      t = today;
    } else if (id === "lastMonth") {
      const prev = isoMonth(today, -1);
      f = `${prev}-01`;
      const firstThis = `${today.slice(0, 8)}01`;
      t = isoAdd(firstThis, -1);
    } else if (p.days) {
      f = isoAdd(today, -(p.days - 1));
      t = today;
    }
    onApply(f, t);
  }

  function clickDay(iso: string) {
    setMsg(null);
    if (!anchor) {
      setAnchor(iso);
      setHov(null);
      return;
    }
    if (iso === anchor) {
      onApply(iso, iso);
      return;
    }
    const lo = anchor < iso ? anchor : iso;
    const hi = anchor < iso ? iso : anchor;
    if (isoDiff(lo, hi) + 1 > MAX_DAYS) {
      setMsg(`Max ${MAX_DAYS} days — pick a closer end date.`);
      return;
    }
    onApply(lo, hi);
  }

  function cellCls(iso: string, adj: boolean): string {
    const base = "w-8 rounded py-0.5 text-xs ";
    if (iso > today) return base + "text-zinc-700 cursor-not-allowed";
    if (adj) return base + "text-zinc-600";
    let sel = false, inr = false;
    if (!anchor) {
      if (iso === from || iso === to) sel = true;
      else if (from && to && iso > from && iso < to) inr = true;
    } else if (!hov || hov === anchor) {
      if (iso === anchor) sel = true;
    } else {
      const lo = anchor < hov ? anchor : hov;
      const hi = anchor < hov ? hov : anchor;
      if (iso === anchor || iso === hov) sel = true;
      else if (iso > lo && iso < hi) inr = true;
    }
    if (sel) return base + "bg-emerald-600 text-white font-semibold";
    if (inr) return base + "bg-emerald-900 text-emerald-200";
    return base + "hover:bg-zinc-800 text-zinc-200";
  }

  function monthGrid(ym: string) {
    const m = /^(\d{4})-(\d{2})/.exec(ym || "");
    if (!m) return null;
    const y = +m[1], mo = +m[2] - 1;
    const first = new Date(y, mo, 1).getDay();
    const n = new Date(y, mo + 1, 0).getDate();
    const p2 = (v: number) => ("0" + v).slice(-2);
    const cells: { iso: string; label: number; adj: boolean }[] = [];
    const pm = mo === 0 ? 11 : mo - 1, py = mo === 0 ? y - 1 : y;
    const pLen = new Date(py, pm + 1, 0).getDate();
    for (let i = 0; i < first; i++) {
      const dd = pLen - first + 1 + i;
      cells.push({ iso: `${py}-${p2(pm + 1)}-${p2(dd)}`, label: dd, adj: true });
    }
    for (let dd = 1; dd <= n; dd++) {
      cells.push({ iso: `${y}-${p2(mo + 1)}-${p2(dd)}`, label: dd, adj: false });
    }
    const nm = mo === 11 ? 0 : mo + 1, ny = mo === 11 ? y + 1 : y;
    let nx = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ iso: `${ny}-${p2(nm + 1)}-${p2(nx)}`, label: nx, adj: true });
      nx++;
    }
    return (
      <div>
        <h4 className="my-1 text-center text-sm font-semibold">{ym}</h4>
        <table>
          <thead><tr className="text-[10px] text-zinc-500"><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }).map((_, w) => (
              <tr key={w}>
                {cells.slice(w * 7, w * 7 + 7).map((c) => (
                  <td key={c.iso} className="p-0.5 text-center">
                    <button
                      disabled={c.iso > today}
                      onClick={() => clickDay(c.iso)}
                      onMouseEnter={() => { if (anchor) setHov(c.iso); }}
                      className={cellCls(c.iso, c.adj)}
                    >{c.label}</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Footer summary: current from–to + day count, or live anchor/hover preview.
  const rangeSummary = (() => {
    if (anchor && (!hov || hov === anchor)) return `${anchor} · pick end date…`;
    if (anchor && hov) {
      const lo = anchor < hov ? anchor : hov;
      const hi = anchor < hov ? hov : anchor;
      const n = isoDiff(lo, hi) + 1;
      return `${lo} – ${hi} · ${Number.isFinite(n) ? n : "?"} day${n === 1 ? "" : "s"}`;
    }
    const n = isoDiff(from, to) + 1;
    if (!from || !to || !Number.isFinite(n)) return "Click = one day · second click = range. Max 31 days.";
    return `${from} – ${to} · ${n} day${n === 1 ? "" : "s"}`;
  })();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div style={panelStyle} className="fixed z-50 max-h-[85vh] w-[calc(100vw-1rem)] max-w-[340px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl md:w-auto md:max-w-none">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p.id)}
                className="rounded-lg px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-800">{p.label}</button>
            ))}
            {(() => {
              const ly = +left.slice(0, 4), lm = +left.slice(5, 7);
              const minY = +MIN_MONTH.slice(0, 4), minM = +MIN_MONTH.slice(5, 7);
              const maxY = +maxMonth.slice(0, 4), maxM = +maxMonth.slice(5, 7);
              const years: number[] = [];
              for (let yy = minY; yy <= maxY; yy++) years.push(yy);
              const pick = (yy: number, mm: number) => {
                const ym = `${yy}-${("0" + mm).slice(-2)}`;
                setLeft(ym < MIN_MONTH ? MIN_MONTH : ym > maxMonth ? maxMonth : ym);
              };
              const selCls = "rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-200";
              return (
                <div className="mt-1 flex gap-1">
                  <label className="sr-only" htmlFor="calpick-month">Month</label>
                  <select id="calpick-month" value={lm} onChange={(e) => pick(ly, +e.target.value)} className={`${selCls} min-w-0 flex-1`}>
                    {MONTH_NAMES.map((name, i) => {
                      const mm = i + 1;
                      const dis = (ly === minY && mm < minM) || (ly === maxY && mm > maxM);
                      return <option key={mm} value={mm} disabled={dis}>{name.slice(0, 3)}</option>;
                    })}
                  </select>
                  <label className="sr-only" htmlFor="calpick-year">Year</label>
                  <select id="calpick-year" value={ly} onChange={(e) => pick(+e.target.value, lm)} className={selCls}>
                    {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
                  </select>
                </div>
              );
            })()}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-center gap-2 text-sm">
              <button disabled={!canPrev} onClick={() => setLeft(isoMonth(left, -12))} className="rounded px-1 hover:bg-zinc-800 disabled:opacity-30">«</button>
              <button disabled={!canPrev} onClick={() => setLeft(isoMonth(left, -1))} className="rounded px-1 hover:bg-zinc-800 disabled:opacity-30">‹</button>
              <button onClick={onClose} className="rounded px-1 hover:bg-zinc-800">✕</button>
              <button disabled={!canNext} onClick={() => setLeft(isoMonth(left, 1))} className="rounded px-1 hover:bg-zinc-800 disabled:opacity-30">›</button>
              <button disabled={!canNext} onClick={() => setLeft(isoMonth(left, 12))} className="rounded px-1 hover:bg-zinc-800 disabled:opacity-30">»</button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              {monthGrid(left)}
              <div className="hidden md:block">{monthGrid(right)}</div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{msg ?? rangeSummary}</span>
          <button onClick={onClose} className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Close</button>
        </div>
      </div>
    </>
  );
}
