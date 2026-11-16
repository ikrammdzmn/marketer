# 06. Prosedur kemas kini harian (versi pangkalan data)

Jalankan sekali sehari melalui Vercel Cron (cadangan 09:00 MYT = 01:00 UTC). Setiap langkah mesti idempoten (upsert pada kunci unik, `db/schema.sql`).

Fungsi Vercel ada had masa. Pecahkan kepada beberapa laluan cron/queue (ads, organik, impression) dan simpan kemajuan dalam jadual `job_state`. Impression produk Seller Center ialah yang paling lambat (~3-10 s sepanggilan; 94 panggilan pernah ambil 15 minit): proses dalam kelompok kecil merentas beberapa larian.

## 1. Token Shop API
Dalam satu transaksi dengan kunci baris (`SELECT ... FOR UPDATE` pada `oauth_token`): jika access token luput dalam <1 hari, panggil refresh, **simpan refresh token baru**, commit. Hanya satu penulis.

## 2. Ads (Marketing API)
Tarik semula dari **hari terakhir yang disimpan** (bukan hari berikutnya) hingga semalam; hari terakhir membesar selepas tarikan pertama. Tetingkap maksimum 30 hari dengan `stat_time_day`.
1. `daily_product_campaigns` / `daily_live_campaigns`: resipi `01` bahagian A1.
2. `daily_videos` + `daily_video_ads`: dimensi `item_id, stat_time_day`; paginasi sehingga halaman terakhir; **simpan halaman terakhir yang kecil juga** (sistem lama pernah kehilangannya). `daily_videos` = baris dengan jualan. Semak GMV `daily_videos` = GMV `daily_video_ads`.
3. `live_rooms`: dimensi `room_id, stat_time_day` untuk 3 hari terakhir, kempen live aktif; jumlah per bilik; simpan `orders > 0`; ganti hanya bilik yang `started >= tarikh mula tarikan semula`.
4. `daily_ads` (Ads Manager): dimensi `campaign_id, stat_time_day`; nama kempen dinormalkan (buang pipe dan tarikh); kempen baharu perlu `jenis` (tetapkan manual, lalai `Lain`).
5. Retention (untuk insight): `item_id` tanpa masa, mingguan sahaja (~31 halaman × 1000).

## 3. Organik (Shop API)
Dari `latest_available_date` (1-2 hari di belakang), tarik semula 2 hari terakhir:
1. `shop_videos/performance` ikut hari; susun `views` DESC, berhenti bila halaman <100 tontonan; tambah halaman susunan `gmv`. Simpan tontonan ≥100 ATAU ada GMV. Retry dengan backoff pada 429.
2. Impression/klik: `products/performance` untuk video-hari ≥10,000 tontonan atau ada jualan; jika tiada (hari terkini), tanda `imp IS NULL` dan isi pada larian seterusnya.
3. Metadata `organic_meta` untuk video baru.

## 4. Cover & subtitle (video baru)
Ambil `https://www.tiktok.com/@_/video/<id>`; keluarkan `cover` dan `subtitleInfos`. Simpan imej cover ke storan sendiri (URL CDN TikTok luput). Pertimbang terma TikTok sebelum guna dalam pengeluaran.

## 5. Kira semula
Label, ranking, Evergreen: kira dalam kueri/paparan, bukan disimpan (kecuali `video_insight`).

## 6. Semakan selepas larian
- GMV `daily_videos` = GMV `daily_video_ads`.
- Bilangan baris tidak menurun.
- Tiada token ditolak (HTTP 401 / kod token). Jika refresh ditolak, makluman kepada pemilik untuk authorize semula.
