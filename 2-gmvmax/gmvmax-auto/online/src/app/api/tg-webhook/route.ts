import { NextResponse } from "next/server";
import { syncHourly } from "@/lib/hourly";
import { syncDailyToday } from "@/lib/daily";
import { sendDirect, answerCallback, sendPhotoDirect } from "@/lib/telegram";
import { query } from "@/lib/db";
import { SHOPS } from "@/lib/shops";

export const dynamic = "force-dynamic";

const cleanEnv = (v: string | undefined) =>
  (v ?? "").trim().replace(/^["']|["']$/g, "");

// POST /api/tg-webhook — Telegram bot webhook (set once via setWebhook with
// secret_token = CRON_SECRET). Commands: /start = system status (alive, DB,
// latest hourly/daily freshness), /fetch = today-so-far daily totals
// (ties dashboard), /fetch_hourly = latest hour slice. Unknown /commands get
// a hint reply; non-command chatter stays ignored. Chart buttons
// (callback_data "chart:<campaign_id>") reply with an inline trend photo.
// Replies in the topic the command came from.
// Status builder for /start: each check degrades independently so the
// status reply itself never goes silent. No secret values ever leave here.
async function buildStatusLines(): Promise<string[]> {
  const lines: string[] = [];
  const nowMYT = new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
  lines.push(`alive · ${nowMYT} MYT`);
  try {
    await query(`SELECT 1`);
    lines.push(`db: ok`);
  } catch (e) {
    lines.push(`db: UNREACHABLE (${e instanceof Error ? e.message.slice(0, 80) : "error"})`);
    return lines;
  }
  try {
    const h = await query(
      `SELECT MAX(hour_slot) AS slot FROM gmv.hourly_campaign_metrics WHERE shop_id = $1`,
      [SHOPS["1"].shopId]
    );
    const slot = h.rows[0]?.slot ?? null;
    lines.push(`hourly: ${slot ?? "no rows yet"}`);
  } catch (e) {
    lines.push(`hourly: check failed (${e instanceof Error ? e.message.slice(0, 60) : "error"})`);
  }
  try {
    const d = await query(
      `SELECT MAX(date) AS day FROM gmv.daily_shop_metrics WHERE shop_number = $1`,
      ["1"]
    );
    const rawDay = d.rows[0]?.day ?? null;
    let day = "no rows yet";
    if (rawDay !== null && rawDay !== undefined) {
      try {
        day = new Date(rawDay).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
      } catch {
        day = String(rawDay);
      }
    }
    lines.push(`daily: ${day}`);
  } catch (e) {
    lines.push(`daily: check failed (${e instanceof Error ? e.message.slice(0, 60) : "error"})`);
  }
  return lines;
}

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
  // Chart-button taps (shop 1, today MYT): post the campaign's hour trend inline.
  const cb = update.callback_query ?? null;
  if (cb && typeof cb.data === "string" && cb.data.startsWith("chart:")) {
    const campaignId = cb.data.slice("chart:".length);
    const chatId = cb.message?.chat?.id;
    const threadId: number | null =
      typeof cb.message?.message_thread_id === "number" ? cb.message.message_thread_id : null;
    try {
      const shop = SHOPS["1"];
      const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
      const meta = await query(`SELECT name FROM gmv.gmv_campaigns WHERE campaign_id = $1`, [campaignId]);
      const s = await query(
        `SELECT hour_slot, cost::float AS c, gmv::float AS g
         FROM gmv.hourly_campaign_metrics
         WHERE shop_id = $1 AND campaign_id = $2 AND hour_slot LIKE $3
         ORDER BY 1 LIMIT 24`,
        [shop.shopId, campaignId, `${date}%`]
      );
      if (s.rows.length === 0) {
        await answerCallback(cb.id, "no data today");
        return NextResponse.json({ ok: false, error: "no rows" });
      }
      const cfg = {
        type: "line",
        data: {
          labels: s.rows.map((r) => String(r.hour_slot).slice(11, 16)),
          datasets: [
            { label: "cost", data: s.rows.map((r) => Number(r.c)) },
            { label: "gmv", data: s.rows.map((r) => Number(r.g)) },
          ],
        },
      };
      const url = "https://quickchart.io/chart?c=" + encodeURIComponent(JSON.stringify(cfg));
      await answerCallback(cb.id);
      const name = meta.rows[0]?.name ?? campaignId;
      const ok = chatId !== undefined
        ? await sendPhotoDirect(chatId, threadId, url, `${String(name).slice(0, 60)} · ${date}`)
        : false;
      return NextResponse.json({ ok, chart: campaignId });
    } catch (e) {
      await answerCallback(cb.id, "chart failed");
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "chart failed" });
    }
  }
  const msg = update.message ?? update.channel_post ?? null;
  const text: string = msg?.text ?? "";
  const clean = text.trim();
  const chatId = msg.chat?.id;
  const threadId: number | null =
    typeof msg.message_thread_id === "number" ? msg.message_thread_id : null;
  const isHourly = /^\/fetch_hourly(@\w+)?(\s|$)/.test(clean);
  const isDaily = /^\/fetch(@\w+)?(\s|$)/.test(clean);
  const isStart = /^\/start(@\w+)?(\s|$)/.test(clean);
  if (isStart) {
    try {
      const lines = await buildStatusLines();
      const text = [
        `GMV status (shop 1 ${SHOPS["1"].name})`,
        ...lines,
        ``,
        `/fetch = today · /fetch_hourly = latest hour`,
      ].join("\n");
      if (chatId !== undefined) {
        await sendDirect(chatId, threadId ?? null, text);
      }
      return NextResponse.json({ ok: true, cmd: "start" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "status failed";
      if (chatId !== undefined) {
        await sendDirect(chatId, threadId ?? null, `status failed: ${message}`);
      }
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }
  if (!isHourly && !isDaily) {
    if (clean.startsWith("/") && chatId !== undefined) {
      await sendDirect(chatId, threadId ?? null, `unknown command — try /start, /fetch, /fetch_hourly`);
    }
    return NextResponse.json({ ok: true, ignored: true });
  }
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  if (chatId !== undefined) {
    await sendDirect(chatId, threadId ?? null, isHourly ? "⏳ fetching latest hour…" : "⏳ fetching today…");
  }
  try {
    if (isHourly) {
      const r = await syncHourly("1", date);
      return NextResponse.json({ ok: true, cmd: "hourly", slot: r.slot, stored: r.stored, telegram: r.telegram });
    }
    const r = await syncDailyToday("1", date);
    return NextResponse.json({ ok: true, cmd: "today", date: r.date, live: r.live, product: r.product, telegram: r.telegram });
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch failed";
    if (chatId !== undefined) {
      await sendDirect(chatId, threadId ?? null, `fetch failed: ${message}`);
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
