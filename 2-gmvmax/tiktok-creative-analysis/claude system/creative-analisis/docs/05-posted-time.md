# 05. Bagaimana tarikh post video diperoleh

Ada **dua sumber** dan ia tidak sentiasa sama. Pilih satu dengan sengaja.

## Sumber 1: ID video (kod pada Product, Live, Evergreen sekarang)
TikTok ID ialah snowflake; 32 bit atas ialah masa unix (saat).
```js
const ts = Number(BigInt(id) >> 32n);          // saat unix (UTC)
const myt = new Date((ts + 8*3600) * 1000);   // waktu Malaysia
```
Python: `ts = int(id) >> 32`. Digunakan untuk `video_meta.posted`, umur video, Evergreen, dan `live_rooms.started` (dari `room_id`). Tersedia untuk SEMUA video tanpa panggilan API tambahan, termasuk yang tiada dalam Shop API.

## Sumber 2: `post_time` Shop API (`organic_meta.post_time`)
Medan metadata video daripada respons Shop API. Digunakan pada tab Seller Center. Sumber medan ini dalam respons dan zon masanya **[andaian]**; sahkan pada larian pertama.

## Beza di antara keduanya (diukur 4 Nov 2026, 6,542 video)
| Beza (API − ID) | Bahagian |
|---|---|
| dalam 1 jam | 64.1% |
| API lewat 1–24 jam | 33.9% |
| API lewat 1–7 hari | 1.9% |
| API lewat >7 hari | 0.1% |
| API **lebih awal** daripada ID | **0%** |

Sebab yang paling sesuai dengan corak (teori, belum disahkan): ID dijana semasa muat naik/draf, `post_time` ialah masa diterbitkan, jadi video yang dijadual atau lambat diterbitkan nampak lewat. Tiada kes API lebih awal, selaras dengan teori ini.

## Implikasi
- Tarikh yang sama tidak bermakna sama: sebanyak ~36% video beza lebih 1 jam; kebanyakannya kurang satu hari, jadi **umur dalam hari** jarang berubah banyak, tetapi video berhampiran sempadan (60 hari Evergreen, sempadan tarikh) boleh bertukar status.
- Jangan campur dua sumber dalam satu paparan tanpa label.

## Cadangan
- **Sistem sekarang (pilihan C)**: kekalkan, dokumenkan sahaja.
- **Muse AI (pilihan B)**: simpan KEDUA-DUA dalam jadual `video` (`posted_from_id`, `posted_api`), paparkan `posted_api` bila ada (masa terbit sebenar) dan `posted_from_id` sebagai sandaran untuk video yang tiada dalam Shop API. Label sumbernya dalam UI.
