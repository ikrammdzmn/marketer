# scripts/

Klien rujukan Node.js 20+ (tanpa pakej luaran). **Belum dijalankan terhadap API sebenar** oleh penyedia pakej (tiada kredensial dalam sesi). Anggap sebagai titik mula, bukan kod pengeluaran.

- `ttshop.mjs`: tandatangan, tukar kod, refresh, panggilan Shop API dengan retry 429.
- `test-sign.mjs` + `test-sign.py`: dua pelaksanaan bebas tandatangan; outputnya mesti sama. Ini hanya semak konsistensi dalaman, bukan bukti TikTok menerimanya.
- `marketing.mjs`: panggilan `gmv_max/report/get/`; nama medan paginasi ialah andaian.

Env (jangan komit): `SHOP_APP_KEY`, `SHOP_APP_SECRET`, `SHOP_REFRESH_TOKEN`, `TT_ACCESS_TOKEN`.
Tidak termasuk: skrip tarikan penuh, penanda hook/angle, penjana insight (rujuk `docs/04`, `docs/06`).
