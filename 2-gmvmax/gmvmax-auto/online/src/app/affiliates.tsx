"use client";

import { useEffect, useState } from "react";

type Row = {
  username: string;
  link: string | null;
  review: string;
  overdue: boolean;
};

type Digest = {
  dueToday: Row[];
  overdue: Row[];
  dueTomorrow: Row[];
  pendingQueue: number;
};

const CAP = 20;

function Item({ r, dot }: { r: Row; dot: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] self-center rounded-full ${dot}`} />
      <span className="w-16 shrink-0 text-xs tabular-nums text-zinc-400">{r.review}</span>
      {r.link ? (
        <a href={r.link} target="_blank" rel="noreferrer" className="min-w-0 truncate text-zinc-100 hover:underline">
          {r.username}
        </a>
      ) : (
        <span className="min-w-0 truncate">{r.username}</span>
      )}
    </div>
  );
}

// Dashboard affiliate card: same buckets as the 4x-daily aff-notify digest
// (priority due/overdue, tomorrow reminder, pending-ads-run queue), read live
// from the Affiliate Collection sheet. Silent-healthy: all-clear when empty.
export default function Affiliates() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/affiliate-digest")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "affiliates failed");
        if (body.needsConnect) setNote(String(body.needsConnect));
        else setDigest(body.digest ?? null);
      })
      .catch((e) => setNote(e instanceof Error ? e.message : "affiliates failed"));
  }, []);

  if (note) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Affiliates</div>
        <p className="mt-1 text-xs text-zinc-400">{note}</p>
      </div>
    );
  }
  if (!digest) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Affiliates</div>
        <p className="mt-1 text-xs text-zinc-500">Loading affiliates…</p>
      </div>
    );
  }
  const priority = [...digest.dueToday, ...digest.overdue];
  const empty = priority.length === 0 && digest.dueTomorrow.length === 0 && digest.pendingQueue === 0;
  const shown = priority.slice(0, CAP);
  const overflow = priority.length - shown.length;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="font-medium">Affiliates</div>
      {empty ? (
        <p className="mt-1 text-xs text-zinc-500">All clear — nothing due.</p>
      ) : (
        <>
          {priority.length > 0 && (
            <section className="mt-2 rounded-lg border-l-2 border-red-500 bg-red-950/30 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white">
                Review now · {priority.length}
              </div>
              <ul className="mt-1 space-y-1">
                {shown.map((r, i) => (
                  <li key={`${r.username}@${r.review}@${i}`}>
                    <Item r={r} dot={r.overdue ? "bg-red-400" : "bg-amber-300"} />
                  </li>
                ))}
              </ul>
              {overflow > 0 && (
                <p className="mt-1 text-xs text-zinc-500">+{overflow} more overdue/today.</p>
              )}
            </section>
          )}
          {digest.dueTomorrow.length > 0 && (
            <section className="mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-200">
                Due tomorrow · {digest.dueTomorrow.length}
              </div>
              <ul className="mt-1 space-y-1">
                {digest.dueTomorrow.map((r, i) => (
                  <li key={`${r.username}@${r.review}@${i}`}>
                    <Item r={r} dot="bg-zinc-500" />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {digest.pendingQueue > 0 && (
            <p className="mt-3 text-[13px] text-emerald-300">
              {digest.pendingQueue} video{digest.pendingQueue === 1 ? "" : "s"} waiting for ads run.
            </p>
          )}
        </>
      )}
    </div>
  );
}
