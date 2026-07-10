const { embedFromUrl } = require('./embeds');

// Çok basit ve güvenli bir "editör -> HTML" dönüştürücü.
// İzin verilenler: düz metin, satır sonları, [img]URL[/img], [video]URL[/video], **kalın**, *italik*
// Kullanıcıdan gelen serbest HTML asla doğrudan basılmaz (XSS'e kapalı).
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEditorContent(raw) {
  let text = escapeHtml(raw || '');

  // [img]url[/img] -> <img>
  text = text.replace(/\[img\](https?:\/\/[^\s\[]+)\[\/img\]/gi, (m, url) => {
    return `<img src="${url}" alt="" loading="lazy" class="vb-post-img">`;
  });

  // [video]url[/video] -> platform embedi
  text = text.replace(/\[video\](https?:\/\/[^\s\[]+)\[\/video\]/gi, (m, url) => {
    const html = embedFromUrl(url);
    return html || `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${url}</a>`;
  });

  // **kalın**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italik*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // düz linkler (embed edilmeyenler) tıklanabilir olsun
  text = text.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
    if (text.includes(`src="${m}"`) || text.includes(`href="${m}"`)) return m;
    return `<a href="${m}" target="_blank" rel="noopener noreferrer nofollow">${m}</a>`;
  });

  // satır sonları
  text = text.split('\n').map(l => l.trim()).join('<br>');

  return text;
}

module.exports = { renderEditorContent, escapeHtml };
