const express = require('express');
const router = express.Router();
const supabase = require('../src/db');
const { requireAuth } = require('../src/auth');

// POST /api/begen  { type: 'thread'|'post', id: number }
router.post('/begen', requireAuth, async (req, res) => {
  const { type, id } = req.body;
  if (!['thread', 'post'].includes(type) || !id) return res.status(400).json({ error: 'Geçersiz istek' });

  const col = type === 'thread' ? 'thread_id' : 'post_id';
  const table = type === 'thread' ? 'threads' : 'posts';

  const { data: existing } = await supabase.from('likes').select('id')
    .eq('user_id', req.user.id).eq(col, id).maybeSingle();

  let liked;
  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
    liked = false;
  } else {
    await supabase.from('likes').insert({ user_id: req.user.id, [col]: id });
    liked = true;
  }

  const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq(col, id);
  await supabase.from(table).update({ like_count: count || 0 }).eq('id', id);

  // Beğenilen içeriğin sahibinin likes_received sayacını güncelle
  const { data: item } = await supabase.from(table).select('user_id').eq('id', id).maybeSingle();
  if (item) {
    const { count: totalReceived } = await supabase.from('likes').select('id, threads!inner(user_id)', { count: 'exact', head: true });
    // basit güncelleme: ilgili kullanıcının toplam beğenisini yeniden say
    const { count: threadLikes } = await supabase.from('likes').select('threads!inner(user_id)', { count: 'exact', head: true }).eq('threads.user_id', item.user_id);
    const { count: postLikes } = await supabase.from('likes').select('posts!inner(user_id)', { count: 'exact', head: true }).eq('posts.user_id', item.user_id);
    await supabase.from('users').update({ likes_received: (threadLikes || 0) + (postLikes || 0) }).eq('id', item.user_id);
  }

  res.json({ liked, count: count || 0 });
});

module.exports = router;
