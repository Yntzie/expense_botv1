require('dotenv').config();
const { mulaiBot } = require('./bot');
const { buatWebApp } = require('./web');

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN belum diatur. Buat file .env dan isi BOT_TOKEN (lihat .env.example).');
  process.exit(1);
}

// Jalankan bot Telegram
mulaiBot(BOT_TOKEN);

// Jalankan dashboard web
const app = buatWebApp();
app.listen(PORT, () => {
  console.log(`🌐 Dashboard web berjalan di http://localhost:${PORT}`);
});
