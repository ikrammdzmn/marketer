import { NextResponse } from "next/server";
import { syncHourly } from "@/lib/hourly";
import { sendDirect } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// POST /api/tg-webhook — Telegram bot webhook (set once via setWebhook with
// secret_token = CRON_SECRET). Commands: /fetch — runs the hourly sync now
// and posts the 2 tables to the configured group. Replies in the topic the
// command came from.
export async function POST(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let update: any = null;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "bad update" }, { status: 400 });
  }
  const msg = update.message ?? update.channel_post ?? null;
  const text: string = msg?.text ?? "";
  if (!/^\/fetch(@\w+)?(\s|$)/.test(text.trim())) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const chatId = msg.chat?.id;
  const threadId: number | null =
    typeof msg.message_thread_id === "number" ? msg.message_thread_id : null;
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  if (chatId !== undefined) {
    await sendDirect(chatId, threadId ?? null, "⏳ fetching latest hour…");
  }
  try {
    const r = await syncHourly("1", date);
    return NextResponse.json({ ok: true, slot: r.slot, stored: r.stored, telegram: r.telegram });
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    if (chatId !== undefined) {
      await sendDirect(chatId, threadId ?? null, `fetch failed: ${message}`);
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
