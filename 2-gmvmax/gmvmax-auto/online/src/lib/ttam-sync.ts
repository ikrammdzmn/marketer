import { query } from "./db";
import { getAdsCredentials } from "./ads-credentials";
import { SHOPS } from "./shops";
import { fetchManualSpend, TTAM_METRICS } from "./gmv";

// TTAM campaign cache writer (shop 1 only). Day grain, refreshed hourly:
// each fetch rewrites the date's rows (rewrite-on-revise). Raw metrics only;
// scores stay computed on read via ttam-scores.ts (pure, client-safe).
// Adgroup/ad grains stay on-demand live, never cron.
export async function syncTtamDaily(shopNumber: string, date: string) {
  const shop = SHOPS[shopNumber];
  if (!shop) throw new Error(`invalid shopNumber: ${shopNumber}`);
  if (shopNumber !== "1") throw new Error("ttam sync is shop-1-only");
  const creds = await getAdsCredentials(shop.advertiserId);
  if (!creds) throw new Error(`no access token for advertiser ${shop.advertiserId}`);

  // Single-day pull: per-campaign sums for this date (GMV campaigns excluded).
  const r = await fetchManualSpend(creds.access_token, shop.advertiserId, date, date);
  const full = r.rows.every((row) => row.metrics !== null);
  const pending = r.rows.map((row) => {
    const m = row.metrics ?? Object.fromEntries(
      TTAM_METRICS.map((k) => [k, k === "spend" ? row.spend : 0])
    );
    return { id: row.campaign_id, m };
  });

  // Batched multi-row upsert (Hobby 60s cap: hundreds of sequential
  // queries time out; chunks of 500 run in seconds).
  let stored = 0;
  const BATCH = 500;
  const cols = ["shop_id", "campaign_id", "date", ...TTAM_METRICS, "full_metrics"];
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const vals: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((e, j) => {
      const o = j * cols.length;
      vals.push(
        `($${o + 1},$${o + 2},$${o + 3}::date` +
        TTAM_METRICS.map((_, k) => `,$${o + 4 + k}`).join("") +
        `,$${o + 4 + TTAM_METRICS.length})`
      );
      params.push(
        shop.shopId, e.id, date,
        ...TTAM_METRICS.map((k) => Number(e.m[k] ?? 0)),
        full
      );
    });
    await query(
      `INSERT INTO gmv.ttam_hourly_campaign (${cols.join(", ")})
       VALUES ${vals.join(",")}
       ON CONFLICT (shop_id, campaign_id, date) DO UPDATE SET
         spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
         clicks = EXCLUDED.clicks, reach = EXCLUDED.reach,
         engaged_view = EXCLUDED.engaged_view,
         video_watched_6s = EXCLUDED.video_watched_6s,
         average_video_play = EXCLUDED.average_video_play,
         likes = EXCLUDED.likes, comments = EXCLUDED.comments,
         shares = EXCLUDED.shares, follows = EXCLUDED.follows,
         profile_visits = EXCLUDED.profile_visits,
         live_views = EXCLUDED.live_views,
         live_effective_views = EXCLUDED.live_effective_views,
         full_metrics = EXCLUDED.full_metrics, pulled_at = now()`,
      params
    );
    stored += chunk.length;
  }

  return {
    shop: shop.name, date,
    campaigns: r.rows.length, full, stored,
    pulledAt: new Date().toISOString(),
  };
}
