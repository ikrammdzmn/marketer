import type { ReactNode } from "react";

// Tiny client-safe markdown renderer (no deps — folder allows no new packages).
// Handles the subset Gemini emits: ##/### headings, **bold**, `code`,
// "- "/"* " bullets, "1. " numbered items, blank-line paragraphs.
// JSX-built (never raw HTML), so AI text can't inject markup.
function inline(line: string, keyBase: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={key} className="font-semibold text-zinc-50">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      return <code key={key} className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-emerald-200">{p.slice(1, -1)}</code>;
    }
    return <span key={key}>{p}</span>;
  });
}

export function Md({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = (k: string) => {
    const cur = list;
    list = null;
    if (!cur) return;
    const items = cur.items.map((it, i) => <li key={`${k}-${i}`}>{inline(it, `${k}-${i}`)}</li>);
    blocks.push(cur.ordered
      ? <ol key={k} className="ml-5 list-decimal space-y-1">{items}</ol>
      : <ul key={k} className="ml-5 list-disc space-y-1">{items}</ul>);
  };
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flush(`gap-${idx}`); return; }
    const h = /^(#{2,4})\s+(.*)/.exec(line);
    if (h) {
      flush(`h-${idx}`);
      blocks.push(
        <div key={idx} className="pt-2 text-sm font-semibold text-zinc-50 first:pt-0">
          {inline(h[2], `h${idx}`)}
        </div>
      );
      return;
    }
    const ul = /^[-*]\s+(.*)/.exec(line);
    if (ul) {
      if (!list || list.ordered) { flush(`sw-${idx}`); list = { ordered: false, items: [] }; }
      const cur = list;
      if (cur) cur.items.push(ul[1]);
      return;
    }
    const ol = /^\d+[.)]\s+(.*)/.exec(line);
    if (ol) {
      if (!list || !list.ordered) { flush(`sw-${idx}`); list = { ordered: true, items: [] }; }
      const cur = list;
      if (cur) cur.items.push(ol[1]);
      return;
    }
    flush(`p-${idx}`);
    blocks.push(<p key={idx}>{inline(line, `p${idx}`)}</p>);
  });
  flush("end");
  return <div className="space-y-1.5 text-sm leading-relaxed text-zinc-100">{blocks}</div>;
}
