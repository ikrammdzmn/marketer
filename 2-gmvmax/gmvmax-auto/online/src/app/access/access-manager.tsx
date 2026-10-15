"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "../toast";

type AllowlistedEmail = {
  email: string;
  created_by: string;
  created_at: string | null;
  display_name: string | null;
  isBootstrapAdmin: boolean;
};

export default function AccessPage() {
  const [emails, setEmails] = useState<AllowlistedEmail[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/access-list", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load access list");
    setEmails(body.emails ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load access list");
      setLoading(false);
    });
  }, [load]);

  async function addEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, display_name: displayName || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not add email");
      setEmail("");
      setDisplayName("");
      const okMsg = body.needsMigration026
        ? `${body.email} can now sign in, but the display name was not saved — run migration 026 on this database first.`
        : `${body.email} can now sign in.`;
      setMessage(okMsg);
      toast(okMsg);
      await load();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Could not add email";
      setMessage(m);
      toast(m, "err");
    } finally {
      setBusy(false);
    }
  }

  async function saveDisplayName(target: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, display_name: editingName || null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save display name");
      const okMsg = body.display_name ? `${target} now shows as “${body.display_name}”.` : `${target} now shows its email.`;
      setMessage(okMsg);
      toast(okMsg);
      setEditingEmail(null);
      setEditingName("");
      await load();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Could not save display name";
      setMessage(m);
      toast(m, "err");
    } finally {
      setBusy(false);
    }
  }

  async function removeEmail(target: string) {
    if (!window.confirm(`Remove ${target} from dashboard access?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not remove email");
      const okMsg = `${target} was removed. Their next data request will be denied.`;
      setMessage(okMsg);
      toast(okMsg);
      await load();
    } catch (error) {
      const m = error instanceof Error ? error.message : "Could not remove email";
      setMessage(m);
      toast(m, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Administrator</p>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard access</h1>
        <p className="mt-2 text-sm text-zinc-400">Only listed Google accounts can view dashboard data. The fixed bootstrap admin is managed in Vercel settings.</p>
      </div>

      <form onSubmit={addEmail} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <label className="sr-only" htmlFor="allowlist-email">Google email</label>
        <input
          id="allowlist-email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@company.com"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <label className="sr-only" htmlFor="allowlist-name">Display name (optional)</label>
        <input
          id="allowlist-name"
          type="text"
          maxLength={64}
          autoComplete="off"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Display name (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button disabled={busy} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">Add email</button>
      </form>

      {message && <p role="status" className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">{message}</p>}

      <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
        <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium">Allowed accounts</div>
        {loading ? <p className="p-4 text-sm text-zinc-400">Loading…</p> : emails.length === 0 ? <p className="p-4 text-sm text-zinc-400">No accounts are listed.</p> : (
          <ul className="divide-y divide-zinc-800">
            {emails.map((entry) => (
              <li key={entry.email} className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 px-4 py-3">
                <div className="min-w-0">
                  {editingEmail === entry.email ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        maxLength={64}
                        autoComplete="off"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        placeholder={entry.email}
                        className="w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                      />
                      <button disabled={busy} onClick={() => saveDisplayName(entry.email)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">Save</button>
                      <button disabled={busy} onClick={() => { setEditingEmail(null); setEditingName(""); }} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-50">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-100">{entry.display_name || entry.email}</p>
                      {entry.display_name && <p className="mt-0.5 text-xs text-zinc-500">{entry.email}</p>}
                      <p className="mt-1 text-xs text-zinc-500">{entry.isBootstrapAdmin ? "Fixed administrator · Vercel environment" : `Added by ${entry.created_by}`}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingEmail !== entry.email && (
                    <button disabled={busy} onClick={() => { setEditingEmail(entry.email); setEditingName(entry.display_name || ""); }} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-50">Rename</button>
                  )}
                  {entry.isBootstrapAdmin ? <span className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-300">Admin · fixed</span> : (
                    <button disabled={busy} onClick={() => removeEmail(entry.email)} className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50">Remove</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
