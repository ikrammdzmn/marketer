// Klien rujukan Marketing API (TikTok for Business). STATUS: laluan/parameter daripada skema connector, belum diuji secara langsung.
// Env: TT_ACCESS_TOKEN (token advertiser). Jangan log.
const BASE = 'https://business-api.tiktok.com/open_api/v1.3';
async function get(path, params) {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  const j = await (await fetch(u, { headers: { 'Access-Token': process.env.TT_ACCESS_TOKEN } })).json();
  if (j.code !== 0) throw new Error(`TikTok ${j.code}: ${j.message}`);
  return j.data;
}
export const ADV = '7505228077656621057', STORE = '7495609155379170274';

// Semua halaman; PASTIKAN halaman terakhir (kecil) turut disimpan.
export async function* gmvMaxReport({ start, end, dimensions, metrics, filtering, pageSize = 1000 }) {
  for (let page = 1; ; page++) {
    const d = await get('/gmv_max/report/get/', {
      advertiser_id: ADV, store_ids: [STORE], start_date: start, end_date: end,
      dimensions, metrics, ...(filtering ? { filtering } : {}), page, page_size: pageSize });
    yield* d.list;
    if (page >= (d.page_info?.total_page ?? 1)) return;   // andaian: nama medan page_info
  }
}
export const videoDays = (start, end) => gmvMaxReport({ start, end, dimensions: ['item_id', 'stat_time_day'],
  metrics: ['cost','orders','gross_revenue','product_impressions','product_clicks','ad_conversion_rate','ad_video_view_rate_2s','ad_video_view_rate_p25'],
  filtering: { campaign_ids: ['1858977225474178'], item_group_ids: ['1729556489100298210'] } }); // maks 30 hari/tetingkap
