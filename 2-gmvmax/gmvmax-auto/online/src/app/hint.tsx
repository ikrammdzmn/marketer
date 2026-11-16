"use client";

import { useEffect, useRef, useState } from "react";

// Tap-? explanation bubble (touch-first: no hover-only tricks).
// Render <Hint text="..." /> right after any label or value.
export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open ]);
  return (
    <span ref={ref} className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Apa ini?"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 text-[10px] leading-none text-zinc-400 hover:bg-zinc-800"
      >?</button>
      {open && (
        <span className="absolute left-0 top-full z-50 mt-1 w-60 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-left text-[11px] font-normal leading-snug text-zinc-300 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}
