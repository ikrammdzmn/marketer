"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { groupLiveAccounts } from "../liveBoard";
import { ModuleRedirect } from "../../module-gate";

// /accounts/live — full live board sourced from the accounts allowlist.
// Read-only: edits happen on /accounts (Live ☑ + Live note dropdown).
export default function LiveBoardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [msg, setMsg] = useState("Loading…");

  useEffect(() => {
    fetch("/api/creative-accounts", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body.accounts)) {
          setMsg(body.error ?? `HTTP ${r.status}`);
          return;
        }
        setAccounts(body.accounts);
        setMsg("");
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "load failed"));
  }, []);

  const board = groupLiveAccounts(accounts);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-4 text-sm">
      <ModuleRedirect module="accounts" />
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-semibold">Live board ({board.total})</h2>
        <span className="flex-1" />
        <Link href="/accounts" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[13px] hover:bg-zinc-800">← Accounts</Link>
      </div>
      <p className="mb-2 text-[12px] text-zinc-400">
        Sourced from the accounts allowlist — only rows with Live ☑, grouped by Live note.
        Edit types on <Link href="/accounts" className="text-emerald-300 hover:underline">/accounts</Link>.
      </p>
      {msg && <p className="mb-1 text-[12px] text-zinc-400">{msg}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {board.cols.map((c) => (
          <div key={c.key} className="overflow-hidden rounded-lg border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-center text-[12px] font-semibold uppercase tracking-wide text-zinc-100">
              {c.title} ({c.rows.length})
            </div>
            <ul className="divide-y divide-zinc-800/60">
              {c.rows.length === 0 && <li className="px-3 py-2 text-[13px] text-zinc-600">—</li>}
              {c.rows.map((a: any) => (
                <li key={String(a.name)} title={a.username ? `${a.name} (@${a.username})` : String(a.name)} className="px-3 py-2">
                  <div className="text-[13px] font-medium text-zinc-100">{a.name}</div>
                  {a.username && <div className="truncate text-[12px] text-zinc-500">@{a.username}</div>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {board.revisedAt && (
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          Latest live acc yang guna. revised by {new Date(board.revisedAt).toLocaleDateString("en-GB")}
        </p>
      )}
    </main>
  );
}
