const { Pool } = require('pg');

// Railway otomatis menyediakan DATABASE_URL kalau kamu attach PostgreSQL plugin ke project ini.
// Untuk development lokal, isi DATABASE_URL di .env (bisa pakai Postgres lokal via Docker, atau
// langsung pakai connection string dari Postgres yang sama di Railway).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway (dan kebanyakan Postgres hosting) butuh SSL, tapi Postgres lokal biasanya tidak.
  // Deteksi otomatis: kalau connection string mengandung 'railway' atau ada PGSSLMODE, pakai SSL.
  ssl: /railway|render|neon|supabase/i.test(process.env.DATABASE_URL || '')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('❌ Error tak terduga dari koneksi database:', err.message);
});

/**
 * Pastikan tabel transaksi sudah ada. Dipanggil sekali saat aplikasi start (lihat server.js).
 */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id SERIAL PRIMARY KEY,
      tanggal TEXT NOT NULL,       -- format YYYY-MM-DD
      waktu TEXT NOT NULL,         -- format HH:MM:SS
      jenis TEXT NOT NULL,         -- 'masuk' atau 'keluar'
      jumlah INTEGER NOT NULL,
      keterangan TEXT,
      chat_id TEXT,
      nama_pengirim TEXT,
      dibuat_pada TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Terhubung ke PostgreSQL, tabel transaksi siap.');
}

async function tambahTransaksi({ tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim }) {
  const result = await pool.query(
    `INSERT INTO transaksi (tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [tanggal, waktu, jenis, jumlah, keterangan, chat_id, nama_pengirim]
  );
  return result.rows[0].id;
}

async function ambilTransaksi({ mulai, sampai, chat_id } = {}) {
  let query = 'SELECT * FROM transaksi WHERE 1=1';
  const params = [];
  let i = 1;

  if (mulai) {
    query += ` AND tanggal >= $${i++}`;
    params.push(mulai);
  }
  if (sampai) {
    query += ` AND tanggal <= $${i++}`;
    params.push(sampai);
  }
  if (chat_id) {
    query += ` AND chat_id = $${i++}`;
    params.push(chat_id);
  }
  query += ' ORDER BY tanggal ASC, waktu ASC';

  const result = await pool.query(query, params);
  return result.rows;
}

async function ringkasan({ mulai, sampai, chat_id } = {}) {
  const rows = await ambilTransaksi({ mulai, sampai, chat_id });
  const totalMasuk = rows.filter(r => r.jenis === 'masuk').reduce((a, b) => a + b.jumlah, 0);
  const totalKeluar = rows.filter(r => r.jenis === 'keluar').reduce((a, b) => a + b.jumlah, 0);
  return {
    totalMasuk,
    totalKeluar,
    saldo: totalMasuk - totalKeluar,
    jumlahTransaksi: rows.length,
  };
}

async function hapusTransaksi(id, chat_id) {
  const result = await pool.query('DELETE FROM transaksi WHERE id = $1 AND chat_id = $2', [id, chat_id]);
  return result.rowCount > 0;
}

module.exports = { pool, initDb, tambahTransaksi, ambilTransaksi, ringkasan, hapusTransaksi };