# 💰 Bot Catatan Keuangan (Telegram)

Aplikasi sederhana untuk mencatat pemasukan & pengeluaran lewat chat Telegram.
Data otomatis tersimpan ke database SQLite, dan bisa didownload sebagai Excel
(bisa difilter mingguan/bulanan) baik lewat bot maupun dashboard web.

## Fitur
- Catat transaksi cukup dengan chat ke bot: `keluar 20000 makan siang`
- Data tersimpan otomatis ke database (SQLite, file lokal, tidak perlu setup server DB)
- Lihat ringkasan langsung di Telegram: `/ringkasan`
- Export Excel lewat bot: `/export minggu` atau `/export bulan`
- Dashboard web dengan tabel transaksi + tombol download Excel, filter mingguan/bulanan/custom

## 1. Buat Bot Telegram
1. Buka Telegram, cari **@BotFather**
2. Ketik `/newbot`, ikuti instruksinya (kasih nama & username bot)
3. BotFather akan kasih **token**, contoh: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
4. Simpan token itu, akan dipakai di langkah berikutnya

## 2. Install & Jalankan
```bash
cd expense-tracker
npm install
cp .env.example .env
```
Buka file `.env`, isi `BOT_TOKEN` dengan token dari BotFather:
```
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
PORT=3000
```

Jalankan aplikasinya:
```bash
npm start
```

Kalau berhasil akan muncul:
```
Bot Telegram aktif dan menunggu pesan...
🌐 Dashboard web berjalan di http://localhost:3000
```

## 3. Cara Pakai di Telegram
Buka chat dengan bot kamu, lalu kirim pesan dengan format:

```
keluar 20000 makan siang
k 20rb bensin
masuk 5jt gaji bulanan
m 500rb bonus dari kantor
```

**Kata kunci pengeluaran:** `keluar`, `k`, `beli`, `bayar`, `jajan`
**Kata kunci pemasukan:** `masuk`, `m`, `gaji`, `terima`, `dapat`, `bonus`, `jual`

**Format jumlah yang didukung:** `20000`, `20.000`, `20rb`, `20k`, `1.5jt`

**Perintah lain:**
- `/ringkasan` — lihat total pemasukan/pengeluaran/saldo 7 hari terakhir
- `/export minggu` — bot kirim file Excel 7 hari terakhir
- `/export bulan` — bot kirim file Excel bulan berjalan
- `/hapus <id>` — hapus transaksi (id muncul saat transaksi dicatat, misal `#12`)

## 4. Keamanan (WAJIB dibaca sebelum di-hosting ke internet)

Ada 2 pengaturan penting di `.env` yang harus diisi supaya bot & dashboard tidak
bisa diakses/dipakai orang lain:

**a. Batasi siapa yang boleh pakai bot (`ALLOWED_CHAT_IDS`)**
1. Jalankan bot, kirim `/start` ke bot kamu — bot akan balas dengan chat_id kamu
2. Salin chat_id itu ke `.env`: `ALLOWED_CHAT_IDS=123456789`
3. Restart aplikasi (`npm start` lagi)
4. Sekarang bot cuma akan merespon chat_id yang ada di daftar itu (bisa lebih dari satu, pisahkan koma)

Kalau `ALLOWED_CHAT_IDS` dikosongkan, bot bisa dipakai siapa saja yang menemukan
username bot kamu di Telegram — cocok untuk testing, tapi **jangan dibiarkan kosong**
kalau sudah di-hosting publik.

**b. Kunci dashboard web dengan password (`DASHBOARD_KEY`)**
1. Isi `DASHBOARD_KEY` di `.env` dengan password bebas, misal `DASHBOARD_KEY=rahasia-saya-123`
2. Saat buka dashboard, browser akan minta username (bebas, isi apa saja) & password (isi dengan `DASHBOARD_KEY`)

Kalau `DASHBOARD_KEY` dikosongkan, dashboard bisa diakses siapa saja yang tahu URL-nya, tanpa password sama sekali.

**Hal lain yang perlu diperhatikan:**
- **Jangan pernah** commit file `.env` ke GitHub (isinya token & password rahasia). File `.gitignore` sudah menyertakan ini.
- Kalau token bot bocor/ke-share, buka @BotFather → `/mybots` → pilih bot kamu → `Revoke current token` untuk generate token baru.
- Hosting seperti Railway/Render otomatis kasih HTTPS untuk dashboard, jadi password tidak dikirim polos lewat internet. Kalau pakai VPS sendiri, pastikan pasang HTTPS (misal lewat Nginx + Let's Encrypt) juga.
- Backup berkala file `data/keuangan.db` (misal download manual tiap minggu) supaya data tidak hilang kalau server bermasalah.

## 5. Dashboard Web
Buka `http://localhost:3000` di browser. Di sana kamu bisa:
- Lihat semua transaksi dalam tabel
- Filter berdasarkan 7 hari terakhir, bulan ini, atau rentang tanggal custom
- Klik **Download Excel** untuk download sesuai filter yang aktif

## 6. Deploy Supaya Bisa Diakses Kapan Saja (Tetap Jalan Walau Laptop Mati)
Supaya bot & dashboard tetap jalan 24 jam tanpa laptop kamu nyala terus, deploy ke layanan seperti:
- **Railway** (railway.app) — paling mudah untuk project Node.js seperti ini
- **Render** (render.com)
- VPS murah (misal lewat PM2 supaya proses tetap jalan)

Yang penting: environment variable `BOT_TOKEN` diisi di dashboard hosting-nya,
dan pastikan folder `data/` (tempat file database SQLite) tetap persisten
(tidak hilang tiap deploy ulang) — biasanya perlu volume/disk khusus di hosting.

## Struktur Project
```
expense-tracker/
├── src/
│   ├── server.js        # entry point, jalankan bot + web
│   ├── bot.js            # logika bot Telegram
│   ├── web.js             # server dashboard + API export
│   ├── db.js              # database SQLite
│   ├── parser.js         # parsing pesan chat jadi data transaksi
│   ├── excelExport.js    # generate file Excel
│   └── tanggalHelper.js  # helper rentang tanggal (minggu/bulan)
├── public/
│   └── index.html        # halaman dashboard
├── data/
│   └── keuangan.db       # database (otomatis dibuat saat pertama jalan)
├── package.json
└── .env.example
```

## Catatan
- Data dipisah per `chat_id`, jadi kalau bot dipakai di banyak grup/chat berbeda,
  masing-masing punya catatan sendiri-sendiri (tidak tercampur).
- Kalau mau nanti nambah WhatsApp juga, arsitekturnya sudah modular
  (parser & database terpisah dari bot), jadi tinggal bikin file `whatsapp.js`
  baru yang manggil fungsi `parsePesan` dan `tambahTransaksi` yang sama.
