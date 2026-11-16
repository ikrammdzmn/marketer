# 07. Had yang diketahui

Jangan tuntut lebih daripada ini dalam produk.

## Data
1. **Visual tak dianalisis.** `playAddr` kosong; fail video tak boleh dimuat turun. Hook visual, potongan, teks atas skrin tak dibaca.
2. **Skrip** = subtitle terjemahan mesin TikTok (Inggeris), ada untuk ~43% video (317 daripada 745 yang dicuba).
3. **Retention hanya daripada iklan GMV Max.** ~200 video ada ≥500 paparan; ~88 dengan spend sebenar. Tiada retention organik dalam API.
4. **Tiada impression video (FYP)** dalam mana-mana API. Hanya impression produk (~87.5% daripada tontonan).
5. **Senarai video Product = kempen MAIN 1 sahaja.** Kempen cocomax, Kombo, Happy Hour tak disenaraikan.
6. **Hari terakhir belum muktamad;** Seller Center lewat 1-2 hari; impression produk hari terkini sering tiada.
7. Pautan terus sesi live tiada daripada API.
8. Video dipadam/private tiada cover.
9. `daily_video_ads` hilang ~119 baris kecil 29 Sep dalam salinan ini.
10. CVR GMV Max = "conversion", bukan order SKU ÷ klik.
11. GMV Max vs Seller Center beza ~13%; jangan jumlahkan.

## Analisis
12. Retention **tak meramal jualan** (korelasi ~ −0.2, 88 video). Jangan scale/buang berdasarkan hook sahaja.
13. Hook/angle = auto-tag daripada caption, bukan sebab-akibat.
14. Corak teks (doktor, balas komen, senyap) hanya 9-12 video setiap satu: terlalu kecil untuk angka.
15. Margin 35% anggaran; Evergreen belum diluluskan; klasifikasi akaun ikut nama.

## API & operasi
16. `shop_videos/{id}/performance` sentiasa 429.
17. Had kadar Shop API dikongsi dalam satu kumpulan app; Marketing API kod 40000 jika >7 panggilan selari.
18. Tingkah laku refresh token berputar jangka panjang belum diuji; sama ada authorize kali kedua membatalkan token pertama belum diuji.
19. Skrip dalam `scripts/` **belum dijalankan terhadap API sebenar** oleh penyedia pakej. Nama kunci respons ialah andaian.
20. Scraping tiktok.com mungkin disekat atau melanggar terma.
