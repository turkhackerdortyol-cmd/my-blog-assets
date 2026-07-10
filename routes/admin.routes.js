const express = require('express');
const router = express.Router();
const supabase = require('../src/db');
const { requireAdmin } = require('../src/auth');
const { makeSlug } = require('../src/slug');

// Admin panel içeriğini AJAX ile getirir (sağdan açılan popup içine yüklenir)
router.get('/panel', requireAdmin, async (req, res) => {
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order');
  const { data: users } = await supabase.from('users').select('id, username, email, role, is_banned, created_at').order('created_at', { ascending: false }).limit(100);
  const { data: settingsRows } = await supabase.from('site_settings').select('*');
  const settings = {};
  (settingsRows || []).forEach(r => settings[r.key] = r.value);

  res.render('partials/admin-panel', { categories: categories || [], users: users || [], settings, layout: false });
});

// --- Kategori ---
router.post('/kategori/ekle', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const icon = (req.body.icon || 'fa-comments').trim();
  if (name) {
    await supabase.from('categories').insert({ name, slug: makeSlug(name), icon, description: req.body.description || '' });
  }
  res.redirect('/admin/panel');
});
router.post('/kategori/:id(\\d+)/sil', requireAdmin, async (req, res) => {
  await supabase.from('categories').delete().eq('id', req.params.id);
  res.redirect('/admin/panel');
});

// --- Üye rol / engelleme / silme ---
router.post('/uye/:id/rol', requireAdmin, async (req, res) => {
  const role = req.body.role;
  if (['member', 'mod', 'admin'].includes(role)) {
    await supabase.from('users').update({ role }).eq('id', req.params.id);
  }
  res.redirect('/admin/panel');
});
router.post('/uye/:id/yasakla', requireAdmin, async (req, res) => {
  const { data: u } = await supabase.from('users').select('is_banned').eq('id', req.params.id).maybeSingle();
  if (u) await supabase.from('users').update({ is_banned: !u.is_banned, ban_reason: req.body.reason || null }).eq('id', req.params.id);
  res.redirect('/admin/panel');
});
router.post('/uye/:id/sil', requireAdmin, async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.redirect('/admin/panel');
});

// --- Site ayarları ---
router.post('/ayarlar', requireAdmin, async (req, res) => {
  const entries = Object.entries(req.body);
  for (const [key, value] of entries) {
    await supabase.from('site_settings').upsert({ key, value: String(value) });
  }
  res.redirect('/admin/panel');
});

module.exports = router;
