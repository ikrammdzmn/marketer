"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWhoami } from "../../module-gate";

// /shop-auth/grant — TEMPORARY admin-only grant page (unlisted, no sidebar).
// Mints 10-minute seller + creator authorize links for copy-share.
// Remove this route once creator grants are collected.
function fmtMYT(v: string | null): string {
  if (!v) return "?";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
const cardCls = "bg-zinc-900 border border-zinc-800 rounded-xl p-3";

interface GrantLink {
  role: string;
  app: string;
  url: string;
  expiresAt: string;
}

function useCountdown(expiresAt: string | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "expired — generate again";
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")} left`;
}

export default function ShopAuthGrantPage() {
  const { modules, isAdmin } = useWhoami();
  const [status, setStatus] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [links, setLinks] = useState<Record<string, GrantLink>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUser, setEditUser] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadStatus = useCallback(async () => {
    setStatusMsg("");
    try {
      const r = await fetch("/api/shop-auth/status", { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setStatus(body);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "status failed");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  async function mint(role: "seller" | "creator") {
    setBusy(role);
    setMsg("");
    try {
      const r = await fetch(
        `/api/shop-auth/start?app=analytics&role=${role}&format=json`,
        { cache: "no-store" }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setLinks((prev) => ({ ...prev, [role]: body as GrantLink }));
      if (timers.current[role]) clearTimeout(timers.current[role]);
      timers.current[role] = setTimeout(() => {
        setLinks((prev) => {
          const next = { ...prev };
          delete next[role];
          return next;
        });
      }, 10 * 60 * 1000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "mint failed");
    } finally {
      setBusy("");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMsg("Link copied — valid 10 min from minting.");
    } catch {
      setMsg("Copy blocked — select the URL manually.");
    }
  }

  const sellerLink = links.seller ?? null;
  const creatorLink = links.creator ?? null;
  const sellerCd = useCountdown(sellerLink?.expiresAt ?? null);
  const creatorCd = useCountdown(creatorLink?.expiresAt ?? null);

  async function saveLabel(openId: string, cur: any) {
    const name = editName.trim() || String(cur.creator_name ?? "");
    const username = editUser.trim().replace(/^@/, "") || String(cur.creator_user ?? "");
    if ((!name || name === "?") && (!username || username === "?")) { setEditing(null); return; }
    try {
      const r = await fetch("/api/shop-auth/creator-label", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ open_id: openId, name, username }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setEditing(null);
      setMsg("Saved.");
      loadStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "save failed");
    }
  }

  if (modules !== null && !isAdmin) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm">
        <h2 className="text-lg font-semibold">Admin only</h2>
        <p className="mt-2 text-zinc-400">
          Grant links are minted by the administrator.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold">Shop grants (temporary)</h2>
        <p className="text-xs text-zinc-500">
          Admin-minted 10-minute authorize links. Unlisted page — remove after
          creator grants are collected. Prod callback must be registered in
          Partner Center (
          <span className="text-zinc-300">https://marketer-hw.vercel.app/api/shop-auth/callback</span>
          , keep localhost too).
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={loadStatus}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Refresh status
          </button>
        </div>
        {statusMsg && <p className="mt-1 text-[11px] text-red-400">{statusMsg}</p>}
        {msg && <p className="mt-1 text-[11px] text-zinc-400">{msg}</p>}
      </div>

      <div className="grid gap-3 px-4 pb-16 pt-4 md:grid-cols-2">
        <div className={cardCls}>
          <div className="mb-1 text-sm font-medium">Seller grant (shop 1)</div>
          <p className="text-xs text-zinc-400">
            {status?.analytics
              ? `Granted · updated ${fmtMYT(status.analytics.updatedAt)} MYT · token len ${status.analytics.tokenLen}`
              : "No seller analytics grant in Neon yet."}
          </p>
          <button
            onClick={() => mint("seller")}
            disabled={busy === "seller"}
            className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === "seller" ? "Minting…" : "Generate seller link"}
          </button>
          {sellerLink && (
            <div className="mt-2 text-xs">
              <p className="text-amber-300">{sellerCd}</p>
              <p className="mt-1 break-all text-zinc-300">{sellerLink.url}</p>
              <button
                onClick={() => copy(sellerLink.url)}
                className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        <div className={cardCls}>
          <div className="mb-1 text-sm font-medium">Creator grant (affiliate rooms)</div>
          <p className="text-xs text-zinc-400">
            Creator opens the link on their own TikTok login — approval binds
            their account. Needed for AFFILIATE minute detail (28001022 on
            seller token by design).
          </p>
          {!status?.creatorsReady && (
            <p className="mt-1 text-xs text-red-400">
              Creator table missing — owner runs 036 migration (dev + prod) first.
            </p>
          )}
          <button
            onClick={() => mint("creator")}
            disabled={busy === "creator"}
            className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === "creator" ? "Minting…" : "Generate creator link"}
          </button>
          {creatorLink && (
            <div className="mt-2 text-xs">
              <p className="text-amber-300">{creatorCd}</p>
              <p className="mt-1 break-all text-zinc-300">{creatorLink.url}</p>
              <button
                onClick={() => copy(creatorLink.url)}
                className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls} mx-4 mb-4 text-xs`}>
        <div className="mb-2 text-sm font-medium">
          Connected creators ({(status?.creators ?? []).length})
        </div>
        {!status?.creatorsReady ? (
          <p className="text-red-400">Creator table missing — run 036 migration first.</p>
        ) : (status?.creators ?? []).length === 0 ? (
          <p className="text-zinc-400">No creator grants yet. Mint a link above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Username</th>
                <th className="px-2 py-2 font-medium">Open ID</th>
                <th className="px-2 py-2 text-right font-medium">Token len</th>
                <th className="px-2 py-2 text-right font-medium">Connected</th>
                <th className="px-2 py-2 font-medium">Scopes</th>
                <th className="px-2 py-2 text-right font-medium"></th>
              </tr></thead>
              <tbody>
                {(status.creators ?? []).map((c: any) => (
                  <tr key={c.creator_open_id} className="border-t border-zinc-800">
                    {editing === c.creator_open_id ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveLabel(c.creator_open_id, c); if (e.key === "Escape") setEditing(null); }}
                            placeholder="Dr. Samhan"
                            className="w-32 rounded border border-zinc-600 bg-zinc-900 px-1 py-0.5 text-xs"
                            autoFocus
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={editUser}
                            onChange={(e) => setEditUser(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveLabel(c.creator_open_id, c); if (e.key === "Escape") setEditing(null); }}
                            placeholder="dr.samhan"
                            className="w-36 rounded border border-zinc-600 bg-zinc-900 px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => saveLabel(c.creator_open_id, c)} className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Save</button>
                        </td>
                        <td className="px-2 py-2" colSpan={4} />
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2">{c.creator_name && c.creator_name !== "?" ? c.creator_name : <span className="text-zinc-500">?</span>}</td>
                        <td className="px-2 py-2">{c.creator_user && c.creator_user !== "?" ? `@${c.creator_user}` : <span className="text-zinc-500">?</span>}</td>
                        <td className="px-2 py-2 break-all font-mono text-[11px]">{c.creator_open_id}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{c.tokenLen}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtMYT(c.updatedAt)} MYT</td>
                        <td className="px-2 py-2 break-all font-mono text-[11px]">{c.grantedScopes || <span className="text-zinc-500">re-grant to fill</span>}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => { setEditing(c.creator_open_id); setEditName(c.creator_name && c.creator_name !== "?" ? c.creator_name : ""); setEditUser(c.creator_user && c.creator_user !== "?" ? c.creator_user : ""); }} className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Edit</button>{" "}
                          <button onClick={() => copy(c.creator_open_id)} className="rounded border border-zinc-700 px-2 py-0.5 hover:bg-zinc-800">Copy id</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardCls} mx-4 mb-8 text-xs text-zinc-400`}>
        Minting is admin-only server-side (both roles). Seller approval lands in
        <span className="text-zinc-200"> shop_analytics_tokens</span>; creator approvals land per-creator in
        <span className="text-zinc-200"> shop_creator_tokens</span>. Token material never renders here — lengths only.
      </div>
    </div>
  );
}
