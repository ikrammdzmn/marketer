# 08. Peraturan "Analisis detail video" (hook, stay, kenapa menang)

**Penting:** kod penjana asal (`insight.py`) tidak disimpan. Dokumen ini dibina semula daripada (a) penerangan dalam `docs/04`, dan (b) corak ayat sebenar dalam `data/video_insight.json` (810 video). Maka:
- **[pasti]** = jelas daripada output/penerangan.
- **[anggaran]** = ambang dianggar daripada contoh output; nilai tepat dalam kod asal tidak diketahui. Muse AI patut tetapkan sendiri dan dedahkan.

Semua bullet ialah pasangan [BM, EN]. Setiap bullet hanya dikeluarkan bila data ada.

## Input per video
- Retention iklan GMV Max: `r2, r25, r50, r75, r100` (%) dan `paparan` (product_impressions). Hanya bila ada paparan; <300 paparan: retention tak ditunjuk (video dilabel tiada data).
- Subtitle WebVTT (jika ada): masa mula suara, ayat pertama, teks penuh, bilangan perkataan, durasi.
- Caption, durasi, tontonan organik, order/1k tontonan, ROI iklan, status Evergreen.
- Benchmark median (video ≥500 paparan produk, 1 Ogos–26 Okt): r2 39%, r25 21%, r50 10.5%, r75 5.8%, habis 3.4%; median tonton habis ikut durasi: ≤20s 4.9%, 21–45s 2.7%, >45s 1.2%; median "lepas separuh yang sampai habis" 33%.

## A. Hook (3 saat pertama)
| Bullet | Syarat |
|---|---|
| `Diukur: X% penonton iklan kekal lepas 2 saat (median 39%): hook kuat / sederhana / lemah` | X = r2. **kuat** ≥ persentil 75 [pasti; contoh 54%, 62%]; **lemah** ≤ persentil 25 [pasti; contoh 27%, 29%]; selainnya **sederhana** [contoh 31%, 38%]. Tambah `(sampel iklan kecil: N paparan)` bila paparan <1,500 [pasti]. |
| `Suara bermula pada Ts: "ayat"` | Cap masa subtitle pertama; dilabel terjemahan automatik TikTok (mungkin tak tepat). Bila tiada subtitle: tiada bullet ini. |
| `Pembukaan senyap Ts sebelum bercakap` | Suara bermula selepas >1 saat [pasti]. Ditanda corak umum, sampel terlalu kecil untuk disahkan. |
| `Hook berbentuk soalan` | Ayat pertama (atau caption) berbentuk soalan: tanda soal atau kata tanya [anggaran padanan kata kunci]. Nota: tiada beza jelas pada penukaran. |
| `Hook promosi/harga di awal` | Ayat pertama/caption ada kata harga/promo (RM, harga, promo, diskaun…) [anggaran senarai kata]. |
| `Format balas komen` | Ayat pertama/caption menandakan balasan kepada komen (cth "balas komen", "reply to") [anggaran]. |
| `Penanda doktor atau pakar (authority)` | Kata kunci seperti doktor/Dr/pakar dalam skrip pertama atau caption [anggaran]. |
| `Caption: "…"` | Bila tiada subtitle: caption dipaparkan sebagai petunjuk hook. |
| `Tiada caption dan tiada suara dikesan: hook bergantung pada visual` | Kedua-dua kosong. |

## B. Penonton stay dan tonton habis
| Bullet | Syarat |
|---|---|
| `Diukur (iklan): 2s a% → 25% b% → 50% c% → 75% d% → habis e%` | Paparan ≥300 [pasti]. |
| `Penonton paling ramai hilang antara X ke Y (turun N mata)` | Segmen dengan penurunan mutlak terbesar antara titik berturutan (2s→25%→50%→75%→habis). |
| `Daripada yang lepas separuh video, P% sampai habis (median 33%): kuat / biasa / ramai tinggalkan di hujung` | P = habis ÷ r50. Contoh: 52% = kuat; 32% = biasa; 0% = ramai tinggalkan [ambang tepat anggaran]. |
| `Tonton habis e% berbanding median m% untuk video sepanjang itu (Ds): di atas / setanding / di bawah` | m ikut kelompok durasi (≤20s, 21–45s, >45s). Contoh: 3.8 vs 2.7 = di atas; 3.0 vs 2.7 dan 4.7 vs 4.9 = setanding; 0.7 vs 1.2 = di bawah [ambang relatif tepat tidak diketahui; antara ±11% setanding dan +41% di atas]. |
| `Ajakan "beg kuning" disebut pada Ts (Q% daripada video)` / `Tiada ajakan dikesan` | Cari "yellow bag"/"beg kuning"/variasi dalam subtitle. |
| `Anggaran hanya P% tontonan iklan sampai ke ajakan beli itu: ajakan terlalu lewat, pindahkan lebih awal` | P = interpolasi linear antara titik (0s=100%, 2s=r2, 25%=r25, 50%=r50, 75%=r75, 100%=habis) pada kedudukan Q. "Terlalu lewat" bila P kecil (contoh 5% dan 7% ditanda lewat) dan "kebanyakan yang tinggal sempat dengar ajakan" pada 8% [ambang antara 7 dan 8%, tidak pasti; patut dikaji semula]. |
| `Skrip: W perkataan dalam Ds (r perkataan/saat): padat / kadar biasa / perlahan` | r = W/D. Contoh: 3.3 dan 3.4 = padat; 2.0 = biasa; 0.9 = perlahan [ambang anggaran, kira-kira >3 padat, <1.5 perlahan]. |
| `Durasi D saat.` | Bila tiada subtitle. |
| `Organik (Seller Center): V tontonan, k order/1k tontonan (median video menjual 5k+ tontonan: 0.08)` | order/1k = sku_orders ÷ views × 1000; median 0.08 daripada video menjual dengan ≥5k tontonan. Tontonan sangat sedikit (contoh 293): tambah "terlalu sedikit, angka tak stabil". |
| `Tiada data penonton (retention): tiada iklan dengan paparan mencukupi` | Paparan <300 atau tiada rekod. |

## C. Kenapa boleh menang
Bullet "Isyarat menang" menyenaraikan, ikut urutan tetap, isyarat yang dikesan:
1. `hook 2s di atas 75% video lain` (r2 ≥ P75)
2. `tonton habis tinggi` (tonton habis di atas median durasi)
3. `suara bermula serta-merta` (suara bermula ≤ ~0.5s [anggaran])
4. `format balas komen`, `penanda doktor (authority)`
5. `ROI iklan X, jauh melepasi pulang modal` (ROI iklan jauh di atas 2.86; nilai terendah dilihat dalam data ialah 9.7, ambang tepat tidak diketahui)
6. `masih menjual lebih 60 hari selepas post (evergreen)` (status Evergreen)

"Isyarat lemah": `hook 2s lemah`, `pembukaan senyap`, `tonton habis rendah`.

Cadangan (hanya bila isyarat lemah sepadan):
- hook lemah → "Tulis semula 2 saat pertama: mula terus dengan soalan, masalah atau hasil."
- pembukaan senyap → "Mula bercakap dalam 0.5 saat pertama."
- tonton habis rendah → "Pendekkan atau padatkan bahagian tengah supaya penonton tak tinggalkan sebelum akhir."

Jika tiada retention dan tiada skrip: "Data tak cukup untuk kata kenapa video ini menang."

Dua bullet tetap:
- "Nota: dalam data kami, retention iklan tidak meramal ROI (korelasi sekitar -0.2 pada 88 video), jadi jangan putuskan berdasarkan hook semata-mata." (bila ada retention)
- "Had: saya tak tonton visual (potongan, teks atas skrin, ekspresi). Angka retention ialah daripada iklan, bukan semua tontonan organik." (semua video)

## Cadangan kejujuran untuk produk
Kata-kata seperti "hook kuat" bermaksud retention 2s tinggi, bukan penilaian kreatif. Bullet format (soalan, doktor, balas komen) ialah padanan kata kunci pada terjemahan mesin, jadi boleh salah.
