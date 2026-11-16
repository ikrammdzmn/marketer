// Klien rujukan TikTok Shop Open API. Tiada rahsia di sini: baca daripada env.
// STATUS: tandatangan dan aliran token diuji dalam sistem lain; skrip INI belum dijalankan terhadap API sebenar.
import crypto from 'node:crypto';

const API = 'https://open-api.tiktokglobalshop.com';
const AUTH = 'https://auth.tiktok-shops.com';

export function sign(path, query, appSecret, body = '') {
  const keys = Object.keys(query).filter(k => k !== 'sign' && k !== 'access_token').sort();
  const joined = keys.map(k => k + query[k]).join('');
  const msg = appSecret + path + joined + body + appSecret;
  return crypto.createHmac('sha256', appSecret).update(msg).digest('hex');
}

export async function exchangeCode({ appKey, appSecret, code }) {
  const u = new URL(AUTH + '/api/v2/token/get');
  u.search = new URLSearchParams({ app_key: appKey, app_secret: appSecret, auth_code: code, grant_type: 'authorized_code' });
  return (await fetch(u)).json();
}

// Panggil di dalam transaksi yang mengunci baris token; SIMPAN refresh_token baru dalam respons.
export async function refresh({ appKey, appSecret, refreshToken }) {
  const u = new URL(AUTH + '/api/v2/token/refresh');
  u.search = new URLSearchParams({ app_key: appKey, app_secret: appSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const j = await (await fetch(u)).json();
  return j; // andaian: j.data.access_token, j.data.refresh_token, j.data.access_token_expire_in
}

export async function call({ appKey, appSecret, accessToken, shopCipher, path, params = {}, retries = 4 }) {
  const query = { app_key: appKey, timestamp: String(Math.floor(Date.now() / 1000)), ...(shopCipher ? { shop_cipher: shopCipher } : {}), ...params };
  for (let i = 0; i <= retries; i++) {
    query.timestamp = String(Math.floor(Date.now() / 1000));
    query.sign = sign(path, query, appSecret);
    const u = new URL(API + path);
    u.search = new URLSearchParams(query);
    const r = await fetch(u, { headers: { 'x-tts-access-token': accessToken, 'content-type': 'application/json' } });
    if (r.status === 429 && i < retries) { await new Promise(s => setTimeout(s, 2000 * 2 ** i)); continue; }
    return r.json();
  }
}

export const shops = (c) => call({ ...c, path: '/authorization/202309/shops', shopCipher: undefined });
export const videoPerformance = (c, { start, endExclusive, sort = 'views', pageToken, pageSize = 100 }) =>
  call({ ...c, path: '/analytics/202509/shop_videos/performance',
    params: { start_date_ge: start, end_date_lt: endExclusive, sort_field: sort, page_size: String(pageSize), ...(pageToken ? { page_token: pageToken } : {}) } });
export const videoProducts = (c, id, { start, endExclusive }) =>
  call({ ...c, path: `/analytics/202509/shop_videos/${id}/products/performance`, params: { start_date_ge: start, end_date_lt: endExclusive } });
export const overview = (c, { start, endExclusive }) =>
  call({ ...c, path: '/analytics/202509/shop_videos/overview_performance', params: { start_date_ge: start, end_date_lt: endExclusive } });

// Penggunaan: SHOP_APP_KEY, SHOP_APP_SECRET, SHOP_REFRESH_TOKEN dalam env (jangan cetak).
if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === 'whoami') {
  const appKey = process.env.SHOP_APP_KEY, appSecret = process.env.SHOP_APP_SECRET;
  const t = await refresh({ appKey, appSecret, refreshToken: process.env.SHOP_REFRESH_TOKEN });
  console.log('refresh code:', t.code, t.message); // jangan cetak token
}
