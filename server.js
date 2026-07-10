require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const supabase = require('./src/db');
const { attachUser } = require('./src/auth');
const { ensureAdmin } = require('./src/seed');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));

app.use(attachUser);

// Her sayfada kullanılacak ortak veriler (nav kategorileri + site ayarları)
app.use(async (req, res, next) => {
  try {
    const { data: categories } = await supabase.from('categories').select('id, name, slug, icon').order('sort_order');
    const { data: settingsRows } = await supabase.from('site_settings').select('*');
    const settings = {};
    (settingsRows || []).forEach(r => settings[r.key] = r.value);
    res.locals.navCategories = categories || [];
    res.locals.siteSettings = settings;
  } catch (e) {
    res.locals.navCategories = [];
    res.locals.siteSettings = { site_name: 'MiFRM Forum' };
  }
  res.locals.currentUser = req.user;
  next();
});

app.use('/', require('./routes/auth.routes'));
app.use('/', require('./routes/profile.routes'));
app.use('/admin', require('./routes/admin.routes'));
app.use('/api', require('./routes/api.routes'));
app.use('/', require('./routes/thread.routes'));
app.use('/', require('./routes/forum.routes'));

app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Sunucu hatası: ' + err.message);
});

const PORT = process.env.PORT || 3000;
ensureAdmin()
  .catch(e => console.error('[ensureAdmin hata]', e.message))
  .finally(() => {
    app.listen(PORT, () => console.log(`MiFRM Forum http://localhost:${PORT} adresinde çalışıyor`));
  });
