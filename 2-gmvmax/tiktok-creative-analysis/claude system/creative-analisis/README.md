# Creative Analisis: pakej handoff untuk Muse AI

Disediakan 4 Nov 2026 untuk Hafizie (HIM Wellness / Dr Samhan, kedai HIMCoffee di TikTok Shop Malaysia).
Tujuan pakej: Muse AI membina sistem yang setara dengan dashboard Creative Analisis sekarang, diterbitkan di Vercel dengan pangkalan data sendiri.

Skop fasa ini: handoff sahaja. Dashboard Creative Analisis di Claude kekal digunakan seperti biasa dan terus dikemas kini setiap hari. Pakej ini ialah salinan pada 4 Nov 2026 (data hingga 3 Nov).

## Apa sistem ini buat

Membantu team creative tahu video mana yang menjual, mana patut di-scale, mana patut dielak, dan kenapa. Ia gabungkan:

1. **Data iklan** TikTok Marketing API: GMV Max Product (video), GMV Max Live (sesi live), Ads Manager (kempen boost).
2. **Data organik** TikTok Shop Open API: analitik video Seller Center (tontonan, CTR, GMV, order untuk semua video kedai, termasuk affiliate).
3. **Peraturan analisis**: label Winner/Baik/Sampel kecil, untung selepas ads (margin 35%), Evergreen, Top 5 pelbagai ranking, bullet analisis hook/stay.

Dashboard sekarang ada 5 tab: Product GMV Max, Live GMV Max, TikTok Ads Manager, Evergreen, Seller Center. Pemilih tarikh harian, togol BM/EN.

## Isi pakej

| Laluan | Isi |
|---|---|
| `docs/01-sources-and-api.md` | Setiap sumber data, endpoint, parameter, had dan gotcha |
| `docs/02-auth-and-network.md` | Token, tandatangan Shop API, app Partner Center, rangkaian |
| `docs/03-data-dictionary.md` | Setiap dataset: medan, maksud, kunci, kelemahan |
| `docs/04-analysis-rules.md` | Semua peraturan pengiraan dan label |
| `docs/05-posted-time.md` | **Bagaimana tarikh post setiap video diperoleh**, dua sumber dan beza di antara keduanya |
| `docs/06-refresh-procedure.md` | Cara kemas kini data harian (versi pangkalan data) |
| `docs/07-known-limits.md` | Had data dan perkara yang tak boleh dituntut |
| `db/schema.sql` | Cadangan skema PostgreSQL |
| `scripts/` | Klien rujukan Node.js (Shop API: tandatangan, refresh, panggilan; Marketing API) |
| `data/` | 11 dataset JSON semasa dan `MANIFEST.json` (bilangan baris, jumlah semakan) |

Tidak dalam pakej, dengan sengaja:
- **Sebarang rahsia**: app key, app secret, refresh token, access token. Muse AI mesti guna akaun dan app sendiri.
- **Kod halaman dashboard (`index.html`)**: belum disertakan, menunggu kebenaran Hafizie. Lihat bahagian "Perkara belum siap" di bawah.
- Sprite thumbnail video. Senarai urutan id berada dalam kod halaman. Cover boleh diambil semula (lihat docs/01).

## Seni bina yang dicadangkan untuk Vercel

Dashboard sekarang ialah halaman statik yang membaca fail JSON dan mengira semuanya dalam JavaScript pelayar. Untuk Vercel:

```
Cron harian (Vercel Cron)  ->  tarik data (Marketing API + Shop API)  ->  PostgreSQL
Pelayar  ->  halaman Next.js/React  ->  API ringkas yang baca PostgreSQL  ->  paparan
```

- Simpan data mentah harian dalam jadual (lihat `db/schema.sql`) dan kira label, ranking dan Evergreen dalam kueri atau lapisan perkhidmatan. Jangan hantar semua baris ke pelayar: `organic_daily` sudah 31,849 baris (2.7 MB).
- **Satu penulis token**: refresh token Shop API berputar. Simpan dalam pangkalan data, dan hanya satu pekerja yang boleh refresh pada satu masa (kunci baris).
- Had kadar Shop API dikongsi dalam satu kumpulan app. Mintalah retry dengan backoff dan jangan selaraskan terlalu banyak panggilan.

## Cara mengesahkan pembinaan semula betul

`data/MANIFEST.json` ada bilangan baris dan jumlah (GMV, order, kos). Selepas import ke pangkalan data, jumlah mesti sama. Contoh semakan silang yang diketahui benar:
- `daily_videos` dan `daily_video_ads` ada GMV yang sama (RM222,028.97) dan order yang sama (2,396). `daily_video_ads` kos lebih tinggi (RM32,712) sebab ia termasuk hari tanpa jualan.
- Jumlah `organic_daily.gmv` (RM238,495.19) lebih tinggi daripada GMV Max video kerana ia GMV semua video kedai (organik + ads + affiliate). GMV Max melapor kira-kira 13% LEBIH daripada Seller Center untuk video dan hari yang sama, jadi **jangan campur** dua angka itu.

## Peringatan penting

1. **Tarikh post ada dua sumber yang berbeza.** Baca `docs/05-posted-time.md` sebelum memilih medan untuk "umur video" atau Evergreen.
2. **Klasifikasi akaun ialah padanan nama**, bukan tanda rasmi Seller Center (lihat docs/04).
3. **Hook, angle dan insight ialah bacaan automatik** daripada caption dan angka, bukan bukti sebab-akibat. Retention hanya untuk trafik iklan.
4. **Data hari terakhir belum muktamad**; Seller Center lewat 1 hingga 2 hari.
5. **Margin 35% ialah anggaran**, bukan angka akaun. ROI pulang modal = 1 / 0.35 = 2.86.

## Perkara belum siap (jujur)

- `index.html`: Claude tidak dibenarkan menyimpan dokumen yang mungkin ditulis orang lain ke fail tanpa kebenaran Hafizie. Bila Hafizie benarkan, ia boleh ditambah di `page/index.html`. Halaman bergantung pada runtime Dashboard Claude (`dash.data`, `dash.onData`) dan d3 v7; port ke Vercel memerlukan penyambung data kecil.
- Skrip refresh lengkap hujung ke hujung: skrip dalam `scripts/` ialah klien rujukan. Saya **tidak dapat menjalankannya terhadap API sebenar dalam sesi penyediaan ini** (token Shop API tiada dalam sesi ini). Tandatangan dan refresh diuji sebelum ini dalam sesi lain; bentuk respons endpoint dalam skrip ialah andaian yang perlu disahkan semasa larian pertama.
- Skrip tag hook/angle dan penjana `video_insight`: logiknya diterangkan dalam `docs/04`, tetapi kodnya tidak disimpan. Muse AI perlu menulisnya semula atau menggantikannya dengan pendekatan sendiri.
