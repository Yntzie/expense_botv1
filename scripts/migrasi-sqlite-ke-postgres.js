// Script SEKALI PAKAI untuk mindahin data lama dari SQLite (data/keuangan.db)
// ke PostgreSQL yang baru. Jalankan sekali saja, setelah itu boleh dihapus.
//
// Cara pakai (dari Railway Console, di service yang volumenya masih ada file lama):
//   node scripts/migrasi-sqlite-ke-postgres.js
//
// Cara pakai lokal (kalau kamu download file keuangan.db ke laptop):
//   DATABASE_URL=postgresql://... node scripts/migrasi-sqlite-ke-postgres.js ./keuangan.db

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const pathSqlite = process.argv[2] || path.join(__dirname, '..', 'data', 'keuangan.db');

async function main() {
  if (!fs.existsSync(pathSqlite)) {
    console.error(`❌ File SQLite tidak ditemukan di: ${pathSqlite}`);
    console.error('   Kalau lokasi file lama beda, jalankan: node scripts/migrasi-sqlite-ke-postgres.js /path/ke/keuangan.db');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL belum diisi. Jalankan script ini di environment yang sudah ada DATABASE_URL (misal lewat Railway Console).');
    process.exit(1);
  }

  console.log(`📂 Membaca data lama dari: ${pathSqlite}`);
  const sqliteDb = new Database(pathSqlite, { readonly: true });
  const rows = sqliteDb.prepare('SELECT * FROM transaksi ORDER BY id ASC').all();
  sqliteDb.close();

  console.log(`📊 Ditemukan ${rows.length} transaksi lama.`);
  if (rows.length === 0) {
    console.log('Tidak ada yang perlu dipindah. Selesai.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /railway|render|neon|supabase/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id SERIAL PRIMARY KEY,
      tanggal TEXT NOT NULL,
      waktu TEXT NOT NULL,
      jenis TEXT NOT NULL,
      jumlah INTEGER NOT NULL,
      keterangan TEXT,
      chat_id TEXT,
      nama_pengirim TEXT,
      dibuat_pada TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  let berhasil = 0;
  for (const row of rows) {
    await pool.query(
      `INSERT INTO transaksi (tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim, dibuat_pada)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [row.tanggal, row.waktu, row.jenis, row.jumlah, row.keterangan, row.chat_id, row.nama_pengirim, row.dibuat_pada || new Date()]
    );
    berhasil++;
  }

  console.log(`✅ Berhasil memindahkan ${berhasil} dari ${rows.length} transaksi ke PostgreSQL.`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migrasi gagal:', err);
  process.exit(1);
});