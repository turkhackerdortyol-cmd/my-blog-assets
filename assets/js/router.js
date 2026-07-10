// =========================================================
// Basit yol (route) ayrıştırıcı — vbseo tarzı URL yapısı için.
// Örnekler:
//   /                                  -> anasayfa (kategori listesi)
//   /genel.html                        -> kategori: genel, sayfa 1
//   /genel/sayfa-2.html                -> kategori: genel, sayfa 2
//   /genel/12345-hayat-cok-guzel.html  -> konu: id 12345
//   /uye/kullanici-adi.html            -> profil
// =========================================================

function restoreRedirectedPath() {
  const params = new URLSearchParams(location.search);
  const redirected = params.get("__redirect");
  if (redirected) {
    history.replaceState(null, "", redirected);
    return redirected;
  }
  return location.pathname + location.search + location.hash;
}

export function parseRoute() {
  const raw = restoreRedirectedPath();
  const [pathPart] = raw.split(/[?#]/);
  const segments = pathPart.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { name: "home" };
  }

  if (segments[0] === "uye" && segments[1]) {
    const username = segments[1].replace(/\.html$/, "");
    return { name: "profile", username: decodeURIComponent(username) };
  }

  if (segments[0] === "admin") {
    return { name: "home", openAdmin: true };
  }

  if (segments[0] === "sifremi-unuttum") {
    return { name: "forgot" };
  }

  // /{kategori}.html  veya /{kategori}/...
  const catSeg = segments[0].replace(/\.html$/, "");

  if (segments.length === 1) {
    return { name: "category", categorySlug: catSeg, page: 1 };
  }

  const second = segments[1].replace(/\.html$/, "");

  // /{kategori}/sayfa-N.html
  const pageMatch = second.match(/^sayfa-(\d+)$/);
  if (pageMatch) {
    return { name: "category", categorySlug: catSeg, page: parseInt(pageMatch[1], 10) };
  }

  // /{kategori}/{id}-{slug}.html
  const threadMatch = second.match(/^(\d+)(?:-(.*))?$/);
  if (threadMatch) {
    return {
      name: "thread",
      categorySlug: catSeg,
      threadId: threadMatch[1],
      page: segments[2] ? parseInt((segments[2].match(/^sayfa-(\d+)$/) || [])[1] || "1", 10) : 1,
    };
  }

  return { name: "notfound" };
}

export function slugify(text) {
  const trMap = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" };
  return text
    .split("")
    .map((ch) => trMap[ch] || ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function categoryUrl(slug, page = 1) {
  return page > 1 ? `/${slug}/sayfa-${page}.html` : `/${slug}.html`;
}

export function threadUrl(categorySlug, id, title, page = 1) {
  const base = `/${categorySlug}/${id}-${slugify(title)}.html`;
  return page > 1 ? base.replace(".html", "") + `/sayfa-${page}.html` : base;
}

export function profileUrl(username) {
  return `/uye/${encodeURIComponent(username)}.html`;
}

export function navigate(url) {
  history.pushState(null, "", url);
  window.dispatchEvent(new Event("meydan:navigate"));
}

// Sayfa içi <a data-link> tıklamalarını yakalayıp pushState ile yönlendir
export function bindLinkInterception(root = document) {
  root.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });
}

window.addEventListener("popstate", () => window.dispatchEvent(new Event("meydan:navigate")));
