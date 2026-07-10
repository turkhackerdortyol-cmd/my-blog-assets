// =========================================================
// Basit ama yetenekli zengin metin editörü.
// Bağımlılık yok — contenteditable + execCommand + özel embed mantığı.
// =========================================================

function embedHtmlFor(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host.includes("youtube.com") || host === "youtu.be") {
      let id = null;
      if (host === "youtu.be") id = u.pathname.slice(1);
      else if (u.searchParams.get("v")) id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
        if (m) id = m[2];
      }
      if (id) return iframeWrap(`https://www.youtube.com/embed/${id}`);
    }

    // Dailymotion
    if (host.includes("dailymotion.com") || host === "dai.ly") {
      const m = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/) || (host === "dai.ly" ? [null, u.pathname.slice(1)] : null);
      if (m && m[1]) return iframeWrap(`https://www.dailymotion.com/embed/video/${m[1]}`);
    }

    // TikTok — resmi oEmbed script'i olmadan basit link kartı + embed player
    if (host.includes("tiktok.com")) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return iframeWrap(`https://www.tiktok.com/embed/v2/${m[1]}`);
      return linkCard(url, "TikTok gönderisi");
    }

    // Instagram — genel gömme uç noktası
    if (host.includes("instagram.com")) {
      const clean = u.pathname.replace(/\/$/, "");
      return iframeWrap(`https://www.instagram.com${clean}/embed`);
    }

    // Facebook — plugin embed
    if (host.includes("facebook.com") || host === "fb.watch") {
      return iframeWrap(`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true`);
    }

    // Twitter / X — basit link kartı (script tabanlı embed CSP sorunlarına takılabildiği için)
    if (host.includes("twitter.com") || host === "x.com") {
      return linkCard(url, "X (Twitter) gönderisi");
    }

    return null; // video/embed olarak tanınmadı
  } catch {
    return null;
  }
}

function iframeWrap(src) {
  return `<div class="embed-wrap" contenteditable="false"><iframe src="${src}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
}

function linkCard(url, label) {
  return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" contenteditable="false" style="display:inline-flex;margin:6px 0"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${label} — bağlantıyı aç</a>`;
}

export function createEditor(container) {
  container.innerHTML = `
    <div class="editor-toolbar">
      <button type="button" data-cmd="bold" title="Kalın"><i class="fa-solid fa-bold"></i></button>
      <button type="button" data-cmd="italic" title="İtalik"><i class="fa-solid fa-italic"></i></button>
      <button type="button" data-cmd="underline" title="Altı çizili"><i class="fa-solid fa-underline"></i></button>
      <button type="button" data-cmd="insertUnorderedList" title="Liste"><i class="fa-solid fa-list-ul"></i></button>
      <button type="button" data-action="link" title="Bağlantı ekle"><i class="fa-solid fa-link"></i></button>
      <button type="button" data-action="image" title="Resim ekle (URL)"><i class="fa-solid fa-image"></i></button>
      <button type="button" data-action="video" title="Video göm (YouTube, Dailymotion, Instagram, TikTok, Facebook, X)"><i class="fa-solid fa-video"></i></button>
    </div>
    <div class="editor-area" contenteditable="true" data-placeholder="Bir şeyler yaz..."></div>
  `;
  const area = container.querySelector(".editor-area");

  container.querySelectorAll("button[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      area.focus();
      document.execCommand(btn.dataset.cmd, false, null);
    });
  });

  container.querySelector('[data-action="link"]').addEventListener("click", () => {
    const url = prompt("Bağlantı adresi (https://...):");
    if (!url) return;
    area.focus();
    document.execCommand("createLink", false, url);
  });

  container.querySelector('[data-action="image"]').addEventListener("click", () => {
    const url = prompt("Resim adresi (URL):");
    if (!url) return;
    area.focus();
    document.execCommand("insertHTML", false, `<img src="${url}" alt="">`);
  });

  container.querySelector('[data-action="video"]').addEventListener("click", () => {
    const url = prompt("Video bağlantısı (YouTube, Dailymotion, Instagram, TikTok, Facebook veya X):");
    if (!url) return;
    const html = embedHtmlFor(url);
    area.focus();
    if (html) {
      document.execCommand("insertHTML", false, html + "<p><br></p>");
    } else {
      alert("Bu bağlantı desteklenen platformlardan biri gibi görünmüyor. Bağlantı olarak eklendi.");
      document.execCommand("createLink", false, url);
    }
  });

  return {
    getHTML: () => sanitize(area.innerHTML),
    setHTML: (html) => (area.innerHTML = html),
    clear: () => (area.innerHTML = ""),
    focus: () => area.focus(),
  };
}

// Çok temel bir temizleme: script/style ve on* olaylarını kaldırır.
// Not: Gerçek bir üretim ortamında sunucu tarafında (Supabase Edge Function
// veya benzeri) DOMPurify gibi güçlü bir kütüphane ile tekrar doğrulanmalıdır.
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

export { embedHtmlFor };
