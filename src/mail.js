const nodemailer = require('nodemailer');

async function sendResetMail(to, resetUrl) {
  if (!process.env.SMTP_HOST) {
    // Geliştirme modu: SMTP tanımlı değilse linki konsola yazdır.
    console.log('\n[ŞİFRE SIFIRLAMA LİNKİ] ' + to + ' -> ' + resetUrl + '\n');
    return { dev: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@mifrm.eu.cc',
    to,
    subject: 'Şifre Sıfırlama - MiFRM Forum',
    html: `<p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (30 dakika geçerlidir):</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
  return { dev: false };
}

module.exports = { sendResetMail };
