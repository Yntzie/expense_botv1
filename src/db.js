const { Pool } = require('pg');

// Railway otomatis menyediakan DATABASE_URL kalau kamu attach PostgreSQL plugin ke project ini.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway butuh SSL. Pastikan tidak ada kata 'base' di DATABASE_URL di Railway Variables.
  ssl: /railway|render|neon|supabase/i.test(process.env.DATABASE_URL || '')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('❌ Error tak terduga dari koneksi database:', err.message);
});

/**
 * Pastikan tabel transaksi sudah ada.
 */
async function initDb() {
  try {
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
  } catch (err) {
    console.error('❌ Gagal inisialisasi database:', err.message);
  }
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
  try {
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
    return result.rows || [];
  } catch (err) {
    console.error('❌ Gagal mengambil transaksi:', err.message);
    return [];
  }
}

async function ringkasan({ mulai, sampai, chat_id } = {}) {
  try {
    const rows = await ambilTransaksi({ mulai, sampai, chat_id });
    
    // Safety check: pastikan rows adalah array
    const data = Array.isArray(rows) ? rows : [];

    // Konversi ke Number untuk mencegah NaN jika data di DB aneh
    const totalMasuk = data
      .filter(r => r.jenis === 'masuk')
      .reduce((a, b) => a + (Number(b.jumlah) || 0), 0);

    const totalKeluar = data
      .filter(r => r.jenis === 'keluar')
      .reduce((a, b) => a + (Number(b.jumlah) || 0), 0);

    return {
      totalMasuk,
      totalKeluar,
      saldo: totalMasuk - totalKeluar,
      jumlahTransaksi: data.length,
    };
  } catch (err) {
    console.error('❌ Gagal menghitung ringkasan:', err.message);
    return { totalMasuk: 0, totalKeluar: 0, saldo: 0, jumlahTransaksi: 0 };
  }
}

async function hapusTransaksi(id, chat_id) {
  const result = await pool.query('DELETE FROM transaksi WHERE id = $1 AND chat_id = $2', [id, chat_id]);
  return result.rowCount > 0;
}

module.exports = { pool, initDb, tambahTransaksi, ambilTransaksi, ringkasan, hapusTransaksi };