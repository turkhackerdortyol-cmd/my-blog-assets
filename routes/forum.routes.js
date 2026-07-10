const express = require('express');
const router = express.Router();
const supabase = require('../src/db');
const { requireAuth } = require('../src/auth');
const { renderEditorContent } = require('../src/editorRender');
const { makeSlug } = require('../src/slug');

// ---------- ANASAYFA ----------
router.get('/', async (req, res) => {
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order');
  const { data: latestThreads } = await supabase
    .from('threads')
    .select('*, categories(name, slug), users(username, avatar_url)')
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(20);

  const { count: totalThreads } = await supabase.from('threads').select('*', { count: 'exact', head: true });
  const { count: totalPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });

  res.render('index', {
    categories: categories || [],
    threads: latestThreads || [],
    stats: { totalThreads: totalThreads || 0, totalPosts: totalPosts || 0, totalUsers: totalUsers || 0 }
  });
});

// ---------- KATEGORİ (konu listesi) ----------
router.get('/:catSlug([a-z0-9-]+)', async (req, res, next) => {
  const { data: category } = await supabase.from('categories').select('*').eq('slug', req.params.catSlug).maybeSingle();
  if (!category) return next(); // 404'e düş

  const page = Math.max(1, parseInt(req.query.sayfa) || 1);
  const perPage = 20;
  const { data: threads, count } = await supabase
    .from('threads')
    .select('*, users(username, avatar_url)', { count: 'exact' })
    .eq('category_id', category.id)
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  res.render('category', {
    category, threads: threads || [],
    page, totalPages: Math.max(1, Math.ceil((count || 0) / perPage))
  });
});

// ---------- YENİ KONU AÇ ----------
router.get('/:catSlug([a-z0-9-]+)/yeni-konu', requireAuth, async (req, res, next) => {
  const { data: category } = await supabase.from('categories').select('*').eq('slug', req.params.catSlug).maybeSingle();
  if (!category) return next();
  res.render('new-thread', { category, error: null, old: {} });
});

router.post('/:catSlug([a-z0-9-]+)/yeni-konu', requireAuth, async (req, res, next) => {
  const { data: category } = await supabase.from('categories').select('*').eq('slug', req.params.catSlug).maybeSingle();
  if (!category) return next();

  const title = (req.body.title || '').trim();
  const rawBody = (req.body.body || '').trim();
  if (title.length < 5) return res.render('new-thread', { category, error: 'Başlık en az 5 karakter olmalı.', old: req.body });
  if (rawBody.length < 10) return res.render('new-thread', { category, error: 'İçerik en az 10 karakter olmalı.', old: req.body });

  const { data: thread, error } = await supabase.from('threads').insert({
    category_id: category.id,
    user_id: req.user.id,
    title,
    slug: makeSlug(title),
    body_html: renderEditorContent(rawBody),
    last_reply_at: new Date().toISOString()
  }).select().single();

  if (error) return res.render('new-thread', { category, error: 'Konu oluşturulamadı: ' + error.message, old: req.body });

  await supabase.from('users').update({ thread_count: (req.user.thread_count || 0) + 1 }).eq('id', req.user.id);

  res.redirect(`/${category.slug}/${thread.id}-${thread.slug}.html`);
});

module.exports = router;
