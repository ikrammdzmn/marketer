import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// GET /api/tg-probe — one-shot shape probe for sendRichMessage blocks.
// Sends labeled TEST candidates to the group topic, deletes every message
// that lands, returns per-candidate {ok, description}. Same CRON guard.
export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = cleanEnv(process.env.TELEGRAM_BOT_TOKEN);
  const rawChat = cleanEnv(process.env.TELEGRAM_CHAT_ID);
  const envThread = cleanEnv(process.env.TELEGRAM_THREAD_ID);
  let chatId = rawChat;
  let thread = envThread;
  const m = rawChat.match(/^(-\d+)[_:](\d+)$/);
  if (m) {
    chatId = m[1];
    if (!thread) thread = m[2];
  }
  if (!token || !chatId) return NextResponse.json({ error: "bot env missing" }, { status: 500 });

  const url = new URL(request.url);
  const keep = url.searchParams.get("keep") === "1";

  const target: Record<string, unknown> = { chat_id: chatId };
  if (thread) target.message_thread_id = Number(thread);

  const demoRows = (label: string) => [
    [{ text: { type: "bold", text: "PROBE" }, is_header: true }, { text: { type: "bold", text: label }, is_header: true }],
    [{ text: "row one" }, { text: { type: "bold", text: "1.00" } }],
    [{ text: "row two" }, { text: { type: "bold", text: "2.00" } }],
    [{ text: "row three" }, { text: { type: "bold", text: "3.00" } }],
  ];

  const candidates: Array<{ name: string; rich_message: unknown }> = [
    {
      name: "text-heading2",
      rich_message: { blocks: [{ type: "heading", text: "PROBE heading", size: 2 }] },
    },
    {
      name: "text-pre2",
      rich_message: { blocks: [{ type: "pre", text: "PROBE mono" }] },
    },
    {
      name: "text-list2",
      rich_message: {
        blocks: [{
          type: "list",
          items: [
            { blocks: [{ type: "paragraph", text: "PROBE one" }] },
            { blocks: [{ type: "paragraph", text: "PROBE two" }] },
          ],
        }],
      },
    },
    {
      name: "text-quote2",
      rich_message: { blocks: [{ type: "blockquote", blocks: [{ type: "paragraph", text: "PROBE quote" }] }] },
    },
    {
      name: "text-expandquote2",
      rich_message: { blocks: [{ type: "expandable_blockquote", text: "PROBE expand" }] },
    },
    {
      name: "text-pullquote2",
      rich_message: { blocks: [{ type: "pullquote", text: "PROBE pull" }] },
    },
    {
      name: "text-math",
      rich_message: { blocks: [{ type: "mathematical_expression", expression: "E=mc^2" }] },
    },
    {
      name: "text-anchor",
      rich_message: { blocks: [{ type: "anchor", name: "probe" }] },
    },
    {
      name: "media-map2",
      rich_message: { blocks: [{ type: "map", location: { latitude: 3.139, longitude: 101.6869 } }] },
    },
    {
      name: "media-photo2",
      rich_message: { blocks: [{ type: "photo", photo: { type: "photo", media: "https://picsum.photos/200" } }] },
    },
    {
      name: "stripe-striped-compact",
      rich_message: { blocks: [{ type: "table", is_striped: true, is_compact: true, cells: demoRows("striped+compact") }] },
    },
    {
      name: "stripe-striped-only",
      rich_message: { blocks: [{ type: "table", is_striped: true, cells: demoRows("striped") }] },
    },
    {
      name: "stripe-compact-only",
      rich_message: { blocks: [{ type: "table", is_compact: true, cells: demoRows("compact") }] },
    },
    {
      name: "stripe-plain",
      rich_message: { blocks: [{ type: "table", cells: demoRows("plain") }] },
    },
    {
      name: "details-summary-blocks",
      rich_message: {
        blocks: [
          { type: "paragraph", text: { type: "bold", text: "PROBE visible" } },
          {
            type: "details",
            summary: { type: "bold", text: "PROBE collapsed title" },
            blocks: [{ type: "paragraph", text: "PROBE hidden body" }],
          },
        ],
      },
    },
    {
      name: "details-string-summary",
      rich_message: {
        blocks: [
          {
            type: "details",
            summary: "PROBE collapsed title",
            blocks: [{ type: "paragraph", text: "PROBE hidden body" }],
          },
        ],
      },
    },
    {
      name: "details-title-field",
      rich_message: {
        blocks: [
          {
            type: "details",
            title: "PROBE collapsed title",
            blocks: [{ type: "paragraph", text: "PROBE hidden body" }],
          },
        ],
      },
    },
    {
      name: "control-divider",
      rich_message: {
        blocks: [
          { type: "paragraph", text: { type: "bold", text: "PROBE above" } },
          { type: "divider" },
          { type: "paragraph", text: { type: "bold", text: "PROBE below" } },
        ],
      },
    },
    {
      name: "table-mixed-array",
      rich_message: {
        blocks: [
          {
            type: "table",
            is_striped: true,
            is_compact: true,
            cells: [
              [{ text: { type: "bold", text: "PROBE" }, is_header: true }],
              [
                {
                  text: [
                    { type: "plain", text: "16.43 → " },
                    { type: "bold", text: "34.94" },
                    { type: "plain", text: " (+18.51)" },
                  ],
                  align: "right",
                },
              ],
            ],
          },
        ],
      },
    },
    {
      name: "table-bold-html-string",
      rich_message: {
        blocks: [
          {
            type: "table",
            is_striped: true,
            is_compact: true,
            cells: [
              [{ text: { type: "bold", text: "PROBE" }, is_header: true }],
              [{ text: "16.43 → <b>34.94</b> (+18.51)", align: "right" }],
            ],
          },
        ],
      },
    },
    {
      name: "paragraph-mixed-array",
      rich_message: {
        blocks: [
          {
            type: "paragraph",
            text: [
              { type: "plain", text: "16.43 → " },
              { type: "bold", text: "34.94" },
            ],
          },
        ],
      },
    },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const c of candidates) {
    let sent: any = null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendRichMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, rich_message: c.rich_message }),
      });
      sent = await res.json();
    } catch {
      sent = { ok: false, description: "network error" };
    }
    const entry: Record<string, unknown> = {
      name: c.name,
      ok: sent.ok === true,
      description: sent.description ?? null,
    };
    // Self-clean: delete landed probes so the topic stays clean (skip with ?keep=1).
    if (!keep && sent.ok === true && sent.result?.message_id) {
      try {
        const del = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, message_id: sent.result.message_id }),
        });
        entry.deleted = (await del.json()).ok === true;
      } catch {
        entry.deleted = false;
      }
    }
    results.push(entry);
    await new Promise((r) => setTimeout(r, 400));
  }
  return NextResponse.json({ ok: true, results });
}
