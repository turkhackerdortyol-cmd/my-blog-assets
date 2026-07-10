const express = require('express');
const router = express.Router();
const supabase = require('../src/db');
const { requireAuth } = require('../src/auth');

router.get('/uye/:username', async (req, res, next) => {
  const { data: profile } = await supabase.from('users').select('*').eq('username', req.params.username).maybeSingle();
  if (!profile) return next();

  const { data: threads } = await supabase.from('threads')
    .select('id, title, slug, created_at, categories(slug)')
    .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(15);

  const { data: posts } = await supabase.from('posts')
    .select('id, created_at, thread_id, threads(title, slug, categories(slug))')
    .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(15);

  res.render('profile', { profile, threads: threads || [], posts: posts || [] });
});

router.get('/profil/duzenle', requireAuth, (req, res) => {
  res.render('profile-edit', { error: null, success: false });
});

router.post('/profil/duzenle', requireAuth, async (req, res) => {
  const { bio, location, avatar_url, social_twitter, social_instagram, social_youtube, social_facebook, social_website } = req.body;
  const { error } = await supabase.from('users').update({
    bio: (bio || '').slice(0, 500),
    location: (location || '').slice(0, 120),
    avatar_url: (avatar_url || '').slice(0, 500),
    social_twitter: (social_twitter || '').slice(0, 200),
    social_instagram: (social_instagram || '').slice(0, 200),
    social_youtube: (social_youtube || '').slice(0, 200),
    social_facebook: (social_facebook || '').slice(0, 200),
    social_website: (social_website || '').slice(0, 200)
  }).eq('id', req.user.id);

  res.render('profile-edit', { error: error ? error.message : null, success: !error });
});

module.exports = router;
