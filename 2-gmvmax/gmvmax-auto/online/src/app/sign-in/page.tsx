"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const denied = searchParams.get("error") === "AccessDenied";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">GMV Max Online</p>
        <h1 className="mt-3 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">Use a Google account approved for this dashboard.</p>
        {denied && (
          <p role="alert" className="mt-4 rounded-lg border border-amber-800 bg-amber-950/50 p-3 text-sm text-amber-200">
            This Google email is not on the access list. Ask the dashboard administrator to add it.
          </p>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
        >
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<main className="p-8 text-zinc-400">Loading sign-in…</main>}><SignInForm /></Suspense>;
}
