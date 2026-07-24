# AIS Stok Opname Android — v1.0.0 (rilis awal)

Aplikasi Android khusus stok opname — entry cepat via scan barcode (hardware scanner/PDT atau kamera), sinkron ke server AIS.

## Fitur

- Login + sesi opname otomatis dimulai/dilanjutkan per toko.
- Scan barcode: dukungan **hardware scanner/PDT** (keyboard-wedge, tanpa SDK vendor) DAN **kamera** (ML Kit, fallback).
- Setelah scan: tampil nama produk, stok sistem, stok minimum — petugas isi stok fisik → simpan.
- Ringkasan real-time (jumlah produk diopname, total lebih, total kurang) hari ini.
- Riwayat scan pada sesi aplikasi berjalan.

Backend memakai ulang modul "Stok Opname" yang sudah ada & teruji di layar web/ZK (`StokOpname`, `SesiStokOpname`, `StokOpnameScanUtil`) — aplikasi ini murni klien baru lewat 6 aksi `PosApi.java` baru (`so_*`).

## ⚠️ Status: APK Debug (belum ditandatangani untuk rilis produksi)

Lihat README bagian "Uji Coba Diperlukan" — kode ditulis sesuai dokumentasi resmi plugin yang dipakai, tapi belum diuji di perangkat Android/PDT/scanner fisik (tidak tersedia di lingkungan pengembangan).

## Instalasi

Unduh `app-debug.apk`, salin ke perangkat Android, buka untuk instal (aktifkan "Izinkan dari sumber ini" bila diminta).
