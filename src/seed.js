const supabase = require('./db');
const { hashPassword } = require('./auth');

async function ensureAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@mifrm.eu.cc';
  const password = process.env.SEED_ADMIN_PASSWORD || 'DegistirilecekSifre123';

  const { data: existing } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('users').insert({
    username, email,
    password_hash: hashPassword(password),
    role: 'admin'
  });

  if (error) {
    console.error('[İlk admin oluşturulamadı]', error.message);
    return;
  }
  console.log(`✔ İlk admin oluşturuldu -> kullanıcı adı: ${username} / şifre: ${password} (giriş sonrası değiştirin)`);
}

module.exports = { ensureAdmin };

// Doğrudan "node src/seed.js" ile de çalıştırılabilir
if (require.main === module) {
  require('dotenv').config();
  ensureAdmin().then(() => process.exit(0));
}
