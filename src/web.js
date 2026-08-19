const path = require('path');
const express = require('express');
const { ambilTransaksi, ringkasan } = require('./db');
const { buatWorkbookTransaksi } = require('./excelExport');
const { rentangTanggal } = require('./tanggalHelper');

// Middleware HTTP Basic Auth sederhana untuk melindungi dashboard.
// Username bebas (misal "admin"), password = DASHBOARD_KEY di .env
function buatMiddlewareAuth() {
  const dashboardKey = process.env.DASHBOARD_KEY;

  if (!dashboardKey) {
    console.warn('⚠️  DASHBOARD_KEY belum diisi — dashboard web TIDAK dilindungi password. Siapapun yang tahu URL-nya bisa lihat data keuangan kamu. Isi DASHBOARD_KEY di .env untuk mengaktifkan proteksi.');
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const [skema, kredensial] = header.split(' ');

    if (skema === 'Basic' && kredensial) {
      const decoded = Buffer.from(kredensial, 'base64').toString('utf8');
      const password = decoded.split(':')[1];
      if (password === dashboardKey) return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Dashboard Keuangan"');
    return res.status(401).send('Password diperlukan untuk mengakses dashboard ini.');
  };
}

function buatWebApp() {
  const app = express();
  app.use(buatMiddlewareAuth());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  function ambilRentang(req) {
    const { periode, mulai, sampai } = req.query;
    if (mulai && sampai) return { mulai, sampai };
    return rentangTanggal(periode || 'hari');
  }

  // API: daftar transaksi (untuk tabel di dashboard)
  app.get('/api/transaksi', (req, res) => {
    const { mulai, sampai } = ambilRentang(req);
    const rows = ambilTransaksi({ mulai, sampai });
    const ringkasanData = ringkasan({ mulai, sampai });
    res.json({ mulai, sampai, rows, ringkasan: ringkasanData });
  });

  // API: download Excel sesuai filter
  app.get('/api/export', async (req, res) => {
    const { mulai, sampai } = ambilRentang(req);
    const rows = ambilTransaksi({ mulai, sampai });

    const workbook = await buatWorkbookTransaksi(rows, {
      judul: 'Catatan Keuangan',
      mulai,
      sampai,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="keuangan_${mulai}_sd_${sampai}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  });

  return app;
}

module.exports = { buatWebApp };
