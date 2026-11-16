# 01. Sumber data dan API

Penanda kebolehpercayaan: **[diuji]** = berjaya dipanggil dalam sistem sebenar; **[skema]** = daripada skema alat TikTok for Business (Claude connector) tetapi laluan HTTP langsung belum diuji oleh penulis; **[andaian]** = perlu disahkan semasa larian pertama.

## Pengenalan pasti (ID)

| Perkara | Nilai |
|---|---|
| Kedai (TikTok Shop) | Dr Samhan, `store_id` / shop id `7495609155379170274`, kod kedai `MYLCQHLWW9`, pasaran Malaysia |
| Advertiser GMV Max | **GMV MAX VOL2** `7505228077656621057` |
| Business Center | `7420347515893071888` |
| Kempen Product GMV Max utama | **HIMCOFFEE MAIN 1** `1858977225474178` |
| Produk (item_group / SPU) kempen utama | `1729556489100298210` |
| Mata wang, zon masa | MYR, waktu Malaysia (UTC+8) |

Advertiser kedua "ADS DR SAMHAN" (`7391329013215821840`) tiada spend pada Ogos 2026 dan tidak digunakan.

## A. TikTok Marketing API (iklan)

Dalam sistem sekarang ia dipanggil melalui connector TikTok for Business (`tool_execute`). Untuk Vercel, Muse AI perlu app Marketing API sendiri dengan akses kepada advertiser di atas dan skop laporan GMV Max. Base URL **[skema]**: `https://business-api.tiktok.com/open_api/v1.3/`, header `Access-Token`. Laluan: `gmv_max/report/get/` (GET), `report/integrated/get/` (GET), `identity/get/` (GET), `gmv_max/store/list/` (GET). Sahkan dalam dokumentasi TikTok sebelum guna.

### A1. `gmv_max_report_get` (GMV Max Product dan Live) [diuji melalui connector]

Parameter wajib: `advertiser_id`, `store_ids` (maksimum 1 elemen), `start_date`, `end_date` (YYYY-MM-DD, inklusif), `metrics`, `dimensions`.

Peraturan dimensi (melanggar → ralat 40002):
- `advertiser_id`, `campaign_id`: boleh sendirian.
- `item_group_id`, `room_id`: perlu `filtering.campaign_ids`.
- `item_id`: perlu `filtering.campaign_ids` DAN `filtering.item_group_ids`.
- `stat_time_day`, `stat_time_hour`: pemecah masa, tak boleh sendirian. Dengan `stat_time_day`, julat maksimum **30 hari**. Tanpa dimensi masa, maksimum 365 hari.
- `page_size` 1 hingga 1000, `page` bermula 1. `enable_total_metrics` pilihan.
- `sort_field` / `sort_type`: pada peringkat `item_id` susunan tak boleh dipercayai; jangan bergantung padanya.
- `filtering.gmv_max_promotion_types` (`PRODUCT` atau `LIVE`) hanya sesuai pada peringkat kempen. Pada dimensi `room_id` dan `item_id` ia menyebabkan ralat 40002; guna `campaign_ids` sahaja.

Metrik utama: `cost`, `orders`, `gross_revenue`, `roi`, `net_cost`, `cost_per_order`. Gunakan `cost`, bukan `spend`. Metrik video: `product_impressions`, `product_clicks`, `ad_click_rate`, `ad_conversion_rate`, `ad_video_view_rate_2s`, `_6s`, `_p25`, `_p50`, `_p75`, `_p100`. Atribut: `title`, `tt_account_name`, `item_id`, `item_group_id`. Live: `live_views`, `10_second_live_views`, `live_follows`. Nota: `live_name` dan `live_launched_time` tak sah dalam amalan; masa mula bilik live dikira daripada `room_id` (lihat bawah). `live_unique_views` tak sah. `roi` ialah 0.00 bila cost 0 (bukan nisbah sebenar). Baris tidak menghantar = semua sifar ("tidak menghantar", bukan "prestasi buruk").

Resipi yang digunakan:

| Dataset | Panggilan |
|---|---|
| `daily_product_campaigns` | `dimensions [campaign_id, stat_time_day]`, `filtering.gmv_max_promotion_types [PRODUCT]`, metrik `cost, orders, gross_revenue`, tetingkap 30 hari |
| `daily_live_campaigns` | sama, `[LIVE]` |
| `daily_videos`, `daily_video_ads` | `dimensions [item_id, stat_time_day]`, `filtering.campaign_ids [1858977225474178]`, `filtering.item_group_ids [1729556489100298210]`, metrik `cost, orders, gross_revenue, product_impressions, product_clicks, ad_conversion_rate, ad_video_view_rate_2s, ad_video_view_rate_p25`; `page_size 1000`; tetingkap 30 hari; kira-kira 36 halaman untuk Ogos hingga 26 Okt. `daily_videos` = baris yang ada jualan; `daily_video_ads` = baris yang ada paparan, klik atau order |
| `live_rooms` | `dimensions [room_id, stat_time_day]` dengan `filtering.campaign_ids` = semua kempen Live aktif; jumlahkan setiap bilik merentas hari; simpan bilik yang `orders > 0`; metrik `cost, orders, gross_revenue, live_views, live_follows` |
| Retention video (untuk insight) | `dimensions [item_id]` tanpa masa, `campaign_ids` + `item_group_ids`, metrik `ad_video_view_rate_2s/_p25/_p50/_p75/_p100`, `product_impressions`; kira-kira 31 halaman × 1000 baris; tak boleh disusun |

**Tarikh bilik live dan video:** TikTok ID mengandungi masa: `unix_saat = id >> 32` (tambah 8 jam untuk waktu Malaysia). Digunakan untuk bilik live (`room_id`) dan, di tab Product, untuk tarikh post video. Lihat `docs/05-posted-time.md`.

**Data hari terakhir membesar** selepas tarikan pertama (contoh: GMV MAIN 1 untuk 25 Okt naik RM3.2k kepada RM5.6k). Sentiasa tarik semula hari terakhir yang disimpan.

### A2. `report_integrated_get` (Ads Manager) [diuji melalui connector]

Untuk tab TikTok Ads Manager sahaja. **Ia tidak mengandungi GMV Max** dan tiada jualan (Ads Manager di sini ukur tontonan, klik, penglibatan).

- `report_type BASIC`, `data_level AUCTION_CAMPAIGN`, `dimensions [campaign_id, stat_time_day]` (tepat satu dimensi ID), julat maksimum 30 hari dengan `stat_time_day`.
- Metrik: `spend, impressions, clicks, video_play_actions, video_views_p25, video_views_p100, engaged_view, likes, shares, follows`, serta atribut `campaign_name`, `objective_type`. Nama kempen bukan dimensi: minta dalam `metrics`.
- `filtering` ialah SENARAI objek `{field_name, filter_type, filter_value}`; `filter_value` ialah string JSON untuk `IN`.
- Dalam output connector, baris tiada `campaign_id`, jadi sistem sekarang memadankan hari/spend/impression dengan data tersimpan untuk memberi nama dan "jenis" kempen. Jika Muse AI minta `campaign_id` dalam hasil (ia dimensi), masalah itu tak wujud.
- Nama kempen dinormalkan: buang paip dan tarikh. Nama sebenar ialah teks dalam `[...]` untuk kempen live/product.

### A3. `identity_get` [diuji]

Senarai identiti (akaun TikTok yang diberi kebenaran pada advertiser): `identity_type BC_AUTH_TT`, `identity_authorized_bc_id 7420347515893071888`. Digunakan untuk menyemak akaun, bukan untuk metrik video. Ia **bukan** definisi "akaun terpaut" Seller Center.

## B. TikTok Shop Open API (Seller Center, organik) [diuji]

Hos: `https://open-api.tiktokglobalshop.com`. Pengesahan dan tandatangan: `docs/02-auth-and-network.md`. Semua pada versi `202509`.

| Endpoint | Guna |
|---|---|
| `GET /authorization/202309/shops` | Dapatkan `shop_cipher` (diperlukan pada panggilan analitik) |
| `GET /analytics/202509/shop_videos/performance` | Prestasi video, SENARAI. Parameter: `shop_cipher`, `start_date_ge`, `end_date_lt` (hujung eksklusif), `page_size` (100), `sort_field` (`views` atau `gmv`), halaman. Medan hasil: **views, click_through_rate, gmv, gpm, sku_orders, items_sold, avg_customers** untuk mana-mana hari, termasuk hari tanpa jualan. Kira-kira 2,000 video sehari. Termasuk video akaun sendiri dan affiliate |
| `GET /analytics/202509/shop_videos/{id}/products/performance` | `product_impressions` dan `product_clicks` untuk SATU video dalam satu julat (panggilan harian berfungsi). Kira-kira 3 saat setiap panggilan |
| `GET /analytics/202509/shop_videos/overview_performance` | Jumlah kedai harian (impression dan klik produk seluruh kedai) |
| `GET /analytics/202509/shop_videos/{id}/performance` | **Sentiasa 429** (had kadar kongsi app). Jangan bergantung |

Fakta penting:
- **Tiada medan impression video (FYP/For You) dalam mana-mana endpoint.** Yang ada ialah impression PRODUK (kad produk dalam video dipaparkan); nilainya kira-kira 87.5% daripada tontonan.
- `latest_available_date` biasanya 1 hingga 2 hari di belakang tarikh sebenar. Impression produk untuk hari terkini sering belum ada.
- Cara tarik yang digunakan untuk `organic_daily`: ikut hari, susun `views` DESC, berhenti bila halaman mempunyai kurang daripada 100 tontonan; tambah halaman susunan `gmv` supaya video jualan dengan tontonan rendah tak terlepas. Simpan baris dengan tontonan ≥100 sehari ATAU ada GMV. Untuk `imp`/`clicks`: panggil `products/performance` bagi video-hari dengan ≥10,000 tontonan atau ada jualan (kira-kira 65% daripada semua tontonan).
- Medan metadata video (`organic_meta`): `username`, `title`, `post_time`, `duration`, `hashtags`, `products`. Sumber medan ini dalam respons: **[andaian]**, sahkan nama medan semasa larian pertama.
- Bentuk respons tepat (nama kunci senarai, nama `page_token`) tidak disimpan dalam dokumen ini; sahkan dengan larian pertama atau dokumentasi Partner Center.

## C. Halaman video TikTok (cover dan skrip) [diuji]

`https://www.tiktok.com/@_/video/<id>` memulangkan HTML dengan JSON yang ada `cover`, `duration` dan `subtitleInfos` (WebVTT).
- Subtitle kebanyakannya terjemahan mesin TikTok ke Inggeris (`Source: MT`): 317 daripada 745 video pernah dicuba ada subtitle.
- `playAddr` kosong: **fail video tak boleh dimuat turun**, jadi visual (potongan, teks atas skrin, ekspresi) tak boleh dianalisis oleh sistem ini.
- oEmbed tiada `thumbnail_url` lagi. Imej cover di hos `*.tiktokcdn-us.com` / `*.tiktokcdn.com`.
- Pihak ketiga yang mengikis halaman tiktok.com mungkin disekat atau melanggar terma. Pertimbangkan sebelum guna dalam pengeluaran.
