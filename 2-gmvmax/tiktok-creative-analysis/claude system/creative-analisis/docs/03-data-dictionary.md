# 03. Kamus data

Fail JSON dalam `data/` ialah salinan 4 Nov 2026 (data hingga 3 Nov). Jumlah semakan: `data/MANIFEST.json`. Semua tarikh ialah `YYYY-MM-DD` waktu Malaysia. Semua `*_id` ialah **string** (ID TikTok melebihi 2^53; jangan parse sebagai nombor JavaScript).

Kunci unik cadangan ditulis di bawah; `db/schema.sql` menggunakannya.

## Iklan (Marketing API)

### daily_videos (1,709 baris) — kunci `(item_id, date)`
Product GMV Max, kempen HIMCOFFEE MAIN 1, **hari yang ada jualan sahaja**.
`gmv` (RM, kasar), `orders`, `cost` (RM), `impressions` (paparan produk), `clicks` (klik produk), `cvr` (%), `v2s` (% tonton 2s), `p25` (% tonton 25%).
Catatan: `cvr` ialah kadar "conversion" GMV Max, bukan order SKU ÷ klik.

### daily_video_ads (24,541 baris) — kunci `(item_id, date)`
Sama seperti atas tetapi termasuk hari tanpa jualan (ada paparan, klik atau order). GMV dan order **sama** dengan `daily_videos` (RM222,028.97 / 2,396); kos lebih tinggi (RM32,712). Gunakan ini untuk semua kadar supaya tak berat sebelah ke hari menjual. `cvr` = 0 pada hari tanpa jualan (sambungan daripada daily_videos).
Kelemahan: ~119 baris kecil 29 Sep hilang dalam sistem sekarang (jumlah GMV tetap sama).

### daily_product_campaigns (331) / daily_live_campaigns (824) — kunci `(date, campaign_name)`
`cost`, `orders`, `gmv`. Nama kempen = teks dalam `[...]`.

### daily_ads (1,275) — kunci `(date, campaign_name)`
Ads Manager: `jenis` (Affiliate dsb., ditetapkan manual), `objective`, `spend`, `impressions`, `clicks`, `plays`, `p25`, `p100`, `engaged`, `likes`, `shares`, `follows`. Tiada jualan.

### live_rooms (1,485) — kunci `room_id`
`started` (daripada `room_id >> 32`, +8j), `date`, `gmv`, `orders`, `cost`, `views`, `follows`. Hanya bilik dengan `orders > 0`. Pautan terus ke sesi live tiada.

### ads_videos (8)
Video boost Ogos yang boleh dipadankan. Dataset kecil dan lemah; boleh diabaikan oleh Muse AI.

## Organik (Shop API)

### organic_daily (31,849) — kunci `(video_id, date)`
`views`, `ctr`, `gmv`*, `sku_orders`*, `imp` (impression PRODUK, bukan FYP)*, `clicks`*. (* medan hanya ada bila relevan: `gmv`/`sku_orders` bila ada jualan; `imp`/`clicks` untuk video-hari ≥10,000 tontonan atau ada jualan.) Simpan baris tontonan ≥100 ATAU ada GMV. Hari terkini sering belum ada `imp`.
Jumlah: GMV RM238,495.19; tontonan 90,486,380; order SKU 2,746.

### organic_meta (6,586) — kunci `video_id`
`username`, `title` (caption), `post_time` (**daripada API**, lihat `05-posted-time.md`), `duration` (saat), `hashtags`, `products`.

## Analisis

### video_meta (617) — kunci `item_id`
Video dalam Product GMV Max. `akaun`, `caption`/`caption_full`, `hook`, `angle` (auto-tag daripada caption), `posted` (**daripada ID**, bukan API), `age` (hari), `link` (embed), `evergreen`, `eg_tier` (`kuat` = layak ketiga-tiga bulan; lihat 04), `eg_reason` (BM/EN), `o_aug`/`o_sep`/`o_okt` (order bulanan).
Baris tiada untuk video baru (tagging tak dijalankan semula).

### video_insight (810) — kunci `id`
Bullet teks dwibahasa: `h` (hook), `s` (stay), `w` (kenapa boleh menang). Setiap bullet ialah `[BM, EN]`. Dijana daripada retention iklan + subtitle + caption (lihat 04). Kod penjana tak disimpan.

## Pemetaan ID

| Padanan | Cara |
|---|---|
| `item_id` (Marketing API) = `video_id` (Shop API) | ID video TikTok yang sama (string) |
| ID → masa | `unix_saat = id >> 32` (BigInt) |
