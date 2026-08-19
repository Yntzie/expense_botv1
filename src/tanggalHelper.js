// Semua fungsi di sini menghitung tanggal berdasarkan zona waktu Asia/Jakarta (WIB),
// TIDAK peduli server-nya berjalan di zona waktu apa (misal Railway pakai UTC).
// Ini penting supaya "hari ini" versi bot selalu sama dengan "hari ini" versi pengguna di Indonesia.

const ZONA_WAKTU = 'Asia/Jakarta';

/**
 * Ambil komponen tanggal (tahun, bulan, hari) hari ini menurut WIB
 */
function komponenTanggalWIB(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return { tahun: parseInt(parts.year, 10), bulan: parseInt(parts.month, 10), hari: parseInt(parts.day, 10) };
}

/**
 * Ambil jam:menit:detik saat ini menurut WIB, format HH:MM:SS
 */
function waktuSekarangWIB(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_WAKTU,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date); // hasilnya sudah HH:MM:SS
}

/**
 * Ambil tanggal hari ini menurut WIB, format YYYY-MM-DD
 */
function tanggalSekarangWIB(date = new Date()) {
  const { tahun, bulan, hari } = komponenTanggalWIB(date);
  return formatYMD(tahun, bulan, hari);
}

function formatYMD(tahun, bulan, hari) {
  return `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
}

/**
 * Ubah objek Date "murni tanggal" (dibuat via Date.UTC) menjadi string YYYY-MM-DD.
 * Dipakai untuk hasil perhitungan mundur (misal -6 hari, -29 hari).
 */
function formatDariUTCDate(date) {
  return formatYMD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Menghasilkan { mulai, sampai } dalam format YYYY-MM-DD, dihitung dari "hari ini" versi WIB.
 * period: 'hari' (hari ini saja), 'minggu' (7 hari terakhir), 'bulan' (bulan berjalan)
 */
function rentangTanggal(period) {
  const { tahun, bulan, hari } = komponenTanggalWIB();
  const sampai = formatYMD(tahun, bulan, hari);

  // Representasikan "hari ini WIB" sebagai tanggal murni (jam 00:00 UTC) supaya aman
  // dipakai untuk operasi tambah/kurang hari, tanpa terpengaruh timezone server.
  const hariIniSebagaiUTC = new Date(Date.UTC(tahun, bulan - 1, hari));

  if (period === 'minggu') {
    const mulaiDate = new Date(hariIniSebagaiUTC);
    mulaiDate.setUTCDate(mulaiDate.getUTCDate() - 6); // 7 hari termasuk hari ini
    return { mulai: formatDariUTCDate(mulaiDate), sampai };
  }

  if (period === 'bulan') {
    const mulaiDate = new Date(Date.UTC(tahun, bulan - 1, 1));
    return { mulai: formatDariUTCDate(mulaiDate), sampai };
  }

  if (period === 'hari') {
    return { mulai: sampai, sampai };
  }

  // default: 30 hari terakhir
  const mulaiDate = new Date(hariIniSebagaiUTC);
  mulaiDate.setUTCDate(mulaiDate.getUTCDate() - 29);
  return { mulai: formatDariUTCDate(mulaiDate), sampai };
}

module.exports = { rentangTanggal, tanggalSekarangWIB, waktuSekarangWIB };