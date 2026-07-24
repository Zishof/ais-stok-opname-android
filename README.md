# AIS Stok Opname — Android

Aplikasi Android **khusus satu tugas**: entry stok opname (stock count/cycle count) gaya supermarket/minimarket — scan barcode, isi stok fisik, sinkron ke server. Dibangun dengan [Capacitor](https://capacitorjs.com/), memakai backend `PosApi.java` yang sama dengan [AIS POS Kasir Android](https://github.com/Zishof/ais-pos-kasir-android) & [Kasir Desktop](https://github.com/Zishof/ais-pos-kasir-desktop).

## Kenapa aplikasi terpisah (bukan menu di dalam app Kasir)?

Petugas opname biasanya BUKAN kasir yang sedang bertugas di kasir aktif — device-nya pun sering berbeda (PDT/handheld dengan scanner fisik, bukan tablet kasir). Memisahkan aplikasi membuat UI bisa 100% fokus pada satu alur kerja (scan → isi → simpan → scan lagi) tanpa gangguan navigasi menu lain, dan device-nya bisa dipasangi APK ini SAJA tanpa perlu akses ke fitur kasir.

## Fondasi Server (bukan fitur baru — sudah ada, cuma belum ada API JSON-nya)

Modul stok opname (`StokOpname`, `SesiStokOpname`, `StokOpnameScanUtil`) **sudah ada & dipakai produksi** lewat layar ZK/JSP (`StokOpnameKantinAction`, halaman "SO by Scan"). Aplikasi ini murni klien BARU dari 6 aksi `PosApi.java` baru (`so_sesi_list`, `so_sesi_mulai`, `so_sesi_selesai`, `so_produk_scan`, `so_simpan`, `so_ringkasan`) yang murni proksi tipis ke logika yang sudah ada — bukan logika bisnis baru.

## Cara Scan Barcode (2 mode)

1. **Hardware scanner/PDT (default/utama)** — perangkat pemindai fisik (laser/imager) pada umumnya berperilaku sebagai *keyboard wedge*: hasil scan "diketik" otomatis ke kotak input yang sedang fokus, diakhiri Enter. Aplikasi ini SELALU menjaga fokus di kotak barcode supaya kompatibel dengan SEMUA merek scanner semacam ini tanpa perlu SDK vendor apa pun.
2. **Kamera (fallback)** — dipakai bila device tidak punya scanner fisik, memakai [`@capacitor-mlkit/barcode-scanning`](https://github.com/capawesome-team/capacitor-mlkit) (Google ML Kit, on-device, offline).

## ⚠️ Uji Coba Diperlukan

Sama seperti app Kasir Android — kode ini **belum diuji end-to-end** di perangkat fisik (tidak ada Android/PDT/scanner tersambung di lingkungan pengembangan). Sebelum dipakai produksi:

1. Install APK ke device target (idealnya PDT/handheld dengan scanner bawaan, atau tablet/HP biasa untuk uji mode kamera).
2. Login, pastikan sesi opname otomatis terbuat/lanjut ("Sesi baru dimulai" di bar bawah topbar).
3. Uji scan pakai scanner fisik (kalau device punya) — pastikan hasil scan masuk ke kotak barcode & TIDAK "bocor" ke field lain.
4. Uji tombol kamera (ikon 📷) — pastikan pratinjau kamera tampil (background app HARUS transparan selama scan, lihat `style.css` kelas `.mode-scan-kamera`) dan hasil scan terbaca benar.
5. Simpan beberapa entri, cek ringkasan (kartu Produk/Lebih/Kurang) ikut bertambah, dan verifikasi di layar web/ZK "Stok Opname" bahwa data benar-benar tersinkron.

## Build

Prasyarat: Node.js, Android SDK (`ANDROID_HOME`), JDK 17 (Gradle di proyek ini **tidak kompatibel** dengan JDK 21+/25).

```bash
npm install
npx cap sync android
cd android
JAVA_HOME="<path ke JDK 17>" ./gradlew.bat assembleDebug
```

APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`.
