"use client";

import { useState } from "react";

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

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days", days: 7 },
  { id: "last14", label: "Last 14 days", days: 14 },
  { id: "last30", label: "Last 30 days", days: 30 },
];

const MAX_DAYS = 31;
const MIN_MONTH = "2022-01";

export default function DateRangePicker({
  from, to, onApply, onClose,
}: {
  from: string; to: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
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

  function applyPreset(id: string) {
    let f = today, t = today;
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (id === "yesterday") {
      f = isoAdd(today, -1);
      t = f;
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

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex flex-row gap-1 md:flex-col">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p.id)}
                className="rounded-lg px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-800">{p.label}</button>
            ))}
            <input type="month" min={MIN_MONTH} max={maxMonth} value={left}
              onChange={(e) => { if (e.target.value) setLeft(e.target.value > maxMonth ? maxMonth : e.target.value); }}
              className="mt-1 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs" />
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
              {monthGrid(right)}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{msg ?? "Click = one day · second click = range. Max 31 days."}</span>
          <button onClick={onClose} className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Close</button>
        </div>
      </div>
    </div>
  );
}
