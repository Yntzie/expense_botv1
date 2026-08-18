const ExcelJS = require('exceljs');

const formatRupiah = (angka) => `Rp ${Number(angka).toLocaleString('id-ID')}`;

/**
 * Membuat workbook Excel dari daftar transaksi.
 * Mengembalikan objek ExcelJS.Workbook (bisa di-.xlsx.writeBuffer() atau .write ke stream)
 */
async function buatWorkbookTransaksi(rows, { judul = 'Catatan Keuangan', mulai, sampai } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bot Catatan Keuangan';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Transaksi');

  // Judul & periode
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = judul;
  sheet.getCell('A1').font = { size: 14, bold: true };

  sheet.mergeCells('A2:F2');
  const periodeTeks = mulai && sampai ? `Periode: ${mulai} s/d ${sampai}` : 'Periode: Semua data';
  sheet.getCell('A2').value = periodeTeks;
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };

  sheet.addRow([]); // baris kosong

  // Header tabel
  const headerRow = sheet.addRow(['No', 'Tanggal', 'Waktu', 'Jenis', 'Jumlah', 'Keterangan']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Isi data
  rows.forEach((row, idx) => {
    const dataRow = sheet.addRow([
      idx + 1,
      row.tanggal,
      row.waktu,
      row.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
      row.jumlah,
      row.keterangan,
    ]);
    dataRow.getCell(5).numFmt = '#,##0';
    dataRow.getCell(4).font = {
      color: { argb: row.jenis === 'masuk' ? 'FF2E7D32' : 'FFC62828' },
      bold: true,
    };
  });

  // Baris total
  const totalMasuk = rows.filter(r => r.jenis === 'masuk').reduce((a, b) => a + b.jumlah, 0);
  const totalKeluar = rows.filter(r => r.jenis === 'keluar').reduce((a, b) => a + b.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;

  sheet.addRow([]);
  const rowMasuk = sheet.addRow(['', '', '', 'Total Pemasukan', totalMasuk, '']);
  rowMasuk.getCell(5).numFmt = '#,##0';
  rowMasuk.font = { bold: true };

  const rowKeluar = sheet.addRow(['', '', '', 'Total Pengeluaran', totalKeluar, '']);
  rowKeluar.getCell(5).numFmt = '#,##0';
  rowKeluar.font = { bold: true };

  const rowSaldo = sheet.addRow(['', '', '', 'Saldo', saldo, '']);
  rowSaldo.getCell(5).numFmt = '#,##0';
  rowSaldo.font = { bold: true, color: { argb: saldo >= 0 ? 'FF2E7D32' : 'FFC62828' } };

  // Lebar kolom
  sheet.columns = [
    { width: 6 },
    { width: 14 },
    { width: 10 },
    { width: 16 },
    { width: 16 },
    { width: 40 },
  ];

  return workbook;
}

module.exports = { buatWorkbookTransaksi, formatRupiah };
