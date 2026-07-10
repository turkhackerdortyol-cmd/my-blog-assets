// MiFRM - yeni backend'e özel istemci tarafı JS (tema class isimleriyle uyumlu)

function mfToggleUserMenu(){
  var m = document.getElementById('mfUserMenu');
  if (m) m.classList.toggle('open');
}
document.addEventListener('click', function(e){
  var menu = document.getElementById('mfUserMenu');
  if (menu && !menu.contains(e.target) && !e.target.closest('.mf-user-btn')) menu.classList.remove('open');
});

// ---- Admin Paneli (sağdan açılır popup) ----
function openAdminPanel(){
  var overlay = document.getElementById('mfAdminOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  var body = document.getElementById('mfAdminPanelBody');
  if (body && !body.dataset.loaded) {
    fetch('/admin/panel').then(function(r){ return r.text(); }).then(function(html){
      body.innerHTML = html;
      body.dataset.loaded = '1';
    }).catch(function(){
      body.innerHTML = '<p class="mf-empty">Panel yüklenemedi.</p>';
    });
  }
}
function closeAdminPanel(){
  var overlay = document.getElementById('mfAdminOverlay');
  if (overlay) overlay.classList.remove('open');
}
function mfAdminTab(btn, paneId){
  document.querySelectorAll('.mf-admin-tab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.mf-admin-tab-pane').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  var pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');
}

// ---- Beğeni butonu (AJAX) ----
function mfToggleLike(btn){
  var type = btn.dataset.type, id = btn.dataset.id;
  fetch('/api/begen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: type, id: id })
  }).then(function(r){
    if (r.status === 401) { window.location.href = '/giris'; return null; }
    return r.json();
  }).then(function(data){
    if (!data) return;
    btn.classList.toggle('liked', data.liked);
    var countEl = btn.querySelector('.mf-like-count');
    if (countEl) countEl.textContent = data.count;
  });
}

// ---- Editör: [img]/[video] etiket ekleme ----
function mfInsertTag(textareaId, kind){
  var url = prompt(kind === 'img' ? 'Resim URL adresi:' : 'Video URL adresi (YouTube, Dailymotion, Instagram, TikTok, Facebook, Twitter):');
  if (!url) return;
  var ta = document.getElementById(textareaId);
  if (!ta) return;
  var snippet = '[' + kind + ']' + url.trim() + '[/' + kind + ']';
  mfInsertAtCursor(ta, snippet);
}
function mfInsertWrap(textareaId, wrap){
  var ta = document.getElementById(textareaId);
  if (!ta) return;
  var start = ta.selectionStart, end = ta.selectionEnd;
  var selected = ta.value.substring(start, end) || 'metin';
  var before = ta.value.substring(0, start), after = ta.value.substring(end);
  ta.value = before + wrap + selected + wrap + after;
  ta.focus();
}
function mfInsertAtCursor(ta, text){
  var start = ta.selectionStart, end = ta.selectionEnd;
  var before = ta.value.substring(0, start), after = ta.value.substring(end);
  ta.value = before + text + after;
  ta.focus();
  var pos = start + text.length;
  ta.setSelectionRange(pos, pos);
}
