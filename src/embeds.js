// URL -> güvenli embed HTML (iframe) üretir. Sadece izin verilen platformlar.
function embedFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // YouTube
    if (host.includes('youtube.com') || host === 'youtu.be') {
      let id = null;
      if (host === 'youtu.be') id = u.pathname.slice(1);
      else if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1];
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1];
      if (id) return iframe(`https://www.youtube.com/embed/${id.split('&')[0]}`);
    }

    // Dailymotion
    if (host.includes('dailymotion.com') || host === 'dai.ly') {
      let id = null;
      if (host === 'dai.ly') id = u.pathname.slice(1);
      else if (u.pathname.startsWith('/video/')) id = u.pathname.split('/video/')[1];
      if (id) return iframe(`https://www.dailymotion.com/embed/video/${id.split('_')[0]}`);
    }

    // Instagram (post/reel)
    if (host.includes('instagram.com')) {
      const clean = u.pathname.replace(/\/$/, '');
      return iframe(`https://www.instagram.com${clean}/embed`);
    }

    // TikTok
    if (host.includes('tiktok.com')) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return `<blockquote class="tiktok-embed" cite="${escapeAttr(url)}" data-video-id="${m[1]}" style="max-width:605px;min-width:325px;"></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
    }

    // Facebook (video/post)
    if (host.includes('facebook.com') || host === 'fb.watch') {
      return iframe(`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`);
    }

    // Twitter / X
    if (host.includes('twitter.com') || host === 'x.com') {
      return `<blockquote class="twitter-tweet"><a href="${escapeAttr(url)}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`;
    }

    return null; // desteklenmeyen platform
  } catch (e) {
    return null;
  }
}

function iframe(src) {
  return `<div class="vb-embed-wrap"><iframe src="${escapeAttr(src)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

module.exports = { embedFromUrl };
