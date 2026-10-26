"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Client-side module gate. Data APIs already enforce scopes server-side
// (requireModule); this only controls what the user sees / where they land.
export function useWhoami(): { modules: string[] | null; isAdmin: boolean } {
  const [state, setState] = useState<{ modules: string[] | null; isAdmin: boolean }>({
    modules: null,
    isAdmin: false,
  });
  useEffect(() => {
    fetch("/api/whoami", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const body = await r.json();
        if (Array.isArray(body.modules)) {
          setState({ modules: body.modules, isAdmin: body.isAdmin === true });
        }
      })
      .catch(() => {});
  }, []);
  return state;
}

export function canSee(modules: string[] | null, want: string | string[]): boolean {
  if (modules === null) return true; // loading: avoid nav flash, APIs still enforce
  if (modules.includes("all")) return true;
  const list = Array.isArray(want) ? want : [want];
  return list.some((m) => modules.includes(m));
}

// Renders nothing when allowed; redirects to / when the scope lacks the
// module. Drop as the first element inside a page's <main>.
export function ModuleRedirect({ module }: { module: string | string[] }) {
  const { modules } = useWhoami();
  useEffect(() => {
    if (modules !== null && !canSee(modules, module)) {
      window.location.replace("/");
    }
  }, [modules, module]);
  return null;
}

export default function ModuleGate({
  module,
  children,
}: {
  module: string | string[];
  children: React.ReactNode;
}) {
  const { modules } = useWhoami();
  if (modules === null) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-zinc-400">Loading…</main>;
  }
  if (!canSee(modules, module)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm">
        <h2 className="text-lg font-semibold">Not granted</h2>
        <p className="mt-2 text-zinc-400">
          Your account does not have access to this module. Ask the administrator to grant it on the Access page.
        </p>
        <Link href="/" className="mt-4 inline-block rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
          ← Dashboard
        </Link>
      </main>
    );
  }
  return <>{children}</>;
}
