const express = require('express');
const router = express.Router();
const supabase = require('../src/db');
const { requireAuth, requireMod } = require('../src/auth');
const { renderEditorContent } = require('../src/editorRender');

// URL: /genel/12345-hayat-cok-guzel.html
router.get('/:catSlug([a-z0-9-]+)/:idSlug(\\d+-[a-z0-9-]+).html', async (req, res, next) => {
  const id = parseInt(req.params.idSlug.split('-')[0]);
  const { data: thread } = await supabase
    .from('threads')
    .select('*, categories(name, slug), users(id, username, avatar_url, role, post_count, thread_count, created_at)')
    .eq('id', id).maybeSingle();

  if (!thread || thread.categories.slug !== req.params.catSlug) return next();

  // Doğru SEO slug değilse kalıcı yönlendirme (301 mantığı - burada basit redirect)
  const correctPath = `/${thread.categories.slug}/${thread.id}-${thread.slug}.html`;
  if (req.path !== correctPath) return res.redirect(301, correctPath);

  supabase.from('threads').update({ view_count: (thread.view_count || 0) + 1 }).eq('id', thread.id).then(() => {});

  const { data: posts } = await supabase
    .from('posts')
    .select('*, users(id, username, avatar_url, role, post_count, created_at)')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  let likedThreadIds = [], likedPostIds = [];
  if (req.user) {
    const { data: myLikes } = await supabase.from('likes').select('thread_id, post_id').eq('user_id', req.user.id);
    likedThreadIds = (myLikes || []).filter(l => l.thread_id).map(l => l.thread_id);
    likedPostIds = (myLikes || []).filter(l => l.post_id).map(l => l.post_id);
  }

  res.render('thread', {
    thread, posts: posts || [],
    likedThreadIds, likedPostIds,
    canonicalUrl: `${process.env.SITE_URL || ''}${correctPath}`
  });
});

// Cevap yaz
router.post('/thread/:id(\\d+)/cevap', requireAuth, async (req, res) => {
  const threadId = parseInt(req.params.id);
  const { data: thread } = await supabase.from('threads').select('*, categories(slug)').eq('id', threadId).maybeSingle();
  if (!thread) return res.status(404).send('Konu bulunamadı');
  if (thread.is_locked) return res.status(403).send('Bu konu kilitli, cevap yazılamaz.');

  const rawBody = (req.body.body || '').trim();
  if (rawBody.length < 2) return res.redirect(`/${thread.categories.slug}/${thread.id}-${thread.slug}.html`);

  await supabase.from('posts').insert({
    thread_id: thread.id, user_id: req.user.id, body_html: renderEditorContent(rawBody)
  });
  await supabase.from('threads').update({
    reply_count: (thread.reply_count || 0) + 1, last_reply_at: new Date().toISOString()
  }).eq('id', thread.id);
  await supabase.from('users').update({ post_count: (req.user.post_count || 0) + 1 }).eq('id', req.user.id);

  res.redirect(`/${thread.categories.slug}/${thread.id}-${thread.slug}.html#son`);
});

// ---- Moderasyon: sabitle / kilitle / sil ----
router.post('/thread/:id(\\d+)/sabitle', requireMod, async (req, res) => {
  const { data: t } = await supabase.from('threads').select('is_pinned').eq('id', req.params.id).maybeSingle();
  if (t) await supabase.from('threads').update({ is_pinned: !t.is_pinned }).eq('id', req.params.id);
  res.redirect('back');
});
router.post('/thread/:id(\\d+)/kilitle', requireMod, async (req, res) => {
  const { data: t } = await supabase.from('threads').select('is_locked').eq('id', req.params.id).maybeSingle();
  if (t) await supabase.from('threads').update({ is_locked: !t.is_locked }).eq('id', req.params.id);
  res.redirect('back');
});
router.post('/thread/:id(\\d+)/sil', requireMod, async (req, res) => {
  await supabase.from('threads').delete().eq('id', req.params.id);
  res.redirect('/');
});
router.post('/post/:id(\\d+)/sil', requireMod, async (req, res) => {
  const { data: p } = await supabase.from('posts').select('thread_id').eq('id', req.params.id).maybeSingle();
  await supabase.from('posts').delete().eq('id', req.params.id);
  if (p) {
    const { data: t } = await supabase.from('threads').select('reply_count, categories(slug), slug').eq('id', p.thread_id).maybeSingle();
    if (t) await supabase.from('threads').update({ reply_count: Math.max(0, (t.reply_count || 1) - 1) }).eq('id', p.thread_id);
  }
  res.redirect('back');
});

module.exports = router;
