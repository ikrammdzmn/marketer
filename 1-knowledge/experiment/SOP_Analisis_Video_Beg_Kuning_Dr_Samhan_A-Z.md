# SOP dan rekod kerja analisis video Beg Kuning TikTok — Dr. Samhan

**Tarikh dokumentasi:** 18 November 2026  
**Zon masa analisis:** Asia/Kuala_Lumpur, GMT+08:00  
**Kedai Seller Center:** Dr Samhan  
**Akaun creator yang dianalisis:** `@dr.samhan` sahaja  
**Tempoh prestasi:** 19 Oktober–17 November 2026, 30 hari kalendar termasuk kedua-dua tarikh  
**Objektif:** mengenal pasti video yang menghasilkan jualan, meneliti visual dan skripnya, kemudian menghasilkan analisis yang boleh digunakan untuk merancang content seterusnya.

Dokumen ini merekodkan proses sebenar dalam perbualan, termasuk cubaan yang tidak berjaya, kaedah alternatif, batas analisis dan pembetulan yang ditemui ketika menyediakan dokumen. Ia tidak mengandungi fail video atau video yang dibenamkan. Setiap video diterangkan melalui identiti, aliran semakan, bukti dan hasil analisis.

## Cara membaca dokumen

- **Rekod sesi asal:** perkara yang benar-benar dibuat semasa akses Seller Center dan analisis pertama.
- **Pengesahan tambahan:** semakan yang dibuat ketika menyediakan fail Markdown ini. Ia tidak dianggap sudah dibuat dalam sesi asal.
- **Panduan ulangan:** cara mengulangi proses dengan lebih kemas. Ia tidak bermakna langkah itu telah dilaksanakan dalam sesi asal.
- Nama butang dan susun atur adalah seperti yang kelihatan pada 18 November 2026. Jika UI berubah, cari fungsi yang sama melalui paparan semasa.
- Nombor elemen accessibility, tab ID dan nama fail automatik bergantung pada sesi. Jangan anggap nombor lama sentiasa sah.
- Perkataan “winning” di sini merujuk kepada prestasi jualan dan kecekapan dalam skop data ini. Ia bukan pengesahan keuntungan, ROAS atau bahawa skrip sahaja menyebabkan jualan.

## Pembetulan penting kepada rekod awal

1. Eksport Excel pada mulanya dibaca sebagai satu sel julat tarikh sahaja. Pemeriksaan tambahan mendapati fail itu **bukan kosong**. Metadata dimension helaian ialah `A1`, sedangkan XML mengandungi 314 rekod video. Kaedah pembacaan yang betul diterangkan dalam Bahagian L.
2. Jumlah utama daripada pembacaan UI kekal tepat: **314 video, 72 video menjana GMV, RM38,915.27 dan 509 attributed SKU orders**.
3. Beberapa pengiraan awal menggunakan paparan seperti `19.92K` dan `6.14K`. Eksport memberi angka tepat, maka GPM video #2 ialah **RM170.57**, bukan anggaran awal RM170.53, dan GPM video #10 ialah **RM156.46**, bukan anggaran awal RM156.33.
4. Eksport turut mengandungi `Video Finish Rate`, `Click-through rate (Video)`, `Video GMV` dan `Video indirect GMV`. Medan ini belum digunakan dalam analisis asal kerana isu pembacaan fail tadi. Tiada retention curve mengikut saat atau purata watch time disahkan dalam proses ini.
5. Nisbah `Product Clicks / Product Impressions` yang dikira dalam analisis awal ialah nisbah tersendiri. Ia **bukan** medan TikTok `Click-through rate (Video)`, yang dalam rekod top 10 ini sepadan dengan `Product Clicks / Video views` selepas pembundaran.

---

## A. Tetapkan soalan analisis sebelum membuka data

### A1. Permintaan asal

Pengguna meminta:

1. Buka TikTok Seller Center dalam browser.
2. Gunakan data untuk Dr. Samhan sahaja.
3. Masuk ke Analytics dan kenal pasti video winning.
4. Review video tersebut satu persatu.
5. Terangkan apa yang mungkin menyumbang kepada prestasi dan bahagian skrip yang relevan.

### A2. Penjelasan skop yang diperoleh

Soalan pilihan tempoh dikemukakan. Pengguna memilih **30 hari terkini, utamakan jualan**.

Implikasinya:

- Susunan utama menggunakan GMV yang diatributkan kepada video.
- Pesanan SKU digunakan bersama GMV untuk melihat jumlah conversion.
- Views digunakan sebagai konteks capaian, bukan ukuran kemenangan tunggal.
- Klik, impresi dan CTOR digunakan untuk mengenal pasti bahagian perjalanan pembelian yang lebih kuat atau lemah.
- Video yang diterbitkan sebelum 30 hari tersebut tetap layak jika menghasilkan prestasi dalam tempoh yang dipilih.

### A3. Output yang hendak dihasilkan

Output akhir mesti menjawab empat soalan:

1. Video mana paling banyak menjana GMV dalam tempoh berkenaan?
2. Video mana lebih cekap menukar perhatian atau klik kepada pesanan?
3. Apakah hook, isi, visual, bukti, tawaran dan CTA yang benar-benar terdapat dalam video?
4. Struktur content mana patut diuji semula, dan perkara mana masih tidak dapat dibuktikan?

---

## B. Sediakan akses dan sempadan kerja

### B1. Perkara yang diperlukan

- Browser yang boleh dibuka oleh pengguna dan diperiksa oleh agent.
- Akses pengguna kepada TikTok Shop Seller Center Malaysia.
- Akaun dengan kebenaran melihat Analytics dan mengeksport laporan.
- Keupayaan membuka pautan video yang disediakan oleh Seller Center.
- Ruang kerja sementara untuk memproses fail yang dimuat turun, jika diperlukan.

### B2. Siapa melakukan login

**Pengguna sendiri menyelesaikan login dalam browser terbina dalam.** Agent membuka halaman login, kemudian menunggu pengguna mengesahkan bahawa login selesai. Tiada kata laluan, OTP atau kandungan borang login direkodkan dalam dokumen ini.

### B3. Jenis tindakan yang dilakukan

Proses ini melibatkan pembacaan Analytics, perubahan penapis paparan, eksport laporan, muat turun video untuk analisis, transkripsi percubaan dan pemprosesan setempat.

Proses ini tidak melibatkan perubahan kempen, bajet iklan, harga produk, stok, produk dipautkan, penerbitan content atau penghantaran mesej kepada pihak lain. Satu projek transkripsi Descript diwujudkan sebagai sebahagian daripada pemprosesan video pertama.

---

## C. Pilih browser yang diminta pengguna

### C1. Urutan sebenar

1. Agent memeriksa browser dan aplikasi yang tersedia.
2. Google Chrome sedang berjalan. Pada peringkat awal, Chrome digunakan melalui kawalan aplikasi native.
3. Pengguna mengesahkan mahu menggunakan Chrome.
4. Tab baharu dibuka dan alamat Seller Center dimasukkan.
5. Sebelum analisis diteruskan, pengguna menukar arahan kepada **browser terbina dalam**.
6. Agent menghormati arahan terkini dan membuka Seller Center dalam in-app browser.
7. Semua pengambilan data Analytics selepas login dibuat melalui browser terbina dalam tersebut.

### C2. Alamat yang digunakan

```text
https://seller-my.tiktok.com
```

Alamat ini membawa kepada halaman login jika sesi belum disahkan, atau halaman Seller Center jika login masih sah.

### C3. Corak kawalan browser dalam sesi

Contoh kaedah yang digunakan:

```javascript
await cua.getState();
let seller = await cua.createBrowserTab(
  "iab",
  "https://seller-my.tiktok.com",
  { visible: true }
);
```

Ini ialah contoh daripada API sesi tersebut. Untuk penggunaan agent yang baharu, baca dokumentasi tool yang tersedia dahulu. Jangan anggap semua persekitaran menyokong API yang sama.

### C4. Peraturan pemerhatian semasa navigasi

Selepas klik, taip, pilih penapis atau tukar halaman:

1. Dapatkan keadaan UI yang baharu.
2. Sahkan hasil tindakan.
3. Tentukan tindakan seterusnya daripada keadaan itu.

Jangan menggunakan nombor elemen lama selepas paparan berubah. Jika klik tidak memberi kesan, periksa sama ada halaman sedang memuat, terdapat lapisan dialog, tab baharu dibuka atau pautan perlu dibuka secara terus.

---

## D. Buka login dan tunggu pengesahan pengguna

### D1. Paparan awal

Halaman yang kelihatan ialah **TikTok Shop Seller Log In | Malaysia**. Ia menyediakan pilihan nombor telefon, email, kata laluan, SMS dan login dengan akaun TikTok.

### D2. Tindakan sebenar

1. Agent membuka halaman tersebut.
2. Agent memaklumkan bahawa browser terbina dalam belum mempunyai sesi login.
3. Tab ditandakan sebagai handoff supaya pengguna boleh menyelesaikan login dan tab kekal tersedia.
4. Pengguna diminta login sendiri dan memaklumkan apabila selesai.
5. Pengguna kemudian menyatakan bahawa login Seller Center telah selesai dan meminta analisis diteruskan.
6. Agent membaca semula halaman; agent tidak menganggap mesej pengguna sahaja sebagai bukti akaun yang sedang terbuka.

Contoh pengekalan tab untuk handoff:

```javascript
await seller.markHandoff();
```

### D3. Jika ada halangan login pada ulangan

Jika login gagal, OTP belum selesai atau CAPTCHA muncul, berhenti pada langkah berkenaan dan minta tindakan yang diperlukan daripada pengguna. Jangan mereka-reka akses atau menggunakan sesi daripada akaun lain.

---

## E. Sahkan kedai dan bezakan kedai daripada akaun creator

### E1. Bukti kedai yang terbuka

Selepas login, penjuru atas Seller Center memaparkan **Dr Samhan**. Ini mengesahkan kedai yang sedang dibaca.

### E2. Mengapa pengesahan ini belum mencukupi

Kedai Dr Samhan boleh menerima jualan daripada:

- Akaun yang dipautkan kepada kedai.
- Marketing accounts.
- Creator atau affiliate yang mempromosikan produk kedai.

Nama kedai `Dr Samhan` tidak bermakna semua baris dalam Analytics adalah video daripada `@dr.samhan`.

### E3. Kriteria akaun yang betul

Baris video mesti menunjukkan creator **`@dr.samhan`**, dengan ejaan dan titik yang tepat. Akaun seperti `@drsamhanofficial8` atau `@himcoffeedrsamhan` tidak dimasukkan ke dalam analisis ini.

---

## F. Masuk ke Analytics, LIVE & video analytics dan Video Details

### F1. Laluan UI

```text
Seller Center
→ Analytics
→ LIVE & video analytics
→ bahagian Video
→ Details
```

### F2. Perkara kecil yang berlaku dalam sesi

1. Agent mengklik pautan Analytics pada menu Seller Center.
2. Keadaan UI tidak menunjukkan navigasi yang dijangka.
3. Senarai tab diperiksa; tiada tab Analytics baharu ditemui.
4. Agent membuka URL Analytics yang memang telah kelihatan sebagai sasaran pautan dalam UI:

   ```text
   https://seller-my.tiktok.com/compass/data-overview
   ```

5. Selepas halaman memuat, agent membaca pilihan menu Analytics.
6. Notis tentang data real-time dipaparkan. Notis menyatakan bahawa untuk hari ini dan semalam, hanya metrik real-time tersedia; metrik lain tersedia sehingga dua hari lebih awal.
7. Notis tersebut ditutup melalui `Got it`.
8. Agent memilih **LIVE & video analytics**.
9. Halaman awal ialah analitik LIVE, bukan senarai video.
10. Pada menu sisi terdapat dua kumpulan, **LIVE** dan **Video**, masing-masing mempunyai pilihan seperti `Performance` dan `Details`.
11. Agent memilih **Details di bawah Video**, bukannya Details di bawah LIVE.

### F3. URL halaman yang digunakan

```text
https://seller-my.tiktok.com/compass/live-analysis

https://seller-my.tiktok.com/compass/video-analytics/video-details?platform_data_source=shop
```

Seller Center menambah parameter seperti `shop_region=MY` semasa halaman dimuat. Gunakan menu sebenar sebagai rujukan jika laluan URL berubah pada masa hadapan.

### F4. Semakan sebelum teruskan

Pastikan jadual mengandungi maklumat video, creator, masa terbit dan metrik jualan. Jika jadual mengandungi sesi LIVE, laluan yang dipilih belum betul.

---

## G. Tetapkan 30 hari terkini dengan tarikh tepat

### G1. Keadaan asal

Pada halaman Video Details, julat asal ialah:

```text
Last 7 days: Nov 11, 2026 – Nov 17, 2026
```

### G2. Pemilihan tarikh sebenar

1. Klik medan tarikh mula di bahagian atas Analytics.
2. Panel kalendar dibuka.
3. Pilihan ringkas yang kelihatan ialah `Today`, `Last 7 days` dan `Last 28 days`.
4. Pilih **Custom** kerana 28 hari tidak sama dengan permintaan 30 hari.
5. Kalendar pada mulanya menunjukkan November dan Disember 2026.
6. Anak panah kembali sebulan digunakan supaya Oktober dan November 2026 kelihatan.
7. Klik **19 Oktober 2026** sebagai tarikh mula.
8. Medan tarikh akhir menjadi kosong sementara pemilihan belum lengkap.
9. Klik **17 November 2026** sebagai tarikh akhir.
10. Tunggu jadual dimuat semula.
11. Sahkan label atas berubah kepada:

    ```text
    Custom: Oct 19, 2026 – Nov 17, 2026
    GMT+08:00
    ```

### G3. Sebab pemilihan ini

Tarikh 18 November ialah hari semakan. Tempoh yang digunakan ialah 30 hari kalendar sehingga hari sebelumnya supaya tidak mencampurkan hari semasa yang belum lengkap. Data bagi tarikh akhir masih boleh berubah mengikut kemas kini platform.

### G4. Bezakan dua jenis tarikh

| Jenis tarikh | Maksud |
|---|---|
| Penapis atas Analytics | Tempoh GMV, pesanan, klik dan views yang sedang dinilai |
| `Time` pada baris video | Tarikh video diterbitkan |

Video Mei 2024 boleh menjadi pemenang untuk Oktober–November 2026. Jangan menolak video tersebut hanya kerana tarikh terbitnya lama.

---

## H. Tapis akaun tepat `@dr.samhan`

### H1. Mengapa Linked accounts diperiksa dahulu

Halaman asal memaparkan tab **Linked accounts**. Jadual pada ketika itu mengandungi beberapa akaun, jadi ia belum sesuai untuk permintaan pengguna.

### H2. Pemeriksaan penapis Linked accounts

1. Klik **Filter (1)**.
2. Buka pilihan **Account type**.
3. Senarai yang muncul mengandungi:

   - `affiliatedrsamhan1` — Official account.
   - `drsamhanofficial8` — Marketing account.
   - `drsamhanofficialstore` — Marketing account.
   - `drsamhanofficial5` — Marketing account.
   - `himcoffeedrsamhan` — Marketing account.

4. Akaun tepat `dr.samhan` tidak berada dalam senarai ini.
5. Agent menutup pilihan dan membatalkan panel penapis tersebut.
6. Agent tidak memilih akaun yang namanya hampir sama sebagai pengganti.

### H3. Beralih ke Affiliate accounts

1. Klik tab **Affiliate accounts**.
2. Cari kawalan **Input creator name**.
3. Buka dropdown kawalan tersebut.
4. Dropdown menyediakan satu medan carian sendiri. Input pada kawalan luar tidak semestinya sama dengan medan carian dalaman.
5. Taip `dr.samhan` dalam medan carian dropdown yang benar-benar aktif.
6. Tunggu hasil carian muncul.
7. Pilih hasil **dr.samhan**.
8. Sahkan kawalan penapis memaparkan `dr.samhan`.
9. Sahkan creator pada baris-baris jadual ialah `@dr.samhan`.

### H4. Maksud label Affiliate accounts dalam konteks ini

Ini ialah tempat Seller Center menyenaraikan akaun tersebut dalam sesi ini. Pemilihan tab tersebut tidak mengubah akaun, tidak menambah affiliate dan tidak mengubah hubungan akaun dengan kedai.

---

## I. Fahami jadual sebelum menyalin data

### I1. Medan UI yang dibaca

| Medan | Cara digunakan |
|---|---|
| Video Info | Caption, thumbnail dan nama creator untuk mengenal pasti kandungan |
| Products | Produk yang dipautkan; bukan jumlah pesanan |
| Time | Tarikh terbit dan tempoh video yang dipaparkan |
| Used in ads | Penanda penggunaan dalam iklan; bukan belanja atau keuntungan iklan |
| Creator country | Konteks negara creator |
| Creator video-attributed GMV | Asas ranking jualan dalam sesi ini |
| Attributed SKU orders | Bilangan pesanan pada aras SKU yang diatributkan |
| Items sold | Kuantiti item; boleh berbeza daripada pesanan SKU |
| CTOR | Kadar attributed SKU orders berbanding product clicks dalam rekod ini |
| Video views | Capaian/tontonan dalam tempoh analisis |
| Product Impressions | Impresi produk dalam rekod video |
| Product Clicks | Klik produk untuk menilai perjalanan menuju pembelian |

### I2. Semakan penting

- Pastikan baris pertama ialah video, bukannya header yang tersalah dikira sebagai data.
- Pastikan GMV disusun menurun. Dalam sesi ini, nilai yang kelihatan memang menurun; tiada bukti bahawa agent perlu mengklik sort tambahan.
- Jangan menafsirkan caption sebagai dialog video.
- Jangan menukar `Attributed SKU orders` kepada “pelanggan unik”. Eksport menunjukkan medan `Unique customers` kosong untuk rekod teratas.
- Jangan menganggap `Used in ads = Yes` bermakna semua jualan datang daripada iklan atau iklan sedang aktif ketika semakan.
- Jangan menganggap label diagnosis platform seperti “Good performance” sama dengan pemenang berdasarkan objektif pengguna.

---

## J. Baca semua halaman untuk membina baseline akaun

### J1. Mengapa tidak berhenti pada halaman pertama

Top 10 memberi shortlist, tetapi baseline akaun diperlukan untuk mengetahui bahagian GMV yang disumbangkan oleh shortlist dan berapa banyak video sebenarnya menghasilkan jualan.

### J2. Langkah pagination sebenar

1. Jadual asal memaparkan **10/Page** dan 32 halaman.
2. Klik pemilih page size.
3. Pilihan `10/Page`, `20/Page`, `50/Page` dan `100/Page` kelihatan.
4. Pilih **100/Page**.
5. Sahkan pilihan bertukar kepada 100/Page.
6. Baca halaman 1: 100 baris.
7. Klik Page 2, baca semula UI, kemudian ambil 100 baris seterusnya.
8. Ulang untuk Page 3: 100 baris.
9. Buka Page 4: baki 14 baris.
10. Jumlah rekod yang dikumpulkan melalui UI ialah **314**.
11. Kembali ke halaman pertama selepas baseline selesai.

### J3. Kaedah teknikal yang berfungsi

Data dibaca daripada jadual yang telah dimuat dalam UI menggunakan Playwright yang disediakan oleh tool browser. Contoh:

```javascript
const cells = await seller.playwright
  .getByRole("cell")
  .allTextContents();

const pageRecords = [];
for (let i = 0; i < cells.length; i += 12) {
  pageRecords.push(cells.slice(i, i + 12));
}
```

**Angka 12 hanya sesuai dengan jadual Affiliate accounts yang dibaca ketika itu.** Untuk ulangan, baca header dan kira kolum semasa dahulu. Jangan menggunakan pecahan 12 jika susunan metrik berubah.

Panduan yang lebih kukuh ialah membaca setiap row secara berasingan, kemudian memadankan cell dengan nama header. Ini mengurangkan risiko kolum tersasar.

### J4. Mengelakkan pengiraan dua kali

- Tunggu data halaman baharu dimuat sebelum menambah baris ke senarai.
- Semak satu rekod awal selepas setiap perubahan halaman.
- Rekod halaman yang telah dibaca.
- Jika Video ID tersedia daripada eksport, gunakan ID untuk menyemak pendua.
- Jangan menganggap dua caption sama bermakna video sama. Dalam akaun ini, caption berulang digunakan pada video yang berbeza.

---

## K. Eksport laporan dan ambil fail sebenar

### K1. Urutan sebenar

1. Klik **Export** pada Video Details selepas julat tarikh dan creator ditapis.
2. Butang sementara menjadi tidak aktif dan mesej `Exporting, please wait` muncul.
3. Agent pada mulanya cuba menunggu acara download terus daripada klik Export.
4. Penantian itu tamat tanpa fail, kerana aliran Seller Center menyediakan laporan dalam senarai **Exported reports** dahulu.
5. Keadaan UI diperiksa semula.
6. Senarai Exported reports muncul dengan nama laporan, masa eksport dan butang Download.
7. Pilih laporan yang baru dijana dalam sesi semasa, bukan laporan lama milik pengguna.
8. Klik **Download** pada laporan yang sepadan.
9. Sahkan path fail yang benar-benar dikembalikan oleh browser.

Laporan yang digunakan untuk pengesahan tambahan:

```text
Video Performance List_20261118082208.xlsx
```

Masa eksport yang dipaparkan ialah 18 November 2026, 4:22 petang. Terdapat satu lagi cubaan eksport lebih awal dalam sesi; ia bukan sumber yang digunakan untuk pengesahan akhir dokumen ini.

### K2. Corak menunggu download yang berjaya

```javascript
const [download] = await Promise.all([
  seller.playwright.waitForEvent("download", { timeout: 20000 }),
  seller.playwright.getByRole("button", {
    name: "Download",
    exact: true
  }).first().click()
]);

const path = await download.path();
```

Dalam ulangan sebenar, skopkan butang Download kepada baris laporan yang tepat. `.first()` dalam contoh hanya sesuai jika baris pertama telah disahkan sebagai laporan yang baru dijana.

### K3. Mesej yang tidak boleh dijadikan satu-satunya kesimpulan

Satu notis `You can try to choose another time period` turut kelihatan. Kehadiran notis itu tidak membuktikan bahawa fail yang telah dimuat turun tiada data. Kandungan fail perlu diperiksa secara berasingan.

---

## L. Periksa dan pulihkan bacaan Excel yang nampak kosong

### L1. Apa yang berlaku dalam analisis asal

Fail dibuka dengan pembaca Excel dalam mod `read_only=True`. Pembaca melaporkan saiz helaian 1 baris × 1 kolum dan hanya mengembalikan teks julat tarikh. Pada masa itu agent menyangka eksport tidak mengandungi baris data, lalu meneruskan pembacaan UI.

### L2. Apa yang ditemui ketika menyediakan dokumen ini

Pemeriksaan XML dalaman fail mendapati:

```text
dimension ref = A1
XML row elements = 316
XML cells = 10,081
Data video = 314 rekod
```

Susun atur sebenar ialah:

| Baris Excel | Kandungan |
|---|---|
| 1 | `[Date Range]: 2026-10-19 ~ 2026-11-17` |
| 2 | Kosong |
| 3 | Header |
| 4–317 | 314 rekod video |

Bilangan elemen XML tidak termasuk baris kosong yang tidak disimpan sebagai elemen row. Oleh itu, 316 elemen row tidak bercanggah dengan rekod terakhir pada baris 317.

### L3. Cara pembacaan yang membetulkan masalah

```python
import openpyxl

workbook = openpyxl.load_workbook(
    input_path,
    read_only=True,
    data_only=True,
)
sheet = workbook.active

# Jangan bergantung pada metadata dimension yang salah.
sheet.reset_dimensions()

rows = list(sheet.values)
headers = rows[2]
records = [
    dict(zip(headers, row))
    for row in rows[3:]
    if row and row[0]
]
```

Ini ialah pembacaan sahaja. Fail sumber tidak diubah atau ditulis semula.

### L4. Pemeriksaan jika fail kelihatan kosong pada ulangan

1. Semak saiz fail.
2. Semak nama sheet.
3. Semak dimension yang dilaporkan.
4. Jika hanya A1 tetapi fail bersaiz munasabah, jangan terus membuat kesimpulan kosong.
5. Periksa `xl/worksheets/sheet1.xml` untuk bilangan row dan cell.
6. Gunakan `reset_dimensions()` dalam mod read-only, atau kaedah pembacaan lain yang tidak bergantung pada dimension itu.
7. Sahkan header, jumlah rekod, akaun dan julat tarikh.
8. Bandingkan beberapa video dengan jadual UI sebelum menggunakan eksport sebagai sumber pengiraan utama.

---

## M. Sahkan rekod, identiti dan jumlah

### M1. Semakan tambahan yang telah selesai

- Bilangan rekod: **314**.
- Bilangan Video ID unik: **314**.
- Creator name yang ditemui: **dr.samhan sahaja**.
- Creator ID dalam eksport: `6776276676784817153`.
- Julat tarikh: **2026-10-19 hingga 2026-11-17**.
- Bilangan video dengan attributed GMV melebihi sifar: **72**.
- Jumlah GMV dan pesanan sepadan dengan hasil pembacaan UI.

### M2. Jumlah tepat daripada eksport

| Metrik | Nilai |
|---|---:|
| Video-attributed GMV | RM38,915.27 |
| Video GMV | RM35,739.25 |
| Video indirect GMV | RM3,176.02 |
| Attributed SKU orders | 509 |
| Video SKU orders | 472 |
| Video indirect SKU orders | 37 |
| Video-attributed items sold | 513 |
| Video views | 25,200,465 |
| Product Impressions | 20,596,273 |
| Product Clicks | 99,199 |

Semakan aritmetik:

```text
RM35,739.25 + RM3,176.02 = RM38,915.27
472 + 37 = 509 attributed SKU orders
```

Pecahan direct dan indirect mengikut label eksport. Attribution window terperinci tidak disahkan dalam proses ini; jangan mereka-reka tempoh attribution.

### M3. Medan tambahan dalam eksport

Eksport mempunyai 32 kolum, termasuk Likes, Comments, Shares, New followers, V-to-L clicks, Video Finish Rate dan Diagnosis. Medan tambahan ini ditemui ketika semakan dokumentasi; ia tidak bermakna semuanya sudah dianalisis secara mendalam dalam laporan asal.

---

## N. Tentukan shortlist video untuk review terperinci

### N1. Kaedah pemilihan sebenar

1. Gunakan ranking attributed GMV menurun bagi akaun dan tempoh yang betul.
2. Ambil **10 video teratas** untuk review visual dan skrip satu persatu.
3. Semak pesanan SKU, klik dan CTOR supaya satu pesanan bernilai besar tidak disamakan dengan conversion yang konsisten.
4. Bandingkan shortlist dengan baseline semua 314 video.

### N2. Liputan shortlist

```text
GMV top 10 = RM26,072.45
Pesanan SKU top 10 = 348
Bahagian GMV top 10 = 26,072.45 / 38,915.27 = 67.0%

GMV top 2 = RM14,447.20
Bahagian GMV top 2 = 37.1%
```

**314 video diperiksa pada aras data; 10 video direview secara terperinci pada aras visual dan skrip.** Baki video tidak boleh dikatakan telah ditonton atau dianalisis kandungannya satu persatu.

### N3. Cara menggunakan label winning

- Winning dari segi GMV: jualan yang tinggi dalam skop akaun dan tempoh.
- Calon content cekap: GPM atau CTOR menarik, dengan saiz sampel yang dinyatakan.
- Winning dari segi capaian: views tinggi, tetapi belum tentu kuat menjual.
- Calon ujian: bukti awal menarik tetapi jumlah klik/pesanan masih kecil.

Jangan menggabungkan empat kategori ini menjadi satu kesimpulan umum.

---

## O. Padankan setiap video dengan sumber media yang betul

### O1. Maklumat minimum sebelum membuka video

Catat untuk setiap ranking:

1. Nama creator.
2. Caption penuh atau pengenal ringkas.
3. Tarikh terbit.
4. Tempoh video.
5. GMV, pesanan, views, impresi, klik dan CTOR.
6. Status Used in ads daripada UI.
7. Video ID jika tersedia.

Video ID top 10 disahkan kemudian daripada eksport yang telah dibaca dengan betul. Cubaan menyalin ID melalui teks `ID` dalam UI asal tidak menghasilkan nilai clipboard yang boleh digunakan.

### O2. Mengapa caption sahaja tidak cukup

Beberapa video menggunakan caption promosi LIVE yang hampir sama, sedangkan isi video berbeza. Contohnya:

- Caption video #5 mengajak ke LIVE 24 Oktober, tetapi hook sebenar membincangkan ori atau fake.
- Caption video #9 juga mengajak ke LIVE, tetapi isi utamanya ialah drama pemandu lori.

Padanan yang selamat ialah **creator + Video ID + tarikh + visual**, bukan caption sahaja.

### O3. Di mana pautan video diperoleh

Pada jadual Seller Center, caption ialah pautan kepada media video di domain CDN TikTok. Agent menggunakan pautan yang benar-benar dibekalkan oleh UI, bukan meneka URL media.

Pautan CDN mengandungi parameter sementara seperti masa luput dan signature. Ia tidak disalin ke dalam dokumen ini kerana ia mudah luput dan bukan pautan rujukan kekal.

---

## P. Buka dan muat turun media untuk pemeriksaan

### P1. Aliran yang berjaya

1. Klik pautan caption video dalam Seller Center.
2. Periksa senarai tab jika halaman asal tidak berubah.
3. Pilih tab video yang baru dibuka.
4. Sahkan player video wujud dan media yang dipaparkan sepadan dengan rekod ranking.
5. Muat turun media melalui elemen `video` pada player.
6. Catat path yang dikembalikan oleh tool, bukan nama fail yang diandaikan.
7. Ulang bagi video seterusnya.

Contoh:

```javascript
await videoTab.goto(observedVideoUrl);
await videoTab.getAXState();

const downloadedPath = await videoTab.playwright
  .locator("video")
  .downloadMedia({ timeout: 20000 });
```

`observedVideoUrl` mesti berasal daripada pautan baris yang telah diperiksa. Arahan ini tidak bermakna boleh membaca endpoint tersembunyi atau memintas login.

### P2. Cubaan yang tidak konsisten

Muat turun terus melalui link caption dengan `downloadMedia()` berjaya untuk satu video, tetapi beberapa video lain mengalami timeout. Kaedah yang kemudian berjaya secara konsisten ialah membuka URL tersebut dalam tab video dahulu, kemudian memuat turun elemen `video`.

### P3. Pemetaan fail sebenar sesi

| Ranking | Nama fail tempatan yang dikembalikan |
|---|---|
| 1 | `download.mp4` |
| 2 | `download (1).mp4` |
| 3 | `download (2).mp4` |
| 4 | `download (3).mp4` |
| 5 | `download (4).mp4` |
| 6 | `download (5).mp4` |
| 7 | `download (6).mp4` |
| 8 | `download (7).mp4` |
| 9 | `download (8).mp4` |
| 10 | `download (9).mp4` |

Nama ini kebetulan terhasil daripada urutan muat turun sesi tersebut. Untuk ulangan, simpan pemetaan ranking–Video ID–path sebenar. Jangan menganggap nama `download (3).mp4` sentiasa merujuk kepada ranking 4.

### P4. Pengurusan tab

Tab Seller Center ditandakan sebagai deliverable supaya pengguna boleh membuka semula paparan analisis. Kerja UI ditutup dengan completion summary selepas data dan media yang diperlukan diperoleh. Penyelesaian kerja UI bukan bermakna semua pemprosesan video setempat telah selesai pada saat itu.

---

## Q. Cuba transkripsi audio dan rekod batasnya

### Q1. Video pertama

1. Fail video #1 dihantar kepada tool transkripsi Descript yang tersambung.
2. Bahasa ditetapkan kepada Bahasa Melayu (`ms`).
3. Format output ialah teks.
4. Speaker labels dimatikan.
5. Timecode diminta pada sela tiga saat.
6. Tool menghasilkan job ID dan projek transkripsi.
7. Agent menunggu job sehingga status berhenti dengan hasil `success`.
8. Agent mengeksport transkrip daripada composition yang dihasilkan.

Rujukan projek yang telah diwujudkan:

```text
https://web.descript.com/197d2fc3-128d-469a-88e1-f3a130a2ecec/3f74e
```

### Q2. Jangan anggap transkrip mesin sentiasa betul

Transkrip automatik video pertama mentafsir satu perkataan sebagai “melawak”, sedangkan teks komen pada video menunjukkan “merawat”. Ejaan dan maksud perlu dibandingkan dengan visual, sari kata dan konteks sumber. Pembetulan tidak boleh dibuat hanya berdasarkan apa yang agent rasa sepatutnya disebut.

### Q3. Percubaan untuk baki sembilan video

1. Baki sembilan fail cuba diimport ke projek transkripsi yang sama, dengan composition berasingan mengikut ranking.
2. Descript menolak permintaan kerana **media minutes tidak mencukupi**.
3. Tiada transkrip audio penuh bagi baki sembilan video diperoleh melalui percubaan itu.
4. Agent memaklumkan batas tersebut dan meneruskan pemeriksaan melalui visual serta sari kata.

### Q4. Perbezaan yang mesti dikekalkan dalam laporan

| Jenis bahan | Apa yang boleh disimpulkan |
|---|---|
| Transkrip audio yang berjaya dieksport | Kandungan pertuturan yang ditafsir sistem, masih perlu semakan ralat |
| Sari kata yang kelihatan | Teks yang benar-benar dipaparkan dalam video |
| Caption hantaran | Teks penerangan hantaran; tidak semestinya dialog |
| Rumusan agent | Parafrasa atau interpretasi, mesti dilabel sebagai rumusan |

---

## R. Ekstrak bingkai video secara setempat

### R1. Mengapa bingkai diperlukan

Player browser membolehkan media dibuka, tetapi pemeriksaan visual yang tersusun diperlukan untuk membandingkan hook, produk, bukti, peralihan shot dan CTA bagi sepuluh video. Bingkai juga menyediakan asas membaca sari kata apabila transkripsi audio tidak lengkap.

### R2. Persediaan persekitaran yang dibuat

1. Agent memeriksa ketersediaan `ffmpeg`, `ffprobe` dan Python.
2. `ffmpeg` serta `ffprobe` tidak ditemui dalam lokasi executable yang diperiksa.
3. Runtime Python yang dibekalkan diperiksa untuk pustaka berkaitan.
4. Swift tersedia pada Mac.
5. Agent menyediakan skrip kecil menggunakan **AVFoundation**, **ImageIO** dan **UniformTypeIdentifiers** untuk membaca video tempatan dan menyimpan bingkai.

### R3. Parameter pengekstrakan sebenar

```text
Masa sampel pertama: 0.5 saat
Sela: setiap 1.0 saat
Masa berikutnya: 1.5s, 2.5s, 3.5s, ... sehingga sebelum tamat
Saiz maksimum: 540 × 960 piksel
Orientasi video: ikut preferred track transform
Tolerance masa: sifar dalam permintaan pengekstrakan
Jumlah bingkai berjaya: 243
```

Nama bingkai menggabungkan ranking dan masa, contohnya:

```text
v01_000.5.png
v01_001.5.png
v02_010.5.png
```

### R4. Durasi media yang dibaca

| Video | Durasi media |
|---|---:|
| 1 | 15.000s |
| 2 | 34.200s |
| 3 | 20.873s |
| 4 | 26.306s |
| 5 | 22.244s |
| 6 | 24.636s |
| 7 | 13.534s |
| 8 | 21.221s |
| 9 | 46.672s |
| 10 | 17.786s |

Durasi ini lebih tepat daripada label ringkas seperti 20s atau 26s pada jadual UI.

### R5. Halangan sandbox dan tindakan sebenar

- Cubaan Swift dalam sandbox menghasilkan ralat akses cache sistem dan ralat decode.
- Command yang diperlukan dijalankan semula melalui mekanisme escalation dengan penjelasan tujuan.
- Pengekstrakan yang berjaya ialah proses yang mempunyai akses yang diperlukan.
- Proses asal yang gagal tidak dianggap sebagai bukti pengekstrakan berjaya hanya kerana program mencapai akhir.

### R6. PyAV sebagai laluan alternatif yang disediakan

Semasa menunggu pemprosesan Swift, PyAV cuba dipasang ke direktori sementara. Cubaan rangkaian dalam sandbox gagal, kemudian pemasangan melalui escalation berjaya. Namun bingkai yang digunakan untuk review ini akhirnya datang daripada AVFoundation; tidak tepat untuk mengatakan PyAV menghasilkan bingkai tersebut.

### R7. Batas teknik ini

Sampel satu bingkai sesaat boleh terlepas teks atau peralihan yang muncul sangat singkat. Ia juga tidak mengukur intonasi, muzik, rentak audio atau pertuturan tanpa sari kata. Jika sesuatu keputusan bergantung pada unsur itu, perlu semak bahagian media tersebut atau dapatkan transkripsi audio penuh.

---

## S. Baca sari kata dan bandingkan visual

### S1. Contact sheet

Agent menggunakan Python dan Pillow untuk menghasilkan helaian perbandingan bingkai bagi semua sepuluh video pada:

- 1.5 saat — untuk melihat pembukaan.
- 5.5 saat — untuk melihat jawapan atau perkembangan awal.
- 10.5 saat — untuk melihat penerangan, bukti atau CTA awal.

Setiap gambar dilabel dengan ranking video dan timestamp. Ini mengelakkan bingkai daripada video berbeza tersalah dipadankan.

### S2. OCR

1. Semua 243 bingkai dibaca menggunakan Apple Vision `VNRecognizeTextRequest`.
2. Recognition level ditetapkan kepada `accurate`.
3. Language correction dimatikan.
4. Recognition language digunakan sebagai `en-US`; teks Bahasa Melayu masih dibaca sebagai tulisan Latin, tetapi ketepatan bahasa tidak dianggap sempurna.
5. Output menyimpan nama bingkai, teks, confidence dan kedudukan teks.
6. Hasil disimpan sebagai rekod berstruktur dalam `ocr.json`.

### S3. Mengurangkan bunyi dalam output

Kotak produk, logo dan tulisan latar sering menghasilkan teks OCR berulang atau salah. Untuk pemeriksaan:

1. Kumpulkan bingkai mengikut ranking video.
2. Susun mengikut masa.
3. Paparkan teks baharu yang belum muncul dalam video sama sebagai bantuan membaca.
4. Bezakan sari kata/dialog daripada teks packaging, papan harga dan paparan kedai.
5. Bandingkan petikan penting dengan bingkai sebenar.

Kaedah membuang teks berulang ialah alat bantu review sahaja. Ia bukan cara menghasilkan transkrip penuh kerana perkataan yang diulang dalam pertuturan boleh hilang daripada paparan ringkas itu.

### S4. Jika OCR gagal

Cubaan OCR dalam sandbox gagal dengan ralat pixel buffer. Proses dijalankan semula dengan akses yang diperlukan dan akhirnya menghasilkan 243 rekod bingkai. Hanya hasil proses yang berjaya digunakan.

---

## T. Tukar pemerhatian video kepada struktur skrip

Untuk setiap video, bina peta berikut mengikut urutan sebenar:

| Bahagian | Soalan yang ditanya ketika review |
|---|---|
| Hook | Apakah ayat atau visual pertama yang memberi sebab untuk berhenti scroll? |
| Masalah/soalan | Kebimbangan pembeli apa yang disentuh? |
| Jawapan | Adakah jawapan terus diberikan atau ditangguhkan? |
| Produk | Bilakah produk mula kelihatan? Adakah ia jelas? |
| Penerangan | Apakah maklumat yang diberi: formulasi, cara bancuh, harga atau tempat membeli? |
| Bukti | Adakah ada demonstrasi, rakaman skrin, komen atau paparan produk? |
| Tawaran | Adakah harga, bundle, pelanjutan promo atau pelancaran ditunjukkan? |
| CTA | Adakah diminta klik beg kuning, masuk LIVE atau tindakan lain? |
| Pelaksanaan | Bilangan penyampai, close-up, gerak tangan, posisi produk, teks dan perubahan shot |
| Had | Bahagian audio/visual mana belum dapat dipastikan? |

### T1. Tiga lapisan penulisan yang berbeza

1. **Bukti:** “Komen pada skrin bertanya berapa jam sebelum kesan dirasai.”
2. **Interpretasi:** “Video ini menangani keraguan pembeli tentang jangkaan penggunaan.”
3. **Cadangan ujian:** “Uji soalan pembeli lain menggunakan struktur jawapan yang sama.”

Jangan menulis interpretasi sebagai fakta sebab-akibat yang sudah terbukti.

### T2. Cara menulis petikan

- Gunakan tanda petikan hanya untuk teks atau pertuturan yang dapat disahkan.
- Gunakan “ringkasan aliran skrip” untuk gabungan beberapa bahagian yang diparafrasa.
- Jangan mencipta ayat penghubung kemudian menyatakannya sebagai transkrip asal.
- Jangan menyamakan semua dakwaan dalam video dengan fakta produk yang sudah dibuktikan.

---

## U. Kira metrik dengan denominator yang betul

### U1. Formula utama

```text
Bahagian GMV video = GMV video / jumlah GMV akaun × 100

Bahagian GMV top 10 = jumlah GMV top 10 / jumlah GMV akaun × 100

CTOR = Attributed SKU orders / Product Clicks × 100

GPM = Video-attributed GMV / Video views × 1,000

Nisbah klik/impresi produk = Product Clicks / Product Impressions × 100

CTR video = Product Clicks / Video views × 100
```

CTOR, GPM dan CTR video di atas sepadan dengan nilai eksport top 10 selepas pembundaran. Untuk akaun atau laporan lain, semak definisi medan platform sebelum menggunakannya.

### U2. Perbezaan CTR yang mesti dinyatakan

Contoh video #1:

```text
Product Clicks = 4,148
Product Impressions = 240,617
Video views = 223,542

Klik / impresi produk = 4,148 / 240,617 × 100 ≈ 1.72%
CTR video = 4,148 / 223,542 × 100 ≈ 1.86%
```

Kedua-duanya sah sebagai nisbah yang berlainan. Menamakan kedua-duanya “CTR” tanpa menerangkan denominator akan mengelirukan pembaca.

### U3. Gunakan data tepat, bukan paparan K/M, jika eksport tersedia

Paparan UI memendekkan nilai, contohnya `2.84M`. Pengiraan daripada nilai pendek itu hanya anggaran. Selepas eksport boleh dibaca, gunakan `2,837,839` bagi video #9.

Dalam sesi asal, satu fungsi parsing awal tersalah membuang huruf `M` kerana cuba membersihkan mata wang `RM`. Ralat ini dikesan apabila nisbah menjadi tidak munasabah, kemudian dibetulkan sebelum rumusan pengguna diberikan.

Contoh parsing yang membezakan prefix mata wang daripada suffix juta:

```javascript
function parseDisplayNumber(value) {
  const text = String(value)
    .trim()
    .replace(/^RM\s*/, "")
    .replace(/[,\s%]/g, "");
  const multiplier = text.endsWith("M") ? 1e6
    : text.endsWith("K") ? 1e3
    : 1;
  return Number.parseFloat(text) * multiplier;
}
```

Dalam contoh ini, `4%` menjadi angka 4, bukan pecahan 0.04. Bahagikan dengan 100 jika operasi seterusnya memerlukan pecahan. Nilai kosong, `—` atau tidak tersedia perlu dikendalikan secara berasingan dan tidak ditukar secara automatik menjadi sifar.

### U4. Jangan puratakan peratus video secara mudah

Untuk kadar keseluruhan:

```text
CTOR keseluruhan = jumlah pesanan SKU / jumlah klik × 100
```

Bukan jumlah semua CTOR dibahagi jumlah video. Video dengan dua klik tidak patut diberi berat sama dengan video yang mempunyai ribuan klik.

### U5. Saiz sampel

CTOR 8.82% daripada 102 klik ialah maklumat yang berguna, tetapi lebih mudah berubah berbanding kadar daripada ribuan klik. Nyatakan jumlah klik dan pesanan bersama kadar, khususnya apabila mencadangkan ujian seterusnya.

---

## V. Kaitkan data dengan kandungan tanpa membuat dakwaan berlebihan

### V1. Corak tafsiran

| Corak metrik | Perkara yang perlu disiasat dalam video |
|---|---|
| GMV dan pesanan tinggi | Adakah isu pembeli jelas, tawaran kuat, capaian besar atau penggunaan iklan membantu? |
| GPM tinggi | Adakah penonton yang sampai lebih dekat kepada keputusan membeli? |
| Klik/impresi tinggi, CTOR rendah | Adakah mesej harga atau rasa ingin tahu membawa klik tetapi kurang sepadan dengan halaman produk? |
| Views tinggi, pesanan rendah | Adakah content menarik penonton umum atau meminta tindakan lain seperti masuk LIVE? |
| CTOR tinggi, klik sedikit | Adakah ini calon ujian yang menjanjikan tetapi belum cukup sampel? |
| Video lama masih menjual | Adakah soalan dan struktur content masih relevan sepanjang masa? |

### V2. Faktor yang tidak dipisahkan dalam sesi ini

- Belanja iklan setiap video.
- Sasaran audience dan delivery iklan.
- Bahagian organic berbanding paid.
- Harga dan voucher yang benar-benar diterima setiap pembeli.
- Perubahan stok atau variasi produk sepanjang tempoh.
- Kesan content lain sebelum pembelian.
- Attribution window terperinci.
- Purata watch time dan retention curve mengikut saat.

`Video Finish Rate` tersedia dalam eksport yang dipulihkan, tetapi ia tidak menggantikan retention curve dan tidak membuktikan bahawa hook tertentu menyebabkan prestasi jualan.

### V3. Jenis kesimpulan yang sesuai

Sesuai: “Struktur ini ialah hipotesis kreatif yang wajar diuji semula kerana kandungannya menjawab kebimbangan pembeli dan metriknya menarik.”

Tidak sesuai: “Ayat ini pasti menyebabkan jualan” atau “video ini paling untung” apabila kos dan ujian sebab-akibat tidak tersedia.

---

## W. Rekod aliran analisis setiap video

### W0. Data tepat top 10

Nilai di bawah disahkan daripada eksport semasa penyediaan dokumen. Status Used in ads untuk kesemua top 10 telah diperhatikan sebagai **Yes** dalam UI sesi asal.

| # | Pengenal ringkas | GMV attributed | SKU orders | Views tepat | Klik produk | CTOR | GPM |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Reply “merawat adik?” | RM11,050.27 | 166 | 223,542 | 4,148 | 4.00% | RM49.43 |
| 2 | Reply “berapa jam effect?” | RM3,396.93 | 44 | 19,915 | 725 | 6.07% | RM170.57 |
| 3 | Sambung promo anniversary | RM1,911.24 | 23 | 125,974 | 1,060 | 2.17% | RM15.17 |
| 4 | Demonstrasi bancuh | RM1,859.95 | 25 | 35,441 | 710 | 3.52% | RM52.48 |
| 5 | Ori/fake, versi berdiri | RM1,746.73 | 23 | 821,059 | 778 | 2.96% | RM2.13 |
| 6 | Ori/fake, versi meja | RM1,465.37 | 16 | 16,025 | 401 | 3.99% | RM91.44 |
| 7 | Pelancaran HIMCocoMax | RM1,279.62 | 13 | 230,881 | 1,518 | 0.86% | RM5.54 |
| 8 | Harga/kualiti premium | RM1,232.91 | 13 | 176,876 | 1,113 | 1.17% | RM6.97 |
| 9 | Drama pemandu lori | RM1,169.54 | 16 | 2,837,839 | 33,028 | 0.05% | RM0.41 |
| 10 | Reply “terus rasa segar?” | RM959.89 | 9 | 6,135 | 102 | 8.82% | RM156.46 |

### W1. Video #1 — Reply “coffee ni merawat adik ke?”

**Identiti:** Video ID `7372860202367913232`; diterbitkan 25 Mei 2024, 17:03:20; durasi 15.000 saat.

**Aliran review:**

1. Padankan caption reply kepada `@aizat` dengan baris GMV tertinggi.
2. Semak komen yang kelihatan pada pembukaan: “coffee ni merawat adik ke?”
3. Perhatikan Dr. Samhan duduk dengan produk dan mug di hadapan, memakai baju merah.
4. Baca susunan jawapan: soalan pembeli, jawapan terus, penerangan formulasi/dos, kemudian CTA.
5. Semak bahawa produk berada dalam frame sepanjang bahagian penerangan.
6. Bandingkan transkrip automatik dengan teks visual, termasuk ralat “melawak/merawat”.
7. Kenal pasti CTA sekitar penghujung video: beg kuning.
8. Hubungkan kandungan dengan 166 pesanan dan RM11,050.27 GMV.

**Apa yang dikeluarkan:**

- Hook: soalan pembeli yang khusus.
- Struktur: soalan → jawapan Dr. Samhan → penerangan produk → CTA.
- Unsur visual: produk jelas, bercakap terus kepada kamera, suasana ringkas.
- Hipotesis: video mengurangkan satu keraguan yang dekat dengan keputusan membeli dalam masa singkat.
- Keputusan: pemenang GMV utama, menyumbang kira-kira 28.4% GMV akaun dalam tempoh ini.
- Had: dakwaan kesihatan dalam dialog tidak disahkan oleh data Analytics; kesan iklan belum diasingkan.

### W2. Video #2 — Reply “berapa jam baru effect?”

**Identiti:** Video ID `7368404788473564436`; diterbitkan 13 Mei 2024, 16:54:03; durasi 34.200 saat.

**Aliran review:**

1. Baca soalan dalam kotak komen tentang masa sebelum manfaat dirasai.
2. Perhatikan set meja, mug dan kotak produk yang serupa dengan video #1.
3. Ikuti sari kata tentang perbezaan pengalaman individu dan tempoh penggunaan.
4. Kenal pasti penekanan pada perkataan “konsisten”.
5. Catat penerangan formulasi sebelum CTA di penghujung.
6. Bezakan isi tersebut daripada caption ringkas yang hanya menyatakan konsisten.
7. Bandingkan 44 pesanan daripada 19,915 views dengan video lain.
8. Gunakan GPM tepat RM170.57 selepas eksport dipulihkan.

**Apa yang dikeluarkan:**

- Hook: jangkaan masa penggunaan, bukan harga.
- Halangan pembeli: ketidakpastian tentang apa yang patut dijangka selepas mencuba.
- Hipotesis: penerangan yang khusus mungkin menarik audience yang sudah berminat membeli.
- Keputusan: GPM tertinggi dalam top 10; struktur jawapan soalan layak diutamakan untuk ujian.
- Had: review skrip menggunakan sari kata/bingkai, bukan transkrip audio penuh; keberkesanan produk tidak dibuktikan oleh prestasi content.

### W3. Video #3 — Pelanjutan promo anniversary

**Identiti:** Video ID `7629397596867480840`; diterbitkan 17 April 2026, 07:00:00; durasi 20.873 saat.

**Aliran review:**

1. Perhatikan pembukaan dengan suasana sambutan, belon dan produk.
2. Kenal pasti papan harga sebelum/selepas promosi dalam frame.
3. Baca skrip tentang permintaan penonton untuk melanjutkan promosi.
4. Catat petikan “So kita akan extend lagi”.
5. Ikuti penerangan kepada mereka yang tidak sempat membeli.
6. Sahkan CTA akhir menuju beg kuning.
7. Bandingkan RM1,911.24, 23 pesanan dan CTOR 2.17%.

**Apa yang dikeluarkan:**

- Hook/angle: promosi dilanjutkan atas permintaan.
- Bukti tawaran: harga dapat dilihat, bukan hanya disebut “murah”.
- Hipotesis: perbandingan harga dan peluang membeli semula membantu keputusan pembeli.
- Keputusan: format tawaran yang jelas boleh diuji semula apabila ada promosi sebenar.
- Had: angka harga dan tarikh dalam video ialah konteks promosi asal; jangan menyalinnya sebagai tawaran semasa.

### W4. Video #4 — Demonstrasi bancuh HIMCoffee

**Identiti:** Video ID `7630764149554957586`; diterbitkan 20 April 2026, 17:02:16; durasi 26.306 saat.

**Aliran review:**

1. Perhatikan hook tindakan: sachet terus dibuka dan dituang.
2. Baca teks tentang cara bancuh dan kandungan sachet.
3. Catat ramuan yang disebut dalam sari kata: Tongkat Ali, Ubi Jaga dan guarana.
4. Ikuti close-up semasa membancuh.
5. Kenal pasti respons deria tentang bau minuman.
6. Catat CTA akhir mengajak masuk LIVE.
7. Bandingkan 25 pesanan daripada 35,441 views, CTOR 3.52% dan GPM RM52.48.

**Apa yang dikeluarkan:**

- Hook: demonstrasi penggunaan serta-merta.
- Visual: produk di tangan, close-up bahan dan bancuhan.
- Hipotesis: demonstrasi membantu penonton membayangkan penggunaan sebenar.
- Keputusan: calon format demonstrasi yang baik untuk digabungkan dengan CTA yang jelas.
- Had: isi ramuan yang disebut direkod sebagai kandungan video; dokumen ini tidak menggantikan pengesahan label produk semasa.

### W5. Video #5 — Ori atau fake, versi berdiri

**Identiti:** Video ID `7699343513548295442`; diterbitkan 22 Oktober 2026, 13:00:00; durasi 22.244 saat.

**Aliran review:**

1. Bandingkan caption promosi LIVE dengan kandungan sebenar.
2. Baca hook visual tentang cara mengetahui coffee ori atau fake.
3. Perhatikan Dr. Samhan berdiri dengan sijil pada latar.
4. Ikuti perubahan kepada paparan carian kedai dan tanda Mall.
5. Catat bagaimana nama kedai ditunjukkan sebagai panduan tempat membeli.
6. Kenal pasti penutup dengan jemputan LIVE dan hadiah.
7. Bandingkan 821,059 views dengan 778 klik produk dan 23 pesanan.

**Apa yang dikeluarkan:**

- Hook: kebimbangan keaslian produk.
- Bukti visual: rakaman skrin kedai.
- CTA: menuju LIVE.
- Keputusan: memberi GMV yang tinggi secara relatif, tetapi GPM hanya RM2.13 dan kadar klik produk rendah.
- Hipotesis: destinasi CTA dan jenis audience mungkin menjelaskan beza antara capaian dengan tindakan membeli.
- Had: sumbangan ke jualan LIVE tidak dibina semula; jangan mengisytiharkan video gagal bagi semua objektif.

### W6. Video #6 — Reply ori atau fake, versi meja

**Identiti:** Video ID `7697902732681727239`; diterbitkan 18 Oktober 2026, 16:00:00; durasi 24.636 saat.

**Aliran review:**

1. Baca komen pembeli tentang cara mengenali produk original.
2. Perhatikan Dr. Samhan di meja sambil merujuk soalan pada telefon.
3. Ikuti langkah semakan kedai yang diterangkan.
4. Periksa bukti skrin seperti nama kedai, sold count dan tanda Mall.
5. Catat cadangan membeli ketika beliau LIVE serta penutup berkaitan mendapatkan produk.
6. Bandingkan angle sama dengan video #5, sambil mencatat bahawa tarikh, audience dan delivery tidak dikawal.
7. Semak 16,025 views, 401 klik, 16 pesanan, CTOR 3.99% dan GPM RM91.44.

**Apa yang dikeluarkan:**

- Struktur: komen → panduan semakan → bukti skrin → tindakan membeli.
- Keputusan: jauh lebih cekap dari segi GMV per 1,000 views berbanding versi berdiri.
- Hipotesis: soalan sebenar dan langkah semakan yang konkrit mungkin menarik pembeli yang lebih bersedia.
- Had: ini perbandingan pemerhatian, bukan A/B test yang membuktikan posisi duduk atau ayat tertentu sebagai punca.

### W7. Video #7 — Pelancaran HIMCocoMax

**Identiti:** Video ID `7647458240229362952`; diterbitkan 4 Jun 2026, 17:30:00; durasi 13.534 saat.

**Aliran review:**

1. Perhatikan dua penyampai dan kotak produk dalam jumlah banyak.
2. Kenal pasti visual serta teks pelancaran HIMCocoMax.
3. Baca skrip yang mengajak melihat harga di beg kuning.
4. Catat seruan segera pada penghujung.
5. Perhatikan end card mengandungi dua arah tindakan: tekan beg kuning dan masuk LIVE untuk lebih jimat.
6. Bandingkan 230,881 views, 1,518 klik, 13 pesanan dan CTOR 0.86%.

**Apa yang dikeluarkan:**

- Angle: pelancaran dan rasa ingin tahu tentang harga.
- Visual: produk dominan, dua penyampai, suasana acara.
- Keputusan: capaian kuat, conversion selepas klik lebih rendah daripada beberapa video soal jawab.
- Cadangan ujian: jelaskan tawaran dan pilih CTA utama yang mudah diikuti.
- Had: belum boleh menentukan sama ada halangan sebenar ialah skrip, harga, variasi produk atau audience.

### W8. Video #8 — Harga dan kualiti premium

**Identiti:** Video ID `7642934217793359122`; diterbitkan 23 Mei 2026, 12:08:18; durasi 21.221 saat.

**Aliran review:**

1. Perhatikan dua penyampai memegang produk dengan latar promosi Aidiladha.
2. Ikuti perkataan pada skrin yang menekankan harga dan sekotak.
3. Catat peralihan kepada kualiti, premium dan Arabika.
4. Bezakan harga yang muncul dalam video daripada harga semasa halaman produk.
5. Semak bahawa teks harga yang tidak lengkap tidak ditafsir sebagai bundle tertentu tanpa bukti.
6. Kira klik/impresi produk daripada 1,113 klik dan 24,932 impresi: kira-kira 4.46%.
7. Bandingkan kadar tersebut dengan CTOR 1.17% dan 13 pesanan.

**Apa yang dikeluarkan:**

- Angle: harga disokong penerangan kualiti.
- Keputusan: nisbah klik/impresi produk tertinggi dalam top 10, tetapi conversion selepas klik lebih rendah.
- Hipotesis: mesej berjaya mendorong semakan produk, sementara padanan tawaran selepas klik perlu diperiksa.
- Had: CTR video platform ialah 0.63%, bukan 4.46%, kerana denominatornya berbeza. Semakan checkout atau harga pembeli sebenar belum dibuat.

### W9. Video #9 — Drama “Pemandu Lori Microsleep”

**Identiti:** Video ID `7697854026745990407`; diterbitkan 18 Oktober 2026, 12:05:14; durasi 46.672 saat.

**Aliran review:**

1. Perhatikan hook visual pemandu mengantuk dan tajuk microsleep.
2. Ikuti perkembangan cerita: perjalanan jauh, keletihan dan perbualan watak.
3. Catat masa produk mula diperkenalkan, sekitar bahagian pertengahan cerita.
4. Ikuti adegan minum dan perubahan yang digambarkan oleh skrip.
5. Kenal pasti teks CTA beg kuning pada penghujung.
6. Catat end card promosi/hadiah selepas cerita.
7. Bandingkan 2,837,839 views dan 33,028 klik dengan hanya 16 pesanan.
8. Semak CTOR 0.05% dan GPM RM0.41.

**Apa yang dikeluarkan:**

- Hook: situasi dramatik yang mudah difahami.
- Struktur: masalah → cerita → pengenalan produk → penggunaan → CTA.
- Keputusan: kuat dari segi capaian, tetapi lemah dari segi kecekapan jualan dalam metrik yang dipilih.
- Cadangan: jangan menjadikan views sahaja sebagai sebab mengutamakan produksi format ini untuk objektif jualan.
- Had: jualan atau kesan kesedaran di luar attribution yang diperhatikan belum dinilai. Dakwaan berkaitan microsleep dalam cerita bukan fakta kesihatan yang disahkan oleh analisis ini.

### W10. Video #10 — Reply “minum terus rasa segar?”

**Identiti:** Video ID `7704238900478315784`; diterbitkan 4 November 2026, 21:00:00; durasi 17.786 saat.

**Aliran review:**

1. Baca komen pada pembukaan tentang sama ada minum terus terasa segar.
2. Perhatikan Dr. Samhan bercakap dengan produk dan minuman berdekatan.
3. Ikuti peralihan kepada visual minum.
4. Catat sari kata tentang bancuhan, hirupan dan pengalaman rasa.
5. Kenal pasti teks “Lebih Segar” dan “Lebih Bertenaga” sebagai teks video, bukan pengesahan hasil produk.
6. Sahkan CTA “Klik Beg Kuning Sekarang”.
7. Bandingkan 6,135 views, 102 klik dan 9 pesanan.
8. Catat CTOR 8.82% serta GPM RM156.46, dengan saiz sampel kecil dinyatakan bersama.

**Apa yang dikeluarkan:**

- Struktur: soalan pembeli → jawapan → visual pengalaman minum → CTA.
- Keputusan: calon ujian conversion yang menjanjikan; CTOR tertinggi dalam top 10 ini.
- Cadangan ujian: kekalkan soalan pembuka, ubah satu unsur pada satu masa seperti visual demonstrasi atau CTA.
- Had: 102 klik dan 9 pesanan belum membuktikan prestasi akan kekal apabila delivery diperbesar.

### W11. Medan tambahan yang ditemui selepas bacaan eksport dibetulkan

| # | CTR video dalam eksport | Video Finish Rate |
|---|---:|---:|
| 1 | 1.86% | 5.73% |
| 2 | 3.64% | 5.19% |
| 3 | 0.84% | 4.54% |
| 4 | 2.00% | 5.52% |
| 5 | 0.09% | 0.34% |
| 6 | 2.50% | 4.55% |
| 7 | 0.66% | 3.26% |
| 8 | 0.63% | 3.02% |
| 9 | 1.16% | 0.50% |
| 10 | 1.66% | 4.47% |

Jadual ini ialah pengesahan tambahan, bukan asas yang telah digunakan dalam rumusan asal. Durasi video, penggunaan iklan dan jenis audience berbeza; kadar tamat tontonan tidak patut dibandingkan tanpa konteks itu.

---

## X. Hasilkan format laporan yang konsisten

### X1. Urutan laporan

1. Nyatakan akaun tepat, tarikh dan objektif.
2. Beri jumlah baseline akaun.
3. Nyatakan bilangan video yang direview terperinci dan liputan GMV.
4. Paparkan ranking dengan metrik yang konsisten.
5. Tulis analisis satu persatu dengan struktur yang sama.
6. Rumuskan keutamaan content yang wajar diuji.
7. Nyatakan data atau bahagian media yang belum dapat disahkan.

### X2. Template setiap video

```markdown
### Video [nombor] — [nama yang menerangkan isi sebenar]

- Akaun:
- Video ID:
- Tarikh terbit dan durasi:
- Tempoh metrik:
- GMV attributed / pesanan SKU / views / klik / CTOR / GPM:
- Used in ads:

**Bukti kandungan**
- Hook yang disahkan:
- Aliran skrip:
- Visual/demonstrasi/bukti yang kelihatan:
- Tawaran dan CTA:

**Tafsiran prestasi**
- Apa yang kuat berdasarkan metrik:
- Bahagian perjalanan pembelian yang kelihatan lemah:
- Hipotesis tentang sumbangan content:

**Keputusan**
- Ulang / uji variasi / ubah tawaran / nilai semula:
- Unsur yang dikekalkan:
- Unsur yang diuji:
- Had data dan saiz sampel:
```

### X3. Hasil yang dikeluarkan dalam perbualan

- Ranking top 10 mengikut attributed GMV.
- Review hook, skrip, visual dan CTA setiap video.
- Penjelasan bahawa reply komen dan soalan pembeli ialah calon struktur yang kuat.
- Perbandingan content tinggi views dengan content yang lebih cekap menjana jualan.
- Cadangan mengutamakan struktur video #1, #2, #6, #10 dan demonstrasi #4 untuk ujian seterusnya.
- Penjelasan bahawa tiada ROAS atau keuntungan setiap video dapat ditentukan daripada data yang digunakan.

### X4. Cara menulis “kenapa winning”

Gunakan gabungan **bukti kandungan + metrik + hipotesis + batas**.

Contoh:

> Video menjawab soalan pembeli yang khusus dan menunjukkan produk sepanjang penerangan. Ia menghasilkan 166 pesanan SKU dalam tempoh analisis. Struktur tersebut munasabah sebagai faktor yang membantu keputusan membeli, tetapi data ini belum mengasingkan pengaruh iklan atau membuktikan bahawa satu ayat tertentu menyebabkan jualan.

---

## Y. Turunkan struktur winning kepada skrip baharu

### Y1. Permintaan susulan pengguna

Selepas analisis, pengguna meminta satu skrip baharu berdasarkan video nombor satu.

### Y2. Elemen yang diambil daripada video asal

- Soalan yang khusus pada permulaan.
- Jawapan terus oleh Dr. Samhan.
- Penerangan ringkas tentang produk.
- Produk berada dalam frame.
- CTA beg kuning yang jelas.
- Durasi sasaran sekitar 15–20 saat.

Skrip baharu mengambil struktur ini. Ia bukan transkrip video asal dan belum mempunyai bukti prestasi.

### Y3. Skrip baharu yang telah diberikan dalam perbualan

| Masa cadangan | Dialog |
|---|---|
| 0–3s | “Doktor, HIMCoffee ni memang khas untuk lelaki ke?” |
| 3–8s | “Ya. HIMCoffee ni saya sendiri formulasikan khas untuk lelaki.” |
| 8–13s | “Dalam setiap sachet, ada Tongkat Ali dan Ubi Jaga.” |
| 13–18s | “Abang nak cuba sendiri? Tekan beg kuning sekarang.” |

### Y4. Arahan rakaman yang diberikan

1. Letakkan soalan sebagai teks besar di skrin.
2. Dr. Samhan pandang kamera ketika menjawab.
3. Angkat sachet ketika menyebut ramuan.
4. Tunjuk ke bawah ketika CTA.
5. Pastikan kotak produk kelihatan dari awal.

### Y5. Status skrip ini

Skrip ini ialah draf kreatif untuk diuji. Ia tidak dirakam, diterbitkan atau dimasukkan ke dalam iklan sepanjang perbualan ini. Maklumat produk perlu sepadan dengan label produk yang digunakan ketika penggambaran.

---

## Z. Ulang proses, periksa hasil dan tutup kerja

### Z1. Checklist akses dan skop

- [ ] Browser mengikuti pilihan terkini pengguna.
- [ ] Login selesai dan kedai yang betul kelihatan.
- [ ] Creator tepat `@dr.samhan`, bukan akaun yang namanya hampir sama.
- [ ] Julat tarikh tepat dan zon masa dicatat.
- [ ] Tarikh terbit video dibezakan daripada tempoh prestasi.
- [ ] Video Details dipilih di bawah Video, bukan LIVE Details.

### Z2. Checklist data

- [ ] Header dibaca sebelum mengekstrak cell.
- [ ] Semua halaman yang diperlukan dibaca tanpa pendua.
- [ ] Eksport dipadankan dengan akaun dan tempoh.
- [ ] Metadata dimension Excel diperiksa jika fail kelihatan kosong.
- [ ] Bilangan rekod dan Video ID unik disahkan.
- [ ] GMV attributed tidak dicampur dengan direct GMV secara berganda.
- [ ] Pesanan SKU, item dan pelanggan unik tidak disamakan.
- [ ] K/M diparse dengan betul jika hanya paparan UI tersedia.
- [ ] Angka tepat eksport digunakan apabila tersedia.
- [ ] Denominator CTR, CTOR dan GPM diterangkan.

### Z3. Checklist review video

- [ ] Setiap media dipadankan dengan ranking, Video ID dan tarikh.
- [ ] Hook sebenar dilihat, bukan disimpulkan daripada caption.
- [ ] Aliran isi, bukti, produk, tawaran dan CTA dicatat.
- [ ] Transkrip mesin diperiksa untuk kesilapan.
- [ ] OCR dibezakan daripada audio penuh.
- [ ] Teks packaging tidak tersalah dianggap sebagai dialog.
- [ ] Harga/event lama tidak dipersembahkan sebagai tawaran semasa.
- [ ] Dakwaan dalam video dibezakan daripada fakta yang telah disahkan.

### Z4. Checklist analisis

- [ ] Winning jualan dibezakan daripada winning views.
- [ ] Penggunaan iklan dicatat tanpa mereka-reka kos.
- [ ] Saiz sampel klik/pesanan dinyatakan untuk kadar yang tinggi.
- [ ] Perbandingan pemerhatian tidak dipanggil A/B test.
- [ ] Cadangan content dikaitkan dengan bukti khusus.
- [ ] Ketiadaan data penting dinyatakan dengan tepat.
- [ ] Skrip baharu dilabel sebagai draf yang belum diuji.

### Z5. Cara menangani masalah yang benar-benar berlaku dalam sesi ini

| Masalah | Diagnosis/tindakan | Hasil |
|---|---|---|
| Pengguna menukar Chrome kepada browser terbina dalam | Ikut arahan browser terkini | Analisis dibuat dalam in-app browser |
| Sesi belum login | Serahkan login kepada pengguna dan baca semula halaman selepas selesai | Kedai Dr Samhan disahkan |
| Klik Analytics tidak menukar halaman | Periksa tab, kemudian buka URL pautan yang memang diperhatikan | Halaman Analytics dimuat |
| Nama akaun tidak ada dalam Linked accounts | Periksa Affiliate accounts dan carian creator tepat | `dr.samhan` ditemui |
| Carian creator tidak segera menghasilkan keputusan | Gunakan medan carian dalam dropdown dan tunggu hasil | Penapis akaun dipilih |
| Shortcut tarikh hanya Last 28 days | Gunakan Custom dan pilih 19 Okt–17 Nov | Tempoh tepat 30 hari |
| Menunggu download selepas Export tamat masa | Periksa Exported reports dan klik Download pada laporan baharu | Fail diperoleh |
| Excel nampak hanya satu sel | Semak XML; gunakan reset_dimensions | 314 rekod dibaca dan disahkan |
| Pautan caption gagal dimuat turun terus | Buka pautan dalam player dahulu, muat turun elemen video | Sepuluh fail video diperoleh |
| Satu panggilan browser tamat masa dan sesi tool reset | Muatkan dokumentasi tool semula, sambung tab sedia ada, baca UI terkini | Kerja disambung tanpa login semula |
| Transkrip mesin mempunyai perkataan salah | Bandingkan dengan teks visual | Petikan penting diperbetulkan berdasarkan bukti |
| Kuota Descript tidak cukup | Nyatakan batas, gunakan visual/sari kata untuk baki video | Review visual selesai; transkrip audio penuh baki video tidak didakwa tersedia |
| Swift/Apple Vision disekat sandbox | Gunakan mekanisme escalation bagi command yang diperlukan | Pengekstrakan dan OCR berjaya |
| Parsing M/juta menghasilkan angka tidak munasabah | Bezakan prefix RM dengan suffix M | Pengiraan UI dibetulkan |
| Angka UI dibundarkan | Baca angka tepat eksport selepas pembetulan dimension | Nilai tepat digunakan dalam dokumen ini |

### Z6. Ringkasan aliran A–Z untuk digunakan semula

```text
Tetapkan objektif dan tempoh
→ buka browser pilihan pengguna
→ buka Seller Center Malaysia
→ pengguna login jika diperlukan
→ sahkan kedai
→ Analytics
→ LIVE & video analytics
→ Video > Details
→ Custom date range
→ Affiliate accounts jika creator berada di situ
→ cari dan pilih akaun tepat
→ sahkan header, creator dan ranking
→ baca semua halaman untuk baseline
→ Export > Exported reports > Download
→ sahkan kandungan eksport, termasuk dimension Excel
→ rekonsiliasi jumlah, ID dan akaun
→ pilih shortlist mengikut objektif
→ padankan rekod dengan pautan video
→ buka player dan muat turun media jika perlu
→ transkripsi jika tersedia
→ ekstrak bingkai dan baca sari kata/visual
→ petakan hook, isi, bukti, produk, tawaran dan CTA
→ kaitkan pemerhatian dengan metrik
→ asingkan bukti, hipotesis dan batas
→ tulis analisis satu persatu
→ tentukan struktur untuk diuji semula
→ hasilkan skrip baharu jika diminta
→ semak angka, sumber dan label sebelum menyerahkan hasil
```

---

## Lampiran 1 — Medan output minimum untuk analisis berulang

```text
analysis_date
timezone
period_start
period_end
shop_name
creator_name
creator_id
video_id
publish_time
duration_seconds
caption
used_in_ads
video_attributed_gmv
video_gmv
video_indirect_gmv
attributed_sku_orders
items_sold
video_views
product_impressions
product_clicks
ctor
gpm
platform_video_ctr
custom_product_click_impression_ratio
video_finish_rate
hook_evidence
script_sequence
visual_evidence
offer
cta
content_hypothesis
decision
sample_size_note
evidence_limitations
```

Jika sesuatu medan tidak tersedia, nyatakan `tidak tersedia` atau kosong dengan penjelasan. Jangan mengisi sifar untuk data yang hilang.

## Lampiran 2 — Rekod sumber dan hasil pemprosesan

| Sumber/hasil | Peranan | Status |
|---|---|---|
| Seller Center Video Details | Sumber UI bagi akaun, tempoh, ranking dan penanda iklan | Dibaca dalam sesi asal |
| `Video Performance List_20261118082208.xlsx` | Eksport 32 kolum dan 314 rekod | Dimuat turun dalam sesi asal; dibaca sepenuhnya ketika dokumentasi |
| Sepuluh fail MP4 | Media untuk review kandungan | Dimuat turun dalam sesi asal; tidak disertakan dalam fail MD ini |
| Projek Descript video #1 | Transkrip automatik video pertama | Berjaya, kemudian dibandingkan dengan visual |
| Import baki sembilan video ke Descript | Percubaan transkripsi tambahan | Ditolak kerana kuota; tiada transkrip lengkap diperoleh melalui percubaan itu |
| 243 bingkai PNG | Semakan visual dan input OCR | Berjaya dihasilkan secara setempat |
| Tiga contact sheet | Perbandingan visual pada 1.5s, 5.5s dan 10.5s | Digunakan untuk review |
| `ocr.json` | Teks, confidence dan kedudukan daripada setiap bingkai | Berjaya dihasilkan dan dibaca |
| Analisis dalam chat | Ranking, review top 10 dan keutamaan content | Diserahkan sebelum permintaan dokumentasi |
| Skrip baharu 15–20 saat | Draf berdasarkan struktur video #1 | Diberikan dalam chat; belum diuji prestasinya |

## Lampiran 3 — Apa yang belum dilakukan

- Tiada review visual menyeluruh bagi kesemua 314 video.
- Tiada transkrip audio penuh bagi video #2–#10 diperoleh dalam sesi asal.
- Tiada pengiraan belanja, CPA, ROAS atau keuntungan setiap video.
- Tiada pengasingan penuh prestasi organic dan paid.
- Tiada A/B test skrip baharu dijalankan.
- Tiada rakaman, penerbitan atau pelancaran iklan bagi skrip baharu.
- Tiada pengesahan saintifik terhadap dakwaan kesihatan yang terdapat dalam content asal.
- Tiada perubahan kepada tetapan, bajet, harga atau akaun Seller Center.

Dokumentasi ini mengekalkan perbezaan antara perkara yang diperhatikan, pengiraan yang disahkan, penjelasan yang masih berupa hipotesis dan tindakan yang belum dilakukan.
