const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'keuangan.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Buat tabel kalau belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal TEXT NOT NULL,       -- format YYYY-MM-DD
    waktu TEXT NOT NULL,         -- format HH:MM:SS
    jenis TEXT NOT NULL,         -- 'masuk' atau 'keluar'
    jumlah INTEGER NOT NULL,
    keterangan TEXT,
    chat_id TEXT,
    nama_pengirim TEXT,
    dibuat_pada TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

function tambahTransaksi({ tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim }) {
  const stmt = db.prepare(`
    INSERT INTO transaksi (tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim)
    VALUES (@tanggal, @waktu, @jenis, @jumlah, @keterangan, @chat_id, @nama_pengirim)
  `);
  const info = stmt.run({ tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim });
  return info.lastInsertRowid;
}

function ambilTransaksi({ mulai, sampai, chat_id } = {}) {
  let query = 'SELECT * FROM transaksi WHERE 1=1';
  const params = {};

  if (mulai) {
    query += ' AND tanggal >= @mulai';
    params.mulai = mulai;
  }
  if (sampai) {
    query += ' AND tanggal <= @sampai';
    params.sampai = sampai;
  }
  if (chat_id) {
    query += ' AND chat_id = @chat_id';
    params.chat_id = chat_id;
  }
  query += ' ORDER BY tanggal ASC, waktu ASC';

  return db.prepare(query).all(params);
}

function ringkasan({ mulai, sampai, chat_id } = {}) {
  const rows = ambilTransaksi({ mulai, sampai, chat_id });
  const totalMasuk = rows.filter(r => r.jenis === 'masuk').reduce((a, b) => a + b.jumlah, 0);
  const totalKeluar = rows.filter(r => r.jenis === 'keluar').reduce((a, b) => a + b.jumlah, 0);
  return {
    totalMasuk,
    totalKeluar,
    saldo: totalMasuk - totalKeluar,
    jumlahTransaksi: rows.length,
  };
}

function hapusTransaksi(id, chat_id) {
  const stmt = db.prepare('DELETE FROM transaksi WHERE id = @id AND chat_id = @chat_id');
  const info = stmt.run({ id, chat_id });
  return info.changes > 0;
}

module.exports = { db, tambahTransaksi, ambilTransaksi, ringkasan, hapusTransaksi };