# AIS Stok Opname Android — v1.1.0

Rilis perbaikan penting: menerapkan perbaikan bug & sistem pelaporan error yang sama dengan yang ditemukan di aplikasi kembarnya (AIS POS Kasir Android v1.1.0), sebagai pencegahan sebelum sempat dialami pengguna.

## Perbaikan

- **Tombol "Masuk" kini selalu memberi respons** — sebelumnya ada celah nyata (try/finally tanpa catch di beberapa tempat, termasuk saat masuk aplikasi & memulai sesi opname) yang bisa membuat aplikasi tampak diam tanpa pesan apa pun bila terjadi kegagalan jaringan tak terduga.
- **Batas waktu (timeout) 20 detik** ditambahkan ke semua permintaan jaringan — sebelumnya bila koneksi macet, aplikasi bisa menunggu tanpa batas waktu.

## Fitur Baru

### Wizard Pengaturan Server 2 Langkah
Layar masuk sekarang dipecah jadi 2 langkah: **(1) Pengaturan Server** (alamat + tombol "Tes Koneksi" wajib berhasil dulu) → **(2) Masuk**.

### Sistem Alert Error Menyeluruh
Setiap kegagalan (scan barcode gagal, gagal simpan hasil opname, gagal buka kamera, jaringan bermasalah, dll) sekarang menampilkan alert dengan penjelasan awam, langkah tindakan, detail teknis (collapsible), tombol **Salin Detail**, dan **Laporkan ke GitHub** (form issue sudah terisi otomatis).

## Instalasi

Unduh `app-debug.apk`, salin ke perangkat Android, buka untuk instal (aktifkan "Izinkan dari sumber ini" bila diminta). Bisa langsung menimpa instalasi v1.0.0 yang sudah ada.
