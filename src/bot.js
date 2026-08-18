const TelegramBot = require('node-telegram-bot-api');
const { parsePesan } = require('./parser');
const { tambahTransaksi, ringkasan, ambilTransaksi, hapusTransaksi } = require('./db');
const { buatWorkbookTransaksi, formatRupiah } = require('./excelExport');
const { rentangTanggal } = require('./tanggalHelper');

function mulaiBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  // Daftar chat_id yang diizinkan pakai bot (whitelist).
  // Kosongkan ALLOWED_CHAT_IDS di .env kalau mau bot bisa dipakai siapa saja (tidak disarankan setelah di-hosting publik).
  const daftarIzin = (process.env.ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function diizinkan(chat_id) {
    return daftarIzin.length === 0 || daftarIzin.includes(String(chat_id));
  }

  console.log('Bot Telegram aktif dan menunggu pesan...');
  if (daftarIzin.length === 0) {
    console.warn('⚠️  ALLOWED_CHAT_IDS belum diisi — bot ini bisa dipakai SIAPA SAJA yang menemukan username bot kamu. Disarankan diisi setelah kamu tahu chat_id kamu sendiri (lihat balasan /start).');
  }

  bot.on('polling_error', (err) => console.error('Polling error:', err.message));

  // --- Perintah /start dan /help (selalu dibalas, walau belum diizinkan, supaya user tahu chat_id-nya) ---
  bot.onText(/\/start|\/help/, (msg) => {
    const chat_id = String(msg.chat.id);

    if (!diizinkan(chat_id)) {
      bot.sendMessage(
        msg.chat.id,
        `👋 Halo! Chat ID kamu: \`${chat_id}\`\n\nBot ini dibatasi hanya untuk chat_id tertentu. Minta pemilik bot menambahkan ID di atas ke ALLOWED_CHAT_IDS di file .env, lalu restart bot-nya.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const teks = `👋 Halo! Aku bot pencatat keuangan kamu.
Chat ID kamu: \`${chat_id}\`

*Cara mencatat transaksi:*
\`keluar 20000 makan siang\`
\`k 20rb bensin\`
\`masuk 5jt gaji bulanan\`
\`m 500rb bonus\`

Kata kunci pengeluaran: keluar, k, beli, bayar, jajan
Kata kunci pemasukan: masuk, m, gaji, terima, dapat, bonus, jual

*Perintah lain:*
/ringkasan - lihat total minggu ini
/export minggu - kirim Excel 7 hari terakhir
/export bulan - kirim Excel bulan berjalan
/hapus <id> - hapus transaksi berdasarkan ID`;
    bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
  });

  // --- Perintah /ringkasan ---
  bot.onText(/\/ringkasan/, (msg) => {
    const chat_id = String(msg.chat.id);
    if (!diizinkan(chat_id)) return;
    const { mulai, sampai } = rentangTanggal('minggu');
    const r = ringkasan({ mulai, sampai, chat_id });

    const teks = `📊 *Ringkasan 7 hari terakhir*
Pemasukan: ${formatRupiah(r.totalMasuk)}
Pengeluaran: ${formatRupiah(r.totalKeluar)}
Saldo: ${formatRupiah(r.saldo)}
Jumlah transaksi: ${r.jumlahTransaksi}`;
    bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
  });

  // --- Perintah /export minggu | bulan ---
  bot.onText(/\/export(?:\s+(minggu|bulan))?/, async (msg, match) => {
    const chat_id = String(msg.chat.id);
    if (!diizinkan(chat_id)) return;
    const period = match[1] || 'bulan';
    const { mulai, sampai } = rentangTanggal(period);
    const rows = ambilTransaksi({ mulai, sampai, chat_id });

    if (rows.length === 0) {
      bot.sendMessage(msg.chat.id, `Belum ada transaksi pada periode ${period === 'minggu' ? '7 hari terakhir' : 'bulan ini'}.`);
      return;
    }

    const workbook = await buatWorkbookTransaksi(rows, {
      judul: `Catatan Keuangan - ${period === 'minggu' ? 'Mingguan' : 'Bulanan'}`,
      mulai,
      sampai,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    await bot.sendDocument(
      msg.chat.id,
      Buffer.from(buffer),
      {},
      { filename: `keuangan_${period}_${sampai}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
  });

  // --- Perintah /hapus <id> ---
  bot.onText(/\/hapus\s+(\d+)/, (msg, match) => {
    const chat_id = String(msg.chat.id);
    if (!diizinkan(chat_id)) return;
    const id = parseInt(match[1], 10);
    const berhasil = hapusTransaksi(id, chat_id);
    bot.sendMessage(msg.chat.id, berhasil ? `✅ Transaksi #${id} dihapus.` : `❌ Transaksi #${id} tidak ditemukan.`);
  });

  // --- Pesan biasa (pencatatan transaksi) ---
  bot.on('message', (msg) => {
    const teks = msg.text || '';
    if (teks.startsWith('/')) return; // sudah ditangani onText di atas

    const chat_id = String(msg.chat.id);
    if (!diizinkan(chat_id)) return; // diamkan pesan dari chat yang tidak diizinkan

    const hasil = parsePesan(teks);
    if (!hasil) {
      // Bukan format transaksi yang dikenali -> diamkan saja (tidak spam balasan error)
      return;
    }

    const sekarang = new Date();
    const tanggal = sekarang.toISOString().slice(0, 10);
    const waktu = sekarang.toTimeString().slice(0, 8);

    const id = tambahTransaksi({
      tanggal,
      waktu,
      jenis: hasil.jenis,
      jumlah: hasil.jumlah,
      keterangan: hasil.keterangan,
      chat_id: String(msg.chat.id),
      nama_pengirim: msg.from?.first_name || 'Tidak diketahui',
    });

    const emoji = hasil.jenis === 'masuk' ? '🟢' : '🔴';
    bot.sendMessage(
      msg.chat.id,
      `${emoji} Tercatat #${id}: ${hasil.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(hasil.jumlah)} - ${hasil.keterangan}`
    );
  });

  return bot;
}

module.exports = { mulaiBot };
