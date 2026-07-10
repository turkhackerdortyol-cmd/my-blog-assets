import { supabase } from "./supabaseClient.js";
import { parseRoute, bindLinkInterception, navigate, slugify, categoryUrl, threadUrl, profileUrl } from "./router.js";
import { signIn, signUp, signOut, getCurrentProfile, sendPasswordReset, updatePassword, getSession } from "./auth.js";
import { createEditor } from "./editor.js";
import { mountAdminPanel, openAdminPanel } from "./admin.js";
import { SITE_NAME, POSTS_PER_PAGE, THREADS_PER_PAGE } from "./config.js";

const root = document.getElementById("app");
let currentProfile = null;

// ---------- Yardımcılar ----------
function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa önce";
  if (diff < 2592000) return Math.floor(diff / 86400) + " gün önce";
  return new Date(dateStr).toLocaleDateString("tr-TR");
}
function usernameBadge(profile) {
  if (!profile) return "";
  const roleBadge =
    profile.role === "admin"
      ? '<span class="role-badge admin">Admin</span>'
      : profile.role === "mod"
      ? '<span class="role-badge mod">Mod</span>'
      : "";
  const verified = profile.verified ? '<span class="verified-badge"><i class="fa-solid fa-check"></i></span>' : "";
  return `<a href="${profileUrl(profile.username)}" data-link class="username-line">${escapeHtml(profile.username)} ${verified}</a> ${roleBadge}`;
}
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function setSchema(json) {
  let tag = document.getElementById("schema-ld");
  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = "schema-ld";
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(json);
}

// ---------- Üst bar + kenar çubuğu (her sayfada sabit) ----------
async function renderShell() {
  currentProfile = await getCurrentProfile();
  const { data: cats } = await supabase.from("categories").select("*").order("sort_order");

  const authArea = currentProfile
    ? `
      <a href="${profileUrl(currentProfile.username)}" data-link class="btn btn-ghost">
        <img class="avatar" style="width:24px;height:24px" src="${currentProfile.avatar_url || defaultAvatar(currentProfile.username)}">
        ${escapeHtml(currentProfile.username)}
      </a>
      ${currentProfile.role === "admin" ? `<button class="btn btn-ghost" id="open-admin"><i class="fa-solid fa-shield-halved"></i></button>` : ""}
      <button class="btn btn-ghost" id="btn-logout"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
    `
    : `
      <button class="btn btn-ghost" id="btn-login">Giriş yap</button>
      <button class="btn btn-primary" id="btn-register">Üye ol</button>
    `;

  document.getElementById("shell").innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <a href="/" data-link class="brand"><i class="fa-solid fa-people-roof"></i> ${SITE_NAME}</a>
        <div class="topbar-search"><i class="fa-solid fa-magnifying-glass"></i><input placeholder="Foruma bak..." disabled></div>
        <div class="topbar-actions">${authArea}</div>
      </div>
    </div>
    <div class="layout">
      <aside class="sidebar">
        <div class="card">
          <p class="eyebrow">Kategoriler</p>
          <ul class="cat-list" id="cat-list"></ul>
        </div>
        ${
          currentProfile
            ? `<button class="btn btn-primary" id="btn-new-thread" style="justify-content:center"><i class="fa-solid fa-pen"></i> Yeni konu aç</button>`
            : ""
        }
      </aside>
      <main id="main"></main>
    </div>
  `;

  const catList = document.getElementById("cat-list");
  const route = parseRoute();
  (cats || []).forEach((c) => {
    const a = document.createElement("a");
    a.href = categoryUrl(c.slug);
    a.setAttribute("data-link", "");
    a.className = route.categorySlug === c.slug ? "active" : "";
    a.innerHTML = `<i class="fa-solid ${c.icon || "fa-comments"}"></i> ${escapeHtml(c.name)}`;
    catList.appendChild(a);
  });

  bindLinkInterception(document.getElementById("shell"));

  document.getElementById("btn-login")?.addEventListener("click", () => openAuthModal("login"));
  document.getElementById("btn-register")?.addEventListener("click", () => openAuthModal("register"));
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await signOut();
    toast("Çıkış yapıldı.");
    navigate("/");
  });
  document.getElementById("open-admin")?.addEventListener("click", () => openAdminPanel());
  document.getElementById("btn-new-thread")?.addEventListener("click", () => openNewThreadModal(cats));
}

function defaultAvatar(seed) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}

// ---------- Kimlik doğrulama modalı ----------
function openAuthModal(mode = "login") {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="position:relative">
      <button class="btn btn-ghost btn-sm modal-close"><i class="fa-solid fa-xmark"></i></button>
      <h2>${mode === "login" ? "Giriş yap" : "Üye ol"}</h2>
      <p class="modal-sub">${mode === "login" ? SITE_NAME + "'a hoş geldin." : "Ücretsiz, saniyeler sürer."}</p>
      <form id="auth-form">
        ${
          mode === "register"
            ? `<div class="form-group"><label>Kullanıcı adı</label><input name="username" required></div>`
            : ""
        }
        <div class="form-group">
          <label>${mode === "login" ? "Kullanıcı adı veya e-posta" : "E-posta"}</label>
          <input name="identifier" required>
        </div>
        <div class="form-group"><label>Şifre</label><input name="password" type="password" required minlength="6"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">${mode === "login" ? "Giriş yap" : "Üye ol"}</button>
        <div class="form-error" id="auth-error"></div>
      </form>
      <div class="modal-links">
        <a href="#" id="switch-mode">${mode === "login" ? "Hesabın yok mu? Üye ol" : "Zaten üye misin? Giriş yap"}</a>
        ${mode === "login" ? `<a href="#" id="forgot-link">Şifremi unuttum</a>` : ""}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => e.target === overlay && overlay.remove());
  overlay.querySelector("#switch-mode").addEventListener("click", (e) => {
    e.preventDefault();
    overlay.remove();
    openAuthModal(mode === "login" ? "register" : "login");
  });
  overlay.querySelector("#forgot-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    overlay.remove();
    openForgotModal();
  });

  overlay.querySelector("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errorEl = overlay.querySelector("#auth-error");
    errorEl.textContent = "";
    try {
      if (mode === "login") {
        await signIn({ identifier: fd.get("identifier"), password: fd.get("password") });
      } else {
        await signUp({ username: fd.get("username"), email: fd.get("identifier"), password: fd.get("password") });
        toast("Kayıt başarılı! Giriş yapılıyor...");
      }
      overlay.remove();
      await renderShell();
      renderRoute();
    } catch (err) {
      errorEl.textContent = err.message || "Bir hata oluştu.";
    }
  });
}

function openForgotModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="position:relative">
      <button class="btn btn-ghost btn-sm modal-close"><i class="fa-solid fa-xmark"></i></button>
      <h2>Şifremi unuttum</h2>
      <p class="modal-sub">E-posta adresine sıfırlama bağlantısı gönderelim.</p>
      <form id="forgot-form">
        <div class="form-group"><label>E-posta</label><input name="email" type="email" required></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Sıfırlama bağlantısı gönder</button>
        <div class="form-error" id="forgot-error"></div>
        <div class="form-note" id="forgot-success" style="display:none;color:var(--success)">Bağlantı gönderildi, e-postanı kontrol et.</div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#forgot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    try {
      await sendPasswordReset(email);
      overlay.querySelector("#forgot-success").style.display = "block";
      overlay.querySelector("#forgot-error").textContent = "";
    } catch (err) {
      overlay.querySelector("#forgot-error").textContent = err.message;
    }
  });
}

// ---------- Yeni konu modalı ----------
function openNewThreadModal(cats) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="max-width:640px;position:relative">
      <button class="btn btn-ghost btn-sm modal-close"><i class="fa-solid fa-xmark"></i></button>
      <h2>Yeni konu aç</h2>
      <form id="new-thread-form">
        <div class="form-group">
          <label>Kategori</label>
          <select name="category_id" required style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border)">
            ${cats.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group"><label>Başlık</label><input name="title" required maxlength="120"></div>
        <div class="form-group">
          <label>İçerik</label>
          <div id="new-thread-editor"></div>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Konuyu yayınla</button>
        <div class="form-error" id="new-thread-error"></div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  const editor = createEditor(overlay.querySelector("#new-thread-editor"));

  overlay.querySelector("#new-thread-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get("title").trim();
    const content = editor.getHTML();
    const errorEl = overlay.querySelector("#new-thread-error");
    if (!content || content === "<br>") {
      errorEl.textContent = "İçerik boş olamaz.";
      return;
    }
    const session = await getSession();
    const { data: thread, error } = await supabase
      .from("threads")
      .insert({ category_id: fd.get("category_id"), user_id: session.user.id, title, slug: slugify(title) })
      .select()
      .single();
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
    await supabase.from("posts").insert({ thread_id: thread.id, user_id: session.user.id, content });
    overlay.remove();
    const cat = cats.find((c) => c.id == fd.get("category_id"));
    navigate(threadUrl(cat.slug, thread.id, thread.title));
  });
}

// ---------- Görünümler ----------
async function renderHome() {
  document.title = `${SITE_NAME} — Konuş, paylaş, tanış`;
  const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
  const counts = await Promise.all(
    (cats || []).map((c) => supabase.from("threads").select("id", { count: "exact", head: true }).eq("category_id", c.id))
  );
  const main = document.getElementById("main");
  main.innerHTML = `
    <p class="eyebrow">Kategoriler</p>
    <div class="category-grid">
      ${(cats || [])
        .map(
          (c, i) => `
        <a href="${categoryUrl(c.slug)}" data-link class="category-row" style="text-decoration:none;color:inherit">
          <div class="icon"><i class="fa-solid ${c.icon || "fa-comments"}"></i></div>
          <div>
            <h3>${escapeHtml(c.name)}</h3>
            <p>${escapeHtml(c.description || "")}</p>
          </div>
          <div class="stats">${counts[i]?.count ?? 0} konu</div>
        </a>`
        )
        .join("")}
    </div>
  `;
  setSchema({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: location.origin,
  });
}

async function renderCategory(route) {
  const { data: cat } = await supabase.from("categories").select("*").eq("slug", route.categorySlug).single();
  const main = document.getElementById("main");
  if (!cat) {
    main.innerHTML = notFoundHtml();
    return;
  }
  document.title = `${cat.name} — ${SITE_NAME}`;
  const page = route.page || 1;
  const from = (page - 1) * THREADS_PER_PAGE;
  const { data: threads, count } = await supabase
    .from("threads")
    .select("*, profiles(username,verified,role,avatar_url), posts(count)", { count: "exact" })
    .eq("category_id", cat.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + THREADS_PER_PAGE - 1);

  const totalPages = Math.max(1, Math.ceil((count || 0) / THREADS_PER_PAGE));

  main.innerHTML = `
    <div class="breadcrumb"><a href="/" data-link>Ana sayfa</a> / ${escapeHtml(cat.name)}</div>
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin:0 0 4px;font-family:var(--font-display)"><i class="fa-solid ${cat.icon || "fa-comments"}"></i> ${escapeHtml(cat.name)}</h2>
      <p style="margin:0;color:var(--muted)">${escapeHtml(cat.description || "")}</p>
    </div>
    <div id="thread-list">
      ${
        !threads?.length
          ? emptyStateHtml("fa-comment-slash", "Henüz konu yok", "Bu kategoride ilk konuyu sen aç!")
          : threads
              .map(
                (t) => `
        <a href="${threadUrl(cat.slug, t.id, t.title)}" data-link class="thread-row ${t.pinned ? "pinned" : ""}" style="text-decoration:none;color:inherit">
          <img class="avatar" src="${t.profiles?.avatar_url || defaultAvatar(t.profiles?.username || "?")}">
          <div class="thread-main">
            <div class="thread-title">
              ${t.pinned ? '<span class="pin-badge">SABİT</span>' : ""}
              ${t.locked ? '<i class="fa-solid fa-lock lock-badge"></i>' : ""}
              ${escapeHtml(t.title)}
            </div>
            <div class="thread-meta">
              <span>${escapeHtml(t.profiles?.username || "silinmiş üye")}${t.profiles?.verified ? ' <i class="fa-solid fa-circle-check" style="color:var(--accent)"></i>' : ""}</span>
              <span>${timeAgo(t.created_at)}</span>
            </div>
          </div>
          <div class="thread-stats">${t.posts?.[0]?.count ?? 0} cevap<br>${t.views} görüntülenme</div>
        </a>`
              )
              .join("")
      }
    </div>
    ${paginationHtml(page, totalPages, (p) => categoryUrl(cat.slug, p))}
  `;
  bindLinkInterception(main);

  setSchema({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    url: location.origin + categoryUrl(cat.slug),
  });
}

async function renderThread(route) {
  const { data: thread } = await supabase
    .from("threads")
    .select("*, categories(slug,name), profiles(username)")
    .eq("id", route.threadId)
    .single();
  const main = document.getElementById("main");
  if (!thread) {
    main.innerHTML = notFoundHtml();
    return;
  }
  document.title = `${thread.title} — ${SITE_NAME}`;
  supabase.from("threads").update({ views: (thread.views || 0) + 1 }).eq("id", thread.id).then(() => {});

  const page = route.page || 1;
  const from = (page - 1) * POSTS_PER_PAGE;
  const { data: posts, count } = await supabase
    .from("posts")
    .select("*, profiles(username,verified,role,avatar_url,hometown)", { count: "exact" })
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .range(from, from + POSTS_PER_PAGE - 1);
  const totalPages = Math.max(1, Math.ceil((count || 0) / POSTS_PER_PAGE));

  main.innerHTML = `
    <div class="breadcrumb">
      <a href="/" data-link>Ana sayfa</a> / <a href="${categoryUrl(thread.categories.slug)}" data-link>${escapeHtml(thread.categories.name)}</a> / ${escapeHtml(thread.title)}
    </div>
    <div class="card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0;font-family:var(--font-display);font-size:19px">
        ${thread.pinned ? '<span class="pin-badge">SABİT</span> ' : ""}${escapeHtml(thread.title)}
      </h2>
      <span style="color:var(--muted);font-family:var(--font-mono);font-size:12.5px">${thread.views} görüntülenme</span>
    </div>
    <div id="post-list"></div>
    ${paginationHtml(page, totalPages, (p) => threadUrl(thread.categories.slug, thread.id, thread.title, p))}
    <div id="reply-box" style="margin-top:20px"></div>
  `;
  bindLinkInterception(main);

  const list = main.querySelector("#post-list");
  (posts || []).forEach((p) => {
    const el = document.createElement("div");
    el.className = "post";
    el.innerHTML = `
      <div class="post-user">
        <img class="avatar" src="${p.profiles?.avatar_url || defaultAvatar(p.profiles?.username || "?")}">
        ${usernameBadge(p.profiles)}
        ${p.profiles?.hometown ? `<span style="font-size:12px;color:var(--muted)"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(p.profiles.hometown)}</span>` : ""}
      </div>
      <div class="post-body">
        <div class="post-content">${p.content}</div>
        <div class="post-footer"><span>${timeAgo(p.created_at)}</span><span>#${p.id}</span></div>
      </div>
    `;
    list.appendChild(el);
  });

  const replyBox = main.querySelector("#reply-box");
  if (currentProfile && !thread.locked) {
    replyBox.innerHTML = `
      <div class="card">
        <p class="eyebrow">Cevap yaz</p>
        <div id="reply-editor"></div>
        <button class="btn btn-primary" id="submit-reply" style="margin-top:10px">Gönder</button>
      </div>
    `;
    const editor = createEditor(replyBox.querySelector("#reply-editor"));
    replyBox.querySelector("#submit-reply").addEventListener("click", async () => {
      const content = editor.getHTML();
      if (!content || content === "<br>") return;
      const session = await getSession();
      const { error } = await supabase.from("posts").insert({ thread_id: thread.id, user_id: session.user.id, content });
      if (error) return toast("Hata: " + error.message);
      editor.clear();
      renderThread(route);
    });
  } else if (thread.locked) {
    replyBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-lock"></i>Bu konu kilitlenmiş, cevap yazılamaz.</div>`;
  } else {
    replyBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-right-to-bracket"></i>Cevap yazmak için giriş yapmalısın.</div>`;
  }

  setSchema({
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    author: { "@type": "Person", name: thread.profiles?.username || "üye" },
    datePublished: thread.created_at,
    url: location.origin + threadUrl(thread.categories.slug, thread.id, thread.title),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: count || 0,
    },
  });
}

async function renderProfile(route) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", route.username).single();
  const main = document.getElementById("main");
  if (!profile) {
    main.innerHTML = notFoundHtml();
    return;
  }
  document.title = `${profile.username} — ${SITE_NAME}`;
  const isSelf = currentProfile?.id === profile.id;
  const social = profile.social_links || {};
  const socialIcons = { twitter: "fa-brands fa-x-twitter", instagram: "fa-brands fa-instagram", facebook: "fa-brands fa-facebook", tiktok: "fa-brands fa-tiktok", youtube: "fa-brands fa-youtube" };

  main.innerHTML = `
    <div class="profile-header">
      <img class="avatar" src="${profile.avatar_url || defaultAvatar(profile.username)}">
      <div style="flex:1">
        <div class="profile-name">${escapeHtml(profile.username)} ${profile.verified ? '<span class="verified-badge"><i class="fa-solid fa-check"></i></span>' : ""} ${
    profile.role !== "user" ? `<span class="role-badge ${profile.role}">${profile.role === "admin" ? "Admin" : "Mod"}</span>` : ""
  }</div>
        <div class="profile-meta">
          ${profile.hometown ? `<span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(profile.hometown)}</span>` : ""}
          <span><i class="fa-regular fa-calendar"></i> ${new Date(profile.created_at).toLocaleDateString("tr-TR")} tarihinde katıldı</span>
        </div>
        ${profile.bio ? `<p style="margin-top:10px">${escapeHtml(profile.bio)}</p>` : ""}
        <div class="social-links">
          ${Object.entries(social)
            .filter(([, v]) => v)
            .map(([k, v]) => `<a href="${escapeHtml(v)}" target="_blank" rel="noopener"><i class="${socialIcons[k] || "fa-solid fa-link"}"></i></a>`)
            .join("")}
        </div>
      </div>
      ${isSelf ? `<button class="btn btn-outline" id="edit-profile"><i class="fa-solid fa-pen"></i> Profili düzenle</button>` : ""}
    </div>
    <p class="eyebrow" style="margin-top:20px">Son konular</p>
    <div id="profile-threads"></div>
  `;

  const { data: threads } = await supabase
    .from("threads")
    .select("*, categories(slug,name)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(15);
  const list = main.querySelector("#profile-threads");
  list.innerHTML = !threads?.length
    ? emptyStateHtml("fa-inbox", "Henüz konu yok", "")
    : threads
        .map(
          (t) => `<a href="${threadUrl(t.categories.slug, t.id, t.title)}" data-link class="thread-row" style="text-decoration:none;color:inherit">
      <div class="thread-main"><div class="thread-title">${escapeHtml(t.title)}</div><div class="thread-meta">${escapeHtml(t.categories.name)} · ${timeAgo(t.created_at)}</div></div>
    </a>`
        )
        .join("");
  bindLinkInterception(main);

  main.querySelector("#edit-profile")?.addEventListener("click", () => openEditProfileModal(profile));

  setSchema({
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: profile.created_at,
    mainEntity: { "@type": "Person", name: profile.username },
  });
}

function openEditProfileModal(profile) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="position:relative">
      <button class="btn btn-ghost btn-sm modal-close"><i class="fa-solid fa-xmark"></i></button>
      <h2>Profili düzenle</h2>
      <form id="edit-profile-form">
        <div class="form-group"><label>Avatar URL</label><input name="avatar_url" value="${profile.avatar_url || ""}"></div>
        <div class="form-group"><label>Memleket</label><input name="hometown" value="${profile.hometown || ""}"></div>
        <div class="form-group"><label>Hakkında</label><textarea name="bio" rows="3">${profile.bio || ""}</textarea></div>
        <div class="form-group"><label>X (Twitter)</label><input name="twitter" value="${profile.social_links?.twitter || ""}"></div>
        <div class="form-group"><label>Instagram</label><input name="instagram" value="${profile.social_links?.instagram || ""}"></div>
        <div class="form-group"><label>TikTok</label><input name="tiktok" value="${profile.social_links?.tiktok || ""}"></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Kaydet</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#edit-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await supabase
      .from("profiles")
      .update({
        avatar_url: fd.get("avatar_url"),
        hometown: fd.get("hometown"),
        bio: fd.get("bio"),
        social_links: { twitter: fd.get("twitter"), instagram: fd.get("instagram"), tiktok: fd.get("tiktok") },
      })
      .eq("id", profile.id);
    overlay.remove();
    toast("Profil güncellendi.");
    renderRoute();
  });
}

async function renderForgotReset() {
  const main = document.getElementById("main");
  main.innerHTML = `
    <div class="card" style="max-width:400px;margin:40px auto">
      <h2 style="font-family:var(--font-display)">Yeni şifre belirle</h2>
      <form id="reset-form">
        <div class="form-group"><label>Yeni şifre</label><input name="password" type="password" minlength="6" required></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Şifreyi güncelle</button>
        <div class="form-error" id="reset-error"></div>
      </form>
    </div>
  `;
  main.querySelector("#reset-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await updatePassword(new FormData(e.target).get("password"));
      toast("Şifre güncellendi. Giriş yapabilirsin.");
      navigate("/");
    } catch (err) {
      main.querySelector("#reset-error").textContent = err.message;
    }
  });
}

function paginationHtml(current, total, urlFor) {
  if (total <= 1) return "";
  let html = '<div class="pagination">';
  for (let i = 1; i <= total; i++) {
    html += i === current ? `<span class="current">${i}</span>` : `<a href="${urlFor(i)}" data-link>${i}</a>`;
  }
  return html + "</div>";
}
function emptyStateHtml(icon, title, sub) {
  return `<div class="empty-state"><i class="fa-solid ${icon}"></i><div style="font-weight:600;color:var(--ink)">${title}</div><div>${sub}</div></div>`;
}
function notFoundHtml() {
  return emptyStateHtml("fa-triangle-exclamation", "Sayfa bulunamadı", "Aradığın içerik taşınmış veya silinmiş olabilir.");
}

// ---------- Yönlendirme ----------
async function renderRoute() {
  const route = parseRoute();
  if (route.name === "home") return renderHome();
  if (route.name === "category") return renderCategory(route);
  if (route.name === "thread") return renderThread(route);
  if (route.name === "profile") return renderProfile(route);
  if (route.name === "forgot") return renderForgotReset();
  document.getElementById("main").innerHTML = notFoundHtml();
}

window.addEventListener("meydan:navigate", async () => {
  await renderShell();
  renderRoute();
});

(async function init() {
  mountAdminPanel();
  if (new URLSearchParams(location.search).get("reset") === "1") {
    await renderShell();
    renderForgotReset();
    return;
  }
  await renderShell();
  renderRoute();
})();
