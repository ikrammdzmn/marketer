// Semakan konsistensi dalaman sahaja: bukan pengesahan oleh TikTok.
// Bandingkan dengan pelaksanaan bebas Python: python3 test-sign.py
import { sign } from './ttshop.mjs';
const q = { app_key: 'KEY123', timestamp: '1730000000', shop_cipher: 'CIPHER', sign: 'abaikan', access_token: 'abaikan', page_size: '100', start_date_ge: '2026-11-01' };
console.log(sign('/analytics/202509/shop_videos/performance', q, 'SECRET456'));
