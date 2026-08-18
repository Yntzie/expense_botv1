// Kata kunci untuk mengenali jenis transaksi dari pesan
const KATA_KELUAR = ['keluar', 'pengeluaran', 'k', 'beli', 'bayar', 'jajan'];
const KATA_MASUK = ['masuk', 'pemasukan', 'm', 'gaji', 'terima', 'dapat', 'bonus', 'jual'];

/**
 * Ubah teks angka seperti "20rb", "1.5jt", "20k", "20.000" jadi angka murni
 */
function parseJumlah(teks) {
  if (!teks) return null;
  let t = teks.toLowerCase().trim().replace(/\s+/g, '');

  // Format seperti 1.5jt / 1,5jt / 2jt
  const jtMatch = t.match(/^(\d+([.,]\d+)?)jt$/);
  if (jtMatch) {
    return Math.round(parseFloat(jtMatch[1].replace(',', '.')) * 1_000_000);
  }

  // Format seperti 20rb / 20k / 1.5rb
  const rbMatch = t.match(/^(\d+([.,]\d+)?)(rb|k)$/);
  if (rbMatch) {
    return Math.round(parseFloat(rbMatch[1].replace(',', '.')) * 1_000);
  }

  // Format angka biasa, boleh pakai titik/koma sebagai pemisah ribuan: 20.000 / 20,000
  const angkaBersih = t.replace(/[.,]/g, '');
  if (/^\d+$/.test(angkaBersih)) {
    return parseInt(angkaBersih, 10);
  }

  return null;
}

/**
 * Parsing pesan chat menjadi { jenis, jumlah, keterangan } atau null kalau tidak valid
 * Format yang didukung, contoh:
 *   "keluar 20000 makan siang"
 *   "k 20rb bensin"
 *   "masuk 5jt gaji bulanan"
 *   "m 500rb bonus"
 */
function parsePesan(teks) {
  if (!teks) return null;
  const bagian = teks.trim().split(/\s+/);
  if (bagian.length < 2) return null;

  const kataPertama = bagian[0].toLowerCase();
  let jenis = null;

  if (KATA_KELUAR.includes(kataPertama)) jenis = 'keluar';
  else if (KATA_MASUK.includes(kataPertama)) jenis = 'masuk';
  else return null; // pesan tidak diawali kata kunci yang dikenali

  const jumlah = parseJumlah(bagian[1]);
  if (jumlah === null || jumlah <= 0) return null;

  const keterangan = bagian.slice(2).join(' ').trim() || '(tanpa keterangan)';

  return { jenis, jumlah, keterangan };
}

module.exports = { parsePesan, parseJumlah };
