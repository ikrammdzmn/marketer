import { getShopReport } from "./gmv";
import { sendTelegramFull } from "./telegram";
import { EMOJI } from "./hourly";

const MAX = 3900; // under Telegram's 4096 cap (same as hourly)

// Daily today-so-far (shop 1 only): stat_time_day for `date`, ALL campaigns
// (ties dashboard penny-for-penny — no ON-filter, unlike hourly).
// GMV-only (no TTAM manual spend) to stay under Hobby 60s.
export async function syncDailyToday(shopNumber: string, date: string) {
  if (shopNumber !== "1") throw new Error("daily today is shop-1-only");
  const live = await getShopReport(shopNumber, "LIVE_GMV_MAX", date, date);
  const product = await getShopReport(shopNumber, "PRODUCT_GMV_MAX", date, date);

  const pulledMYT = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headLine = `${date} today so far · pulled ${pulledMYT} MYT`;

  const summarize = (
    title: string,
    r: { cost: number; gmv: number; orderCount: number; accounts: Array<{ name: string; cost: number; gmv: number; orders: number }> }
  ) => {
    const head =
      `<b>${title}</b>\n${headLine}\n` +
      `Total cost ${r.cost.toFixed(2)} | gmv ${r.gmv.toFixed(2)} | ord ${r.orderCount}\n`;
    const lines = r.accounts.map(
      (a) =>
        `<code>${esc(a.name.slice(0, 34))}</code>\n` +
        `cost ${a.cost.toFixed(2)} | gmv ${a.gmv.toFixed(2)} | ord ${a.orders}`
    );
    let text = head + (lines.join("\n") || "<i>no spend today</i>");
    text += `\n<i>hour slice → /fetch_hourly</i>`;
    if (text.length > MAX) {
      const kept: string[] = [];
      for (const ln of lines) {
        if ((head + kept.join("\n") + "\n" + ln).length > MAX) break;
        kept.push(ln);
      }
      text =
        head +
        kept.join("\n") +
        `\n<i>…and ${lines.length - kept.length} more (dashboard)</i>` +
        `\n<i>hour slice → /fetch_hourly</i>`;
    }
    return text;
  };

  const buildBlocks = (
    title: string,
    r: { cost: number; gmv: number; orderCount: number; accounts: Array<{ name: string; cost: number; gmv: number; orders: number }> }
  ) => {
    const rich = (s: string) => ({ type: "bold", text: s });
    const cell = (s: string, header = false, right = false) => ({
      ...(header ? { is_header: true } : {}),
      ...(right ? { align: "right" } : {}),
      text: rich(s),
    });
    return [
      { type: "paragraph", text: rich(title) },
      {
        type: "paragraph",
        text:
          `${headLine}\n` +
          `Total cost ${r.cost.toFixed(2)} | gmv ${r.gmv.toFixed(2)} | ord ${r.orderCount}`,
      },
      {
        type: "table",
        is_striped: true,
        is_compact: true,
        cells: [
          [cell("Account", true), cell("Cost", true, true), cell("GMV", true, true), cell("Ord", true, true)],
          ...r.accounts
            .slice(0, 40)
            .map((a) => [
              cell(a.name.slice(0, 28)),
              cell(a.cost.toFixed(2), false, true),
              cell(a.gmv.toFixed(2), false, true),
              cell(String(a.orders), false, true),
            ]),
        ],
      },
      { type: "paragraph", text: rich("hour slice → /fetch_hourly") },
    ];
  };

  const t1 = summarize(`${EMOJI.live} LIVE GMV Max (shop 1)`, live);
  const t2 = summarize(`${EMOJI.product} Product GMV Max (shop 1)`, product);
  const r1 = await sendTelegramFull(
    t1,
    true,
    buildBlocks(`${EMOJI.live} LIVE GMV Max (shop 1)`, live)
  );
  const r2 = await sendTelegramFull(
    t2,
    true,
    buildBlocks(`${EMOJI.product} Product GMV Max (shop 1)`, product)
  );
  const telegram =
    r1.ok && r2.ok
      ? `${r1.mode}+${r2.mode}`
      : `failed live=${r1.mode}:${r1.error ?? "?"} prod=${r2.mode}:${r2.error ?? "?"}`;

  return {
    shop: live.shopName,
    date,
    live: { cost: live.cost, gmv: live.gmv, orders: live.orderCount },
    product: { cost: product.cost, gmv: product.gmv, orders: product.orderCount },
    pulledAt: new Date().toISOString(),
    telegram,
  };
}
