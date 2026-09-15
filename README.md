# BUMKAM Finance — Sistem Informasi Keuangan Pulsa & Air Galon
**BUMKAM Hen Wani, Kampung Enggros, Distrik Abepura, Kota Jayapura, Papua**

[![Download Android APK](https://img.shields.io/badge/Download_APK-v1.0.0_(Offline)-success?style=for-the-badge&logo=android)](https://github.com/ekobot2025-cyber/bumkam-finance/releases/download/v1.0.0/BUMKAM-Finance-v1.0.0.apk)
[![GitHub Release](https://img.shields.io/badge/Release-v1.0.0-blue?style=for-the-badge&logo=github)](https://github.com/ekobot2025-cyber/bumkam-finance/releases/tag/v1.0.0)
[![Status Pengujian](https://img.shields.io/badge/TEST_01--12-100%25_PASSED-brightgreen?style=for-the-badge)](https://github.com/ekobot2025-cyber/bumkam-finance)

Aplikasi pencatatan keuangan dan transaksi operasional sederhana, terintegrasi, dan mobile-responsive untuk BUMKAM Hen Wani Kampung Enggros. Dapat dijalankan sebagai **Aplikasi Web Cloud (Vercel)** maupun **Aplikasi Android Offline 100% (APK)** tanpa memerlukan koneksi internet.

---

## 📱 Download & Instalasi Aplikasi Android (.apk)

File instalasi Android resmi telah dirilis dan dapat diunduh langsung ke handphone:

👉 **[KLIK DI SINI UNTUK MENGUNDUH APK (v1.0.0)](https://github.com/ekobot2025-cyber/bumkam-finance/releases/download/v1.0.0/BUMKAM-Finance-v1.0.0.apk)**

### Petunjuk Instalasi di HP Android:
1. Klik tautan unduh di atas menggunakan browser di handphone (Chrome / browser bawaan).
2. Setelah file `BUMKAM-Finance-v1.0.0.apk` selesai diunduh, buka file tersebut.
3. Jika muncul dialog keamanan *"Install from unknown sources"* (Instal aplikasi tidak dikenal), pilih **Izinkan (Allow)**.
4. Tekan **Install** dan tunggu beberapa detik hingga selesai.
5. **Mode Offline:** Anda dapat mematikan data seluler / WiFi di HP. Buka aplikasi **BUMKAM Finance** dan semua fitur dapat langsung digunakan tanpa kuota internet di Kampung Enggros.

---

## 🌟 Prinsip Utama: *ONE TRANSACTION — ONE INPUT*

Pengguna (Operator/Bendahara) hanya perlu mencatat transaksi **1 kali**, dan sistem secara otomatis:
1. Memotong saldo deposit modal pulsa ATAU stok galon tersedia.
2. Menambah kas masuk (tunai) ATAU piutang pelanggan (tempo/kredit).
3. Membentuk entri jurnal umum akuntansi berimbang ($\text{Debit} = \text{Kredit}$).
4. Memperbarui kartu piutang dan sisa tabung galon pelanggan secara real-time.
5. Mengompilasi Laporan Laba Rugi, Buku Kas, Neraca, dan Arus Kas.

---

## 🚀 Fitur-Fitur Utama

### 1. Unit Usaha Pulsa
- Pencatatan transaksi penjualan pulsa (data/reguler).
- Perhitungan otomatis Margin Keuntungan ($\text{Harga Jual} - \text{Harga Modal}$) tanpa input manual.
- Validasi Anti-Saldo Negatif (transaksi ditolak jika modal melebihi deposit aktif).
- Top-Up saldo deposit modal terintegrasi dengan arus kas keluar dan jurnal akuntansi.

### 2. Unit Usaha Air Galon
- Pemantauan ketat 4 Status Wadah Tabung:
  - *Galon Tersedia* (di depot siap jual)
  - *Galon di Pelanggan* (sedang dipinjam/dibawa warga)
  - *Galon Kembali* (tabung kosong dikembalikan)
  - *Galon Rusak / Hilang* (afkir)
- Penjualan Tunai vs Kredit/Tempo.
- *Strict Rule:* Penjualan kredit **tidak menambah kas sama sekali**.

### 3. Pelanggan & Piutang
- Profil warga/pelanggan lengkap dengan alamat RT di Kampung Enggros.
- Kartu piutang dinamis (*Lunas, Sebagian, Belum Lunas*).
- Pembayaran cicilan piutang: **Pembayaran piutang bukan penjualan baru** (menambah kas, memotong piutang, tidak melipatgandakan omset).

### 4. Buku Kas & Laporan Keuangan
- Arus kas masuk dan kas keluar terperinci.
- Formulir pengeluaran beban operasional depot (listrik, internet, bensin, dll).
- Laporan Keuangan Resmi ber-kop BUMKAM Hen Wani Kampung Enggros & kolom tanda tangan:
  - Laporan Rekapitulasi Penjualan
  - Laporan Posisi Piutang
  - Laporan Buku Kas
  - Laporan Hasil Usaha (Laba Rugi per Unit & Gabungan)
  - Neraca Keuangan
  - Laporan Arus Kas

### 5. Akuntansi & Keamanan
- Standard Chart of Accounts (COA: 1000 s/d 6000).
- Jurnal Umum Double-Entry ($\Sigma\text{Debit} = \Sigma\text{Kredit}$).
- Buku Besar (General Ledger) & Neraca Saldo (Trial Balance).
- Fitur Batal Transaksi (**VOID**) khusus Administrator dengan jurnal pembalik otomatis.
- Audit Trail Log aktivitas sistem.

---

## 👥 Akun Default

| Peran | Username | Password | Wewenang |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh, void transaksi, kelola user & profil BUMKAM |
| **Operator / Bendahara** | `operator` | `operator123` | Pencatatan transaksi harian pulsa, galon, kas, & piutang |

---

## 🌐 Menjalankan Versi Web (Lokal & Vercel)

### Menjalankan di Komputer Lokal:
```bash
# Install dependencies
npm install

# Jalankan server Next.js
npm run dev
```
Buka browser di `http://localhost:3000`.

### Verifikasi Mandiri Pengujian TEST 01 - TEST 12:
```bash
node scripts/run_all_tests.js
```
Semua 12 skenario pengujian diverifikasi **100% LULUS**.

---

## 🏛️ Profil Lembaga
- **Badan Usaha:** BUMKAM Hen Wani
- **Kampung:** Kampung Enggros
- **Distrik:** Abepura, Kota Jayapura, Papua
