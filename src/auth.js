const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('./db');

const COOKIE_NAME = 'mifrm_session';
const SECRET = process.env.JWT_SECRET || 'dev-secret-degistir';

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}
function checkPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}
function createSessionCookie(res, user) {
  const token = jwt.sign({ uid: user.id }, SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Her istekte oturumu çözüp req.user'a koyar (varsa)
async function attachUser(req, res, next) {
  req.user = null;
  try {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
      const payload = jwt.verify(token, SECRET);
      const { data } = await supabase.from('users').select('*').eq('id', payload.uid).single();
      if (data && !data.is_banned) {
        req.user = data;
      }
    }
  } catch (e) { /* geçersiz/eksik token - sorun değil */ }
  res.locals.currentUser = req.user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).redirect('/giris?next=' + encodeURIComponent(req.originalUrl));
  next();
}
function requireMod(req, res, next) {
  if (!req.user || !['mod', 'admin'].includes(req.user.role)) return res.status(403).send('Bu işlem için yetkiniz yok.');
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).send('Bu işlem için yetkiniz yok.');
  next();
}

module.exports = {
  COOKIE_NAME, hashPassword, checkPassword,
  createSessionCookie, clearSessionCookie,
  attachUser, requireAuth, requireMod, requireAdmin
};
