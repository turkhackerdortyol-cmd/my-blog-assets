const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../src/db');
const { hashPassword, checkPassword, createSessionCookie, clearSessionCookie, requireAuth } = require('../src/auth');
const { sendResetMail } = require('../src/mail');

// ---------- KAYIT ----------
router.get('/kayit', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('register', { error: null, old: {} });
});

router.post('/kayit', async (req, res) => {
  const { username, email, password, password2 } = req.body;
  const uname = (username || '').trim();
  const mail = (email || '').trim().toLowerCase();

  if (!uname || !mail || !password) {
    return res.render('register', { error: 'Tüm alanları doldurun.', old: req.body });
  }
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(uname)) {
    return res.render('register', { error: 'Kullanıcı adı 3-32 karakter, sadece harf/rakam/alt çizgi içerebilir.', old: req.body });
  }
  if (password.length < 6) {
    return res.render('register', { error: 'Şifre en az 6 karakter olmalı.', old: req.body });
  }
  if (password !== password2) {
    return res.render('register', { error: 'Şifreler eşleşmiyor.', old: req.body });
  }

  const { data: existing } = await supabase
    .from('users').select('id').or(`username.eq.${uname},email.eq.${mail}`).maybeSingle();
  if (existing) {
    return res.render('register', { error: 'Bu kullanıcı adı veya e-posta zaten kayıtlı.', old: req.body });
  }

  const { data: user, error } = await supabase.from('users').insert({
    username: uname, email: mail, password_hash: hashPassword(password), role: 'member'
  }).select().single();

  if (error) {
    return res.render('register', { error: 'Kayıt oluşturulamadı: ' + error.message, old: req.body });
  }

  // Doğrulama yok - direkt giriş yapılır.
  createSessionCookie(res, user);
  res.redirect('/');
});

// ---------- GİRİŞ ----------
router.get('/giris', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { error: null, next: req.query.next || '/' });
});

router.post('/giris', async (req, res) => {
  const { identifier, password } = req.body; // kullanıcı adı veya e-posta
  const id = (identifier || '').trim().toLowerCase();

  const { data: user } = await supabase
    .from('users').select('*')
    .or(`username.eq.${identifier || ''},email.eq.${id}`)
    .maybeSingle();

  if (!user || !checkPassword(password || '', user.password_hash)) {
    return res.render('login', { error: 'Kullanıcı adı/e-posta veya şifre hatalı.', next: req.body.next || '/' });
  }
  if (user.is_banned) {
    return res.render('login', { error: 'Bu hesap engellenmiştir.' + (user.ban_reason ? ' Sebep: ' + user.ban_reason : ''), next: '/' });
  }

  createSessionCookie(res, user);
  res.redirect(req.body.next || '/');
});

router.get('/cikis', (req, res) => {
  clearSessionCookie(res);
  res.redirect('/');
});

// ---------- ŞİFREMİ UNUTTUM ----------
router.get('/sifremi-unuttum', (req, res) => {
  res.render('forgot', { error: null, sent: false });
});

router.post('/sifremi-unuttum', async (req, res) => {
  const mail = (req.body.email || '').trim().toLowerCase();
  const { data: user } = await supabase.from('users').select('*').eq('email', mail).maybeSingle();

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from('users').update({ reset_token: token, reset_token_expires: expires }).eq('id', user.id);
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/sifre-sifirla/${token}`;
    await sendResetMail(user.email, resetUrl);
  }
  // Kullanıcı var mı yok mu bilgisini sızdırmamak için her zaman aynı mesaj
  res.render('forgot', { error: null, sent: true });
});

router.get('/sifre-sifirla/:token', async (req, res) => {
  const { data: user } = await supabase.from('users').select('id, reset_token_expires')
    .eq('reset_token', req.params.token).maybeSingle();
  if (!user || new Date(user.reset_token_expires) < new Date()) {
    return res.render('reset', { error: 'Bağlantının süresi dolmuş veya geçersiz.', token: null });
  }
  res.render('reset', { error: null, token: req.params.token });
});

router.post('/sifre-sifirla/:token', async (req, res) => {
  const { data: user } = await supabase.from('users').select('id, reset_token_expires')
    .eq('reset_token', req.params.token).maybeSingle();
  if (!user || new Date(user.reset_token_expires) < new Date()) {
    return res.render('reset', { error: 'Bağlantının süresi dolmuş veya geçersiz.', token: null });
  }
  const { password, password2 } = req.body;
  if (!password || password.length < 6 || password !== password2) {
    return res.render('reset', { error: 'Şifreler eşleşmiyor veya çok kısa (en az 6 karakter).', token: req.params.token });
  }
  await supabase.from('users').update({
    password_hash: hashPassword(password), reset_token: null, reset_token_expires: null
  }).eq('id', user.id);
  res.redirect('/giris');
});

module.exports = router;
