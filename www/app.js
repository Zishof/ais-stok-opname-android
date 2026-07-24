/**
 * app.js -- logika "Stok Opname" (v1). Alur: pilih/lanjutkan sesi -> scan barcode (hardware
 * scanner/PDT via keyboard-wedge ATAU kamera ML Kit) -> tampilkan produk+stok sistem -> petugas isi
 * stok fisik -> simpan (server hitung selisih & recompute stok produk otomatis, lihat JavaDoc server
 * {@code KantinHelper.soSimpan}).
 *
 * KENAPA input barcode SELALU difokuskan ulang? Scanner/PDT hardware pada umumnya berperilaku
 * seperti KEYBOARD (mode "keyboard wedge") -- ia "mengetik" karakter barcode + Enter ke elemen yang
 * SEDANG FOKUS. Tanpa manajemen fokus yang disiplin di sini, hasil scan bisa "hilang" (terketik ke
 * elemen lain) atau, lebih buruk, TERKETIK ke field stok fisik yang sedang aktif (jadi harus SELALU
 * kembalikan fokus ke {@code #inBarcode} setelah tiap siklus selesai/dibatalkan).
 */
(function () {
    'use strict';

    var elToast = document.getElementById('toast');
    var elLayarMuat = document.getElementById('layarMuat');
    var elTxtLayarMuat = document.getElementById('txtLayarMuat');

    function tampilMuat(pesan) { elTxtLayarMuat.textContent = pesan || 'Memuat...'; elLayarMuat.classList.add('tampil'); }
    function tutupMuat() { elLayarMuat.classList.remove('tampil'); }

    var toastTimer = null;
    function toast(jenis, pesan) {
        elToast.textContent = pesan;
        elToast.className = 'toast tampil ' + jenis;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { elToast.className = 'toast ' + jenis; }, 3200);
    }

    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
    function pesanDariHasil(hasil, fallback) { return (hasil && (hasil.description || hasil.message)) || fallback || 'Terjadi kesalahan.'; }
    function tampilkanLayar(id) {
        document.querySelectorAll('.layar').forEach(function (el) { el.classList.remove('aktif'); });
        document.getElementById(id).classList.add('aktif');
    }
    function formatAngka(n) {
        n = Number(n) || 0;
        return (Number.isInteger(n) ? n : n.toFixed(2)).toLocaleString ? n.toLocaleString('id-ID') : String(n);
    }

    var state = { tokoId: null, tokoNama: '', userId: '', sesiId: null, sesiKode: '', riwayat: [] };

    // =====================================================================
    // ==== Login ====
    // =====================================================================
    var elLoginError = document.getElementById('loginError');
    var elInHost = document.getElementById('inHost');
    var elInContextPath = document.getElementById('inContextPath');
    var elInHttps = document.getElementById('inHttps');
    var elInUserid = document.getElementById('inUserid');
    var elInPassword = document.getElementById('inPassword');
    var elBtnMasuk = document.getElementById('btnMasuk');

    async function isiFormDariCfgTersimpan() {
        var cfg = await AisApi.bacaCfg();
        if (cfg) {
            elInHost.value = cfg.host || '';
            elInContextPath.value = cfg.contextPath || '';
            elInHttps.checked = cfg.https !== false;
            elInUserid.value = cfg.username || '';
        }
    }

    elBtnMasuk.addEventListener('click', async function () {
        elLoginError.className = 'pesan-error';
        var host = elInHost.value.trim(), contextPath = elInContextPath.value.trim(), https = elInHttps.checked;
        var userid = elInUserid.value.trim(), password = elInPassword.value;
        if (!host || !userid || !password) {
            elLoginError.textContent = 'Alamat server, userid, dan kata sandi wajib diisi.';
            elLoginError.className = 'pesan-error tampil';
            return;
        }
        elBtnMasuk.disabled = true;
        elBtnMasuk.textContent = 'Memeriksa...';
        try {
            var r = await AisApi.login({ host: host, contextPath: contextPath, https: https }, userid, password);
            if (!r.ok) {
                elLoginError.textContent = r.pesan;
                elLoginError.className = 'pesan-error tampil';
                return;
            }
            await masukKeAplikasi();
        } finally {
            elBtnMasuk.disabled = false;
            elBtnMasuk.textContent = 'Masuk';
        }
    });

    document.getElementById('btnKeluar').addEventListener('click', async function () {
        await AisApi.logout();
        tampilkanLayar('layarLogin');
    });

    // =====================================================================
    // ==== Status + Sesi ====
    // =====================================================================
    var elTxtNamaToko = document.getElementById('txtNamaToko');
    var elPillStatus = document.getElementById('pillStatus');
    var elTxtStatus = document.getElementById('txtStatus');
    var elTxtSesiInfo = document.getElementById('txtSesiInfo');
    var elBtnSelesaikanSesi = document.getElementById('btnSelesaikanSesi');

    async function segarkanStatus() {
        try {
            var r = await AisApi.panggil('konfigurasi', {});
            var online = r.status === 'success';
            elPillStatus.className = 'pill-status ' + (online ? 'online' : 'offline');
            elTxtStatus.textContent = online ? 'Online' : 'Offline';
            if (online) {
                state.tokoNama = r.tokoNama || '';
                state.tokoId = r.tokoId != null ? r.tokoId : state.tokoId;
                elTxtNamaToko.textContent = state.tokoNama || ('Petugas - ' + state.userId);
            }
        } catch (e) {
            elPillStatus.className = 'pill-status offline';
            elTxtStatus.textContent = 'Offline';
        }
    }

    async function mulaiAtauLanjutkanSesi() {
        var r = await AisApi.panggil('so_sesi_mulai', { toko_id: state.tokoId, petugas: state.userId });
        if (r.status !== 'success') {
            elTxtSesiInfo.textContent = 'Gagal memulai sesi -- ' + pesanDariHasil(r);
            return;
        }
        state.sesiId = r.id;
        elTxtSesiInfo.textContent = (r.dilanjutkan ? 'Melanjutkan sesi aktif' : 'Sesi baru dimulai');
        elBtnSelesaikanSesi.style.display = '';
    }

    elBtnSelesaikanSesi.addEventListener('click', async function () {
        if (!state.sesiId) return;
        if (!confirm('Tandai sesi opname ini SELESAI? Anda tetap bisa scan lagi nanti (sesi baru akan otomatis dibuat).')) return;
        tampilMuat('Menyelesaikan sesi...');
        try {
            var r = await AisApi.panggil('so_sesi_selesai', { id: state.sesiId });
            if (r.status === 'success') {
                toast('success', 'Sesi ditandai selesai.');
                state.sesiId = null;
                elBtnSelesaikanSesi.style.display = 'none';
                elTxtSesiInfo.textContent = 'Sesi selesai.';
            } else {
                toast('error', pesanDariHasil(r, 'Gagal menyelesaikan sesi.'));
            }
        } finally {
            tutupMuat();
        }
    });

    // =====================================================================
    // ==== Ringkasan ====
    // =====================================================================
    var elRingkasProduk = document.getElementById('ringkasProduk');
    var elRingkasLebih = document.getElementById('ringkasLebih');
    var elRingkasKurang = document.getElementById('ringkasKurang');

    async function muatRingkasan() {
        try {
            var r = await AisApi.panggil('so_ringkasan', { toko_id: state.tokoId });
            if (r.status === 'success') {
                elRingkasProduk.textContent = formatAngka(r.jumlahProduk);
                elRingkasLebih.textContent = formatAngka(r.totalLebih);
                elRingkasKurang.textContent = formatAngka(r.totalKurang);
            }
        } catch (e) { /* abaikan -- ringkasan murni informasional */ }
    }

    // =====================================================================
    // ==== Scan barcode (keyboard-wedge) ====
    // =====================================================================
    var elInBarcode = document.getElementById('inBarcode');
    var elWadahHasilScan = document.getElementById('wadahHasilScan');
    var produkScanSaatIni = null;

    function fokusKeBarcode() {
        elWadahHasilScan.innerHTML = '';
        produkScanSaatIni = null;
        elInBarcode.value = '';
        // setTimeout kecil -- di beberapa perangkat, fokus langsung setelah re-render diabaikan WebView.
        setTimeout(function () { elInBarcode.focus(); }, 50);
    }

    elInBarcode.addEventListener('keydown', async function (ev) {
        if (ev.key !== 'Enter') return;
        var barcode = elInBarcode.value.trim();
        if (!barcode) return;
        await prosesBarcode(barcode);
    });

    async function prosesBarcode(barcode) {
        elInBarcode.value = 'Mencari "' + barcode + '"...';
        elInBarcode.disabled = true;
        try {
            var r = await AisApi.panggil('so_produk_scan', { toko_id: state.tokoId, barcode: barcode });
            if (r.status !== 'success') {
                toast('error', pesanDariHasil(r, 'Barcode tidak dikenal.'));
                fokusKeBarcode();
                return;
            }
            produkScanSaatIni = r;
            renderHasilScan(r);
        } catch (e) {
            toast('error', e.pesan || 'Gagal menghubungi server.');
            fokusKeBarcode();
        } finally {
            elInBarcode.disabled = false;
        }
    }

    function renderHasilScan(p) {
        elWadahHasilScan.innerHTML =
            '<div class="kartu-produk-scan">'
            + '<div class="nama">' + escapeHtml(p.nama) + '</div>'
            + '<div class="kode">Kode: ' + escapeHtml(p.kode) + '</div>'
            + '<div class="baris-info-scan"><span>Stok Sistem</span><span class="v">' + formatAngka(p.stokSistem) + '</span></div>'
            + (p.stokMinimum > 0 ? '<div class="baris-info-scan"><span>Stok Minimum</span><span class="v">' + formatAngka(p.stokMinimum) + '</span></div>' : '')
            + '<div class="field-fisik"><input type="number" id="inStokFisik" inputmode="decimal" placeholder="Stok fisik hasil hitung" value="' + formatAngka(p.stokSistem) + '"></div>'
            + '<div class="field" style="margin-top:8px;"><input type="text" id="inKeteranganSo" placeholder="Keterangan (opsional, mis. Barang Basi)" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:9px;font-size:12.5px;"></div>'
            + '<div class="baris-tombol-scan">'
            + '<button class="btn-sekunder" id="btnBatalScan">Batal</button>'
            + '<button class="btn-utama" id="btnSimpanScan">Simpan</button>'
            + '</div></div>';

        document.getElementById('btnBatalScan').addEventListener('click', fokusKeBarcode);
        document.getElementById('btnSimpanScan').addEventListener('click', simpanHasilScan);

        var elFisik = document.getElementById('inStokFisik');
        setTimeout(function () { elFisik.focus(); elFisik.select(); }, 50);
    }

    async function simpanHasilScan() {
        if (!produkScanSaatIni) return;
        var stokFisik = Number(document.getElementById('inStokFisik').value);
        if (isNaN(stokFisik) || stokFisik < 0) { toast('error', 'Stok fisik tidak valid.'); return; }
        var keterangan = document.getElementById('inKeteranganSo').value.trim();

        var btn = document.getElementById('btnSimpanScan');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';
        try {
            var r = await AisApi.panggil('so_simpan', {
                toko_id: state.tokoId, produk_id: produkScanSaatIni.produkId, stok_fisik: stokFisik, keterangan: keterangan
            });
            if (r.status === 'success') {
                state.riwayat.unshift({
                    nama: produkScanSaatIni.nama, kode: produkScanSaatIni.kode,
                    stokSistem: produkScanSaatIni.stokSistem, stokFisik: stokFisik, selisih: r.selisih,
                    waktu: new Date().toLocaleTimeString('id-ID')
                });
                renderRiwayat();
                toast('success', produkScanSaatIni.nama + ' tersimpan (selisih ' + formatAngka(r.selisih) + ').');
                fokusKeBarcode();
                muatRingkasan();
            } else {
                toast('error', pesanDariHasil(r, 'Gagal menyimpan.'));
            }
        } catch (e) {
            toast('error', e.pesan || 'Gagal menghubungi server.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan';
        }
    }

    // =====================================================================
    // ==== Riwayat lokal (sesi berjalan, hilang saat app ditutup -- server tetap sumber kebenaran) ====
    // =====================================================================
    var elWadahRiwayat = document.getElementById('wadahRiwayat');

    function renderRiwayat() {
        if (state.riwayat.length === 0) {
            elWadahRiwayat.innerHTML = '<div class="kosong-riwayat">&#128203;<br>Belum ada scan pada sesi aplikasi ini.</div>';
            return;
        }
        var html = '';
        state.riwayat.forEach(function (item) {
            var kelas = item.selisih > 0 ? 'plus' : (item.selisih < 0 ? 'minus' : 'nol');
            var tanda = item.selisih > 0 ? '+' : '';
            html += '<div class="baris-riwayat">'
                + '<div class="info"><div class="nama">' + escapeHtml(item.nama) + '</div>'
                + '<div class="sub">' + escapeHtml(item.kode) + ' &middot; fisik ' + formatAngka(item.stokFisik) + ' &middot; ' + item.waktu + '</div></div>'
                + '<span class="badge-selisih ' + kelas + '">' + tanda + formatAngka(item.selisih) + '</span>'
                + '</div>';
        });
        elWadahRiwayat.innerHTML = html;
    }

    // =====================================================================
    // ==== Scan kamera (ML Kit, fallback tanpa hardware scanner) ====
    // =====================================================================
    var elOverlayKamera = document.getElementById('overlayKamera');
    var BarcodeScanner = null; // diisi lazy -- lihat siapkanMlKit()

    function siapkanMlKit() {
        try {
            var Plugins = window.Capacitor && window.Capacitor.Plugins;
            BarcodeScanner = (Plugins && Plugins.BarcodeScanner) || null;
        } catch (e) { BarcodeScanner = null; }
        return !!BarcodeScanner;
    }

    document.getElementById('btnKamera').addEventListener('click', async function () {
        if (!siapkanMlKit()) {
            toast('error', 'Pemindai kamera hanya tersedia di aplikasi Android (APK).');
            return;
        }
        try {
            var izin = await BarcodeScanner.requestPermissions();
            if (izin.camera !== 'granted' && izin.camera !== 'limited') {
                toast('error', 'Izin kamera ditolak -- aktifkan lewat Pengaturan Aplikasi.');
                return;
            }
            document.body.classList.add('mode-scan-kamera');
            elOverlayKamera.classList.add('tampil');
            var listener = await BarcodeScanner.addListener('barcodesScanned', async function (event) {
                var barcodes = event && event.barcodes;
                if (!barcodes || barcodes.length === 0) return;
                await tutupKamera(listener);
                var nilai = barcodes[0].rawValue || barcodes[0].displayValue;
                if (nilai) {
                    elInBarcode.value = nilai;
                    await prosesBarcode(nilai);
                }
            });
            await BarcodeScanner.startScan();
        } catch (e) {
            document.body.classList.remove('mode-scan-kamera');
            elOverlayKamera.classList.remove('tampil');
            toast('error', 'Gagal membuka kamera: ' + (e.message || e));
        }
    });

    async function tutupKamera(listener) {
        try { if (listener) await listener.remove(); } catch (e) { /* abaikan */ }
        try { if (BarcodeScanner) await BarcodeScanner.stopScan(); } catch (e) { /* abaikan */ }
        document.body.classList.remove('mode-scan-kamera');
        elOverlayKamera.classList.remove('tampil');
    }

    document.getElementById('btnTutupKamera').addEventListener('click', function () { tutupKamera(null); });

    // =====================================================================
    // ==== Inisialisasi ====
    // =====================================================================
    async function masukKeAplikasi() {
        var cfg = await AisApi.bacaCfg();
        state.userId = (cfg && cfg.username) || '';
        tampilkanLayar('layarUtama');
        tampilMuat('Menyiapkan sesi opname...');
        try {
            await segarkanStatus();
            await mulaiAtauLanjutkanSesi();
            await muatRingkasan();
            renderRiwayat();
            fokusKeBarcode();
        } finally {
            tutupMuat();
        }
        setInterval(segarkanStatus, 30000);
    }

    (async function start() {
        await isiFormDariCfgTersimpan();
        var adaToken = await AisApi.muatTokenTersimpan();
        if (adaToken) {
            tampilMuat('Menyambungkan...');
            try {
                await masukKeAplikasi();
            } catch (e) {
                tutupMuat();
                tampilkanLayar('layarLogin');
            }
        }
    })();
})();
