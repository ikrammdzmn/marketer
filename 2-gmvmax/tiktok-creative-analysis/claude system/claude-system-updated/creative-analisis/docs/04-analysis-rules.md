# 04. Peraturan analisis

Semua pengiraan dilakukan dalam JavaScript halaman pada sistem sekarang. Untuk Vercel, letak dalam kueri SQL atau fungsi perkhidmatan. Ambang di bawah ialah yang digunakan sekarang; ada yang cadangan, bukan keputusan rasmi (ditandakan).

## Untung selepas ads
`untung = GMV × 0.35 − kos ads`. Margin 35% ialah **anggaran**, bukan angka akaun; GMV kasar (sebelum pulangan/pembatalan). ROI pulang modal = 1 / 0.35 = **2.86**. Mesti boleh dikonfigurasi (margin ikut produk ialah soalan terbuka).

## Label status (tab Product / Live)
Winner, Baik, Sampel kecil, Nipis, Rugi, Tiada jualan.
- Ambang order mengikut tempoh: 10 order untuk tempoh ≥30 hari; berskala bawah itu. `skala = min(1, hari/30)`.
- Winner: order cukup DAN (kadar beli atau ROI di atas purata kumpulan).
- Sampel kecil: order di bawah ambang. Rugi: untung negatif dengan order cukup.
- **Tepat nilai ambang untuk Nipis/Baik tidak disimpan dalam dokumen** (ada dalam kod halaman). Muse AI patut tetapkan sendiri dan dedahkan dalam UI. [andaian]

## Top 5 (tab Product GMV Max)
| Ranking | Disusun ikut | Syarat minimum |
|---|---|---|
| Gross Revenue (lalai) | GMV | GMV > 0 |
| Product Ad Click Rate | klik ÷ paparan | paparan ≥ max(150, 1000×skala) |
| Ad Conversion Rate | pembelian ÷ klik | klik ≥ max(10, 50×skala) dan ada pembelian |
| 25% Video View Rate | % tonton 25%, wajaran paparan | paparan ≥ max(150, 1000×skala) |
| Untung selepas ads | GMV×0.35 − kos | order ≥ minimum, untung > 0 |
Video boleh ada dalam beberapa senarai ("Juga #N"). Mod "Tiada pertindihan": keutamaan Revenue, Click rate, CVR, 25% view, Untung; yang dilangkau diganti seterusnya ("Ranking sebenar #N").

## Evergreen (cadangan, **belum diluluskan** Hafizie)
Video dipost ≥60 hari sebelum tarikh rujukan, ≥3 order dalam sekurang-kurangnya 2 daripada 3 bulan terkini, ROI gabungan ≥2.86. "Kuat" = layak ketiga-tiga bulan. Pada 25 Okt: 25 layak, 15 kuat. Satu video 2024 (RM27k) ~50% GMV Evergreen, jadi tunjuk bahagian ini.
Umur video bergantung pada sumber tarikh post: lihat `05-posted-time.md` (guna ID untuk Evergreen sekarang).

## Seller Center vs GMV Max
GMV Max lapor ~13% LEBIH tinggi daripada Seller Center untuk video/hari sama; jualan GMV Max sudah termasuk dalam GMV Seller Center. **Jangan jumlahkan.** "Organik" = GMV Seller Center pada hari video tiada jualan GMV Max.
Tontonan dikira untuk SEMUA hari (bukan hari menjual sahaja). "Impression produk" bukan impression video.

## Klasifikasi akaun (tab Seller Center)
- Akaun terpaut: nama sepadan `/samhan|himcoffee/` (padanan nama, bukan tanda rasmi). Samar: `drhanzalah.extended`, `nursuhanabakar99`.
- Internal account (15, senarai daripada Hafizie): dr.samhan, affiliatedrsamhan1, affiliatedrsamhan5, himcoffeedrsamhan, himcoffeebydrsamhan, himcoffeebydrsamhan1/2/3, drsamhanofficial dan variannya (3, 4, 8, store; ejaan tepat perlu disahkan dengan Hafizie), drsamhansembangsihat, drsamhaninfosihat.
- Selainnya: Affiliate.

## Analisis detail video (insight)
Logik, bukan kod:
- **Hook (3s pertama)**: retention 2s vs median (kuat ≥ P75, lemah ≤ P25); masa suara bermula + ayat pertama (subtitle); pembukaan senyap >1s; format (balas komen, soalan, promosi/harga, penanda doktor); caption.
- **Stay**: lengkung 2s→25%→50%→75%→habis; segmen penurunan terbesar; % lepas separuh/habis vs median untuk durasi sama; bila ajakan "beg kuning" disebut + anggaran % sempat sampai (interpolasi linear); kepadatan skrip (perkataan/saat).
- **Kenapa boleh menang**: isyarat kuat/lemah + cadangan; sentiasa tulis had.
- Benchmark (median, ≥500 paparan produk, 1 Ogos–26 Okt): hold 2s 38.9%, 25% 21.1%, 50% 10.5%, 75% 5.8%, habis 3.4%. Tonton habis ikut durasi: ≤20s 4.9%, 21–45s 2.7%, >45s 1.2%.
- Sampel <1,500 paparan dilabel; <300 paparan retention tak ditunjuk.

## Amaran yang MESTI kekal dalam produk
1. Retention hanya untuk trafik iklan; korelasi dengan ROI lemah (~ −0.2, 88 video). Jangan buang/scale berdasarkan hook sahaja.
2. Hook/angle auto-tag, bukan sebab-akibat.
3. Visual tak dianalisis; subtitle terjemahan mesin dan ada untuk ~43% video.
4. Hari terakhir belum muktamad; Seller Center lewat 1–2 hari.
