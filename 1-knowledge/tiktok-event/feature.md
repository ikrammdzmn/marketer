# HIMCOFFEE RACI MASTER — User Guide

Apa ni? Satu halaman web untuk rancang dan pantau semua kempen Himcoffee dari
2026 sampai 2030. Semua dalam satu tempat: kalendar kempen, siapa buat apa (RACI),
strategi 5T & 3M, dan beban kerja setiap PIC. Data tersimpan dalam browser laptop
anda sendiri — tiada upload, tiada server.

## Cara buka

1. Buka folder `tiktok-event`, kemudian buka fail **`index.html`** dalam browser
   (Chrome digalakkan). Cara paling senang: jalankan `python -m http.server` dalam
   folder repo, kemudian pergi ke `http://127.0.0.1:8000/tiktok-event/index.html`.
2. Kali pertama buka, satu popup akan minta anda cipta **Security PIN** (min 4 digit)
   + nama anda. Ini kunci mod edit untuk browser ini. Kalau tekan Skip, anda masuk
   sebagai Guest (lihat sahaja).
3. Semua auto-save — setiap taipan/edit terus tersimpan dalam browser. Jangan clear
   browser storage kalau tak nak hilang data (atau eksport CSV sebagai backup).

## Dua halaman utama

**1. Master Timeline** — gambaran besar setahun.
- Pilih tahun (2026–2030) di atas, kemudian skrol 12 kad bulan (Januari–Disember).
- Setiap kempen ada bar peratus (%) = tugasan Completed ÷ jumlah tugasan.
- Nombor **KPI Prestasi** di kanan atas = peratus siap untuk seluruh tahun.
- Klik **Buka ›** pada mana-mana kempen untuk lompat ke halaman kerjanya.
- Klik **Tambah** pada mana-mana bulan (editor sahaja) untuk daftar kempen baru.

**2. RACI Worksheet** — tempat kerja harian.
- Pilih bulan (butang bulat), kemudian pilih kempen di panel **Senarai Kempen** kiri.
- Warna label maksudnya: Double Digit (jualan 1.1–12.12) · Mega Perayaan (Raya/CNY/
  Deepavali/Xmas) · Brand Event (anniversary/personal branding) · Payday (gaji &
  hujung bulan) · Micro-Event (lain-lain). Status pula: Pending (kelabu) ·
  In Progress (kuning) · Completed (hijau).

## Strategy Blueprint (5T & 3M)

Di atas setiap kempen ada kotak strategi. Klik **Edit** (editor sahaja), isi, **Save**:
- **5T** — Target (jualan/unit), Tempoh, Timeline (fasa utama), Team (siapa terlibat),
  Tracking (cara ukur KPI).
- **3M** — Market (siapa pelanggan), Medium (saluran iklan), Message (hook/copywriting).
- Nota "Kemas kini … oleh …" di bawah tajuk tunjuk siapa terakhir sunting.

## Jadual tugasan (3 fasa)

Setiap kempen dibahagikan kepada **PRE-CAMPAIGN → LAUNCH (HARI EVENT) → POST-CAMPAIGN**.
- Tetapkan tarikh rasmi setiap fasa: klik ikon pensel ✎ di sebelah "Tetapkan Tarikh".
- Tambah tugasan: butang **＋** di baris fasa. Padam/edit: ikon 🗑 / ✎ di hujung baris.
- Tukar turutan: dropdown nombor **No** — pilih nombor baru, tugasan terus melompat
  dalam fasa yang sama (contoh: dari No.8 terus ke No.1).
- Lajur **R** = Responsible (buat kerja), **A** = Accountable (pantau/lulus).
  Nak letak ramai nama? Tekan **Enter** untuk nama baru — paparan automatik jadi
  senarai bernombor (1., 2., 3.).
- **Due** = tarikh tugasan. Kalau kosong ia tunjuk TBD.
- Cari dengan kotak search, tapis dengan dropdown status dan PIC.
- Eksport: butang **⬇** = kempen ini ke CSV (boleh buka dalam Excel),
  butang **Month** = semua kempen bulan ini ke satu CSV.

## Beban kerja PIC & Guest mode

- Kotak **Beban Kerja PIC** (kiri bawah) tunjuk siapa pikul berapa tugasan bulan ini —
  kalau seorang terlalu tinggi, agih semula sebelum burnout.
- **Guest mode (view only):** boleh lihat semua, tapi butang edit jadi ikon kunci 🔒.
  Klik **Unlock Edit Mode**, masukkan nama + PIN pasukan untuk tuntut slot editor
  (maksimum 10 editor, browser ini sahaja). Nak keluar? Klik **leave** di lencana nama,
  atau buang sesi dari panel **👥 Editors**.
- Butang **Reset all 2026–2030** kembalikan semua data kepada asal — hati-hati,
  suntingan anda akan hilang. Eksport CSV dulu sebagai backup.

## Soalan lazim

- *Data saya selamat ke?* Ya, dalam browser laptop anda. Tapi browser lain / laptop
  lain tak nampak data ini — setiap browser ada salinan sendiri.
- *Kenapa 2027–2030 kosong?* Sebab kalendar asal hanya diisi untuk 2026. Tambah
  sendiri dengan butang ＋ mengikut perancangan tahunan.
- *RACI tapi cuma ada R dan A?* Betul — versi ini hanya guna Responsible +
  Accountable mengikut PRD. Consulted/Informed belum ada.
