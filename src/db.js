const { Pool } = require('pg');

// Debugging: Log ini akan muncul di Railway Logs untuk memastikan alamat yang dipakai
const dbUrl = process.env.DATABASE_URL || '';
console.log('🔗 Mencoba koneksi database ke:', dbUrl.includes('base') ? '⚠️ MASIH MENGGUNAKAN HOST "base"!' : '✅ Host sudah benar');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: /railway|render|neon|supabase/i.test(dbUrl)
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('❌ Database Error:', err.message);
});

async function initDb() {
  try {
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
    console.log('✅ Database siap digunakan.');
  } catch (err) {
    console.error('❌ Gagal Inisialisasi:', err.message);
  }
}

async function ambilTransaksi({ mulai, sampai, chat_id } = {}) {
  try {
    let query = 'SELECT * FROM transaksi WHERE 1=1';
    const params = [];
    let i = 1;

    if (mulai) { query += ` AND tanggal >= $${i++}`; params.push(mulai); }
    if (sampai) { query += ` AND tanggal <= $${i++}`; params.push(sampai); }
    if (chat_id) { query += ` AND chat_id = $${i++}`; params.push(chat_id); }
    
    query += ' ORDER BY tanggal ASC, waktu ASC';

    const result = await pool.query(query, params);
    return result.rows || [];
  } catch (err) {
    console.error('❌ Gagal ambil data:', err.message);
    return []; // Kembalikan array kosong jika database gagal terhubung
  }
}

async function ringkasan(filter) {
  const rows = await ambilTransaksi(filter);
  const data = Array.isArray(rows) ? rows : [];
  
  const totalMasuk = data.filter(r => r.jenis === 'masuk').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
  const totalKeluar = data.filter(r => r.jenis === 'keluar').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
  
  return {
    totalMasuk,
    totalKeluar,
    saldo: totalMasuk - totalKeluar,
    jumlahTransaksi: data.length,
  };
}

module.exports = { pool, initDb, ambilTransaksi, ringkasan };