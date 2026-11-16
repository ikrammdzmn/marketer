# 02. Pengesahan, token, tandatangan dan rangkaian

Tiada nilai rahsia dalam dokumen ini. Muse AI mesti mencipta app dan token sendiri.

## Cadangan utama

1. Muse AI guna **app dan kebenaran sendiri**. Jangan guna semula refresh token sistem Claude. Setiap refresh Shop API memulangkan refresh token BARU; dua sistem yang berkongsi satu token boleh saling merosakkan. Dalam ujian di sini, refresh token asal masih diterima selepas beberapa refresh, tetapi tingkah laku jangka panjang dan sama ada authorize kali kedua membatalkan token pertama **belum diuji**.
2. Hafizie (pemilik kedai) sendiri menekan Authorize dan menyalin kod. Agent tak patut diberi kata laluan.
3. Simpan `app_key`, `app_secret`, `refresh_token` dan `access_token` dalam env/secret manager Vercel dan pangkalan data, tak pernah dalam repo atau log.

## Shop API: app di Partner Center

Pengalaman sistem sekarang (untuk Muse AI menyelaraskan):
- Akaun developer: Partner Center (partner.tiktokshop.com), Console peranan App Developer (ISV), pasaran Malaysia.
- App jenis **Custom service**, kategori **Marketing / Analytics & Reporting**. Setiap kategori Custom had **3 app**; slot kategori itu sudah penuh dalam akaun Hafizie (MARKETER HW, HIM RoaS Automation, HW Creative Analytics RO). Muse AI perlu pilih kategori lain, atau Hafizie memadam app lama, atau guna akaun developer lain. Kategori tak boleh ditukar selepas dicipta.
- Skop yang diperlukan:
  - `data.shop_analytics.public.read` (TikTok Shop Analytics): semua endpoint `/analytics/...`.
  - `seller.authorization.info` (Shop Authorized Information): untuk `GET /authorization/202309/shops` (mendapat `shop_cipher`). Tanpanya, panggilan kedai gagal. Selepas menambah skop, kedai mesti di-authorize **semula**; perubahan berkuat kira-kira 5 minit kemudian.
- Status app: Beta Testing (had 25 pengguna yang diberi kebenaran). Untuk satu kedai, ini mencukupi.
- Redirect URL: sistem sekarang guna `https://localhost/callback`, jadi selepas Authorize, pelayar ke halaman yang gagal dibuka dan kod diambil daripada bar alamat (`?code=...`). Muse AI patut set redirect URL ke laluan sebenar di Vercel supaya kod ditangkap automatik.
- **Rahsia app yang baru dicipta** boleh mengambil sehingga 10 minit untuk aktif.
- Partner Center ada ciri **IP allowlist**: jika dihidupkan, panggilan dari IP Vercel (yang berubah) boleh ditolak. Biarkan ia mati atau guna IP statik.

## Aliran token Shop API [diuji]

1. **Tukar kod kepada token** (sekali, kod luput cepat dan sekali guna):
   `GET https://auth.tiktok-shops.com/api/v2/token/get?app_key=...&app_secret=...&auth_code=<kod>&grant_type=authorized_code`
2. **Refresh** (access token sah 7 hari; refresh token tempoh sangat panjang, kira-kira 100 tahun):
   `GET https://auth.tiktok-shops.com/api/v2/token/refresh?app_key=...&app_secret=...&refresh_token=...&grant_type=refresh_token`
   Respons menyertakan access token baru dan refresh token baru. **Simpan refresh token baru dalam pangkalan data setiap kali.**
3. Gunakan `access_token` pada header `x-tts-access-token` (bukan dalam query, dan bukan sebahagian tandatangan).
4. `GET /authorization/202309/shops` dengan tandatangan mengembalikan senarai kedai dan `cipher` (`shop_cipher`). Satu kedai di sini.

## Tandatangan permintaan Shop API [diuji dalam sistem sebenar]

`sign = HMAC-SHA256( key = app_secret, message = app_secret + path + (semua parameter query disusun mengikut kunci, setiap satu digabung sebagai kunci+nilai, TANPA `sign` dan `access_token`) + (body, jika ada) + app_secret )`, dalam hex huruf kecil.

- Semua panggilan analitik ialah GET tanpa body.
- Parameter wajib dalam query: `app_key`, `timestamp` (saat unix), `shop_cipher` (untuk panggilan kedai), `sign`, serta parameter endpoint.
- `scripts/ttshop.mjs` melaksanakan ini. `scripts/test-sign.mjs` menyemak konsistensi dalaman (bukan pengesahan oleh TikTok).
- Jam pelayan yang tersasar boleh menyebabkan `timestamp` ditolak.

## Marketing API (iklan)

- Memerlukan app di TikTok for Business Developer Portal dengan akses kepada advertiser `7505228077656621057` dan skop laporan GMV Max. Kelulusan app boleh mengambil masa.
- Token akses OAuth untuk advertiser; header `Access-Token`.
- Sistem sekarang tak menyimpan token ini: ia melalui connector yang diurus oleh Claude atas kebenaran Hafizie. Muse AI tidak boleh mewarisi connector itu.

## Rangkaian (domain yang mesti dibenarkan)

| Domain | Untuk |
|---|---|
| `open-api.tiktokglobalshop.com` | Shop API (analitik, kedai) |
| `auth.tiktok-shops.com` | Token Shop API |
| `business-api.tiktok.com` | Marketing API |
| `www.tiktok.com` | Halaman video (cover, subtitle, embed) |
| `*.tiktokcdn.com`, `*.tiktokcdn-us.com` | Imej cover |

Dalam persekitaran Claude, domain ini mesti dibenarkan dalam tetapan rangkaian persekitaran awan; secara lalai sebahagian disekat (ralat proksi 403). Vercel tiada sekatan seperti itu. Jangan simpan rahsia dalam kod halaman: embed iframe `https://www.tiktok.com/embed/v2/<id>` tidak perlukan token.

## Kebolehpercayaan: perkara yang tak diketahui

- Tingkah laku refresh token berputar dalam jangka panjang (berapa lama token asal terus sah).
- Had kadar tepat; `shop_videos/{id}/performance` sentiasa 429 kerana had kongsi.
- Sama ada app baru dalam kategori lain mendapat skop Analytics tanpa semakan tambahan.
