function keFormatTanggal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Menghasilkan { mulai, sampai } dalam format YYYY-MM-DD
 * period: 'minggu' (7 hari terakhir), 'bulan' (bulan berjalan), 'hari' (hari ini)
 */
function rentangTanggal(period) {
  const sekarang = new Date();
  const sampai = keFormatTanggal(sekarang);

  if (period === 'minggu') {
    const mulaiDate = new Date(sekarang);
    mulaiDate.setDate(mulaiDate.getDate() - 6); // 7 hari termasuk hari ini
    return { mulai: keFormatTanggal(mulaiDate), sampai };
  }

  if (period === 'bulan') {
    const mulaiDate = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
    return { mulai: keFormatTanggal(mulaiDate), sampai };
  }

  if (period === 'hari') {
    return { mulai: sampai, sampai };
  }

  // default: 30 hari terakhir
  const mulaiDate = new Date(sekarang);
  mulaiDate.setDate(mulaiDate.getDate() - 29);
  return { mulai: keFormatTanggal(mulaiDate), sampai };
}

module.exports = { rentangTanggal, keFormatTanggal };
