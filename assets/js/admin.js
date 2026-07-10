import { supabase } from "./supabaseClient.js";
import { getCurrentProfile } from "./auth.js";

let panelEl, scrimEl, activeTab = "categories";

export function mountAdminPanel() {
  scrimEl = document.createElement("div");
  scrimEl.className = "admin-overlay-scrim";
  scrimEl.style.display = "none";
  scrimEl.addEventListener("click", closeAdminPanel);
  document.body.appendChild(scrimEl);

  panelEl = document.createElement("div");
  panelEl.className = "admin-panel";
  panelEl.innerHTML = `
    <div class="admin-panel-header">
      <i class="fa-solid fa-shield-halved"></i> Yönetim Paneli
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" id="admin-close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="categories">Kategoriler</button>
      <button class="admin-tab" data-tab="members">Üyeler</button>
      <button class="admin-tab" data-tab="threads">Konular</button>
      <button class="admin-tab" data-tab="settings">Site Ayarları</button>
    </div>
    <div class="admin-tab-content" id="admin-content"></div>
  `;
  document.body.appendChild(panelEl);

  panelEl.querySelector("#admin-close").addEventListener("click", closeAdminPanel);
  panelEl.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      panelEl.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.tab;
      renderTab();
    });
  });
}

export async function openAdminPanel() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    alert("Bu alana yalnızca site yöneticileri erişebilir.");
    return;
  }
  panelEl.classList.add("open");
  scrimEl.style.display = "block";
  renderTab();
}

export function closeAdminPanel() {
  panelEl.classList.remove("open");
  scrimEl.style.display = "none";
}

async function renderTab() {
  const content = panelEl.querySelector("#admin-content");
  content.innerHTML = `<p style="color:#9aa0b3">Yükleniyor…</p>`;
  if (activeTab === "categories") return renderCategories(content);
  if (activeTab === "members") return renderMembers(content);
  if (activeTab === "threads") return renderThreads(content);
  if (activeTab === "settings") return renderSettings(content);
}

async function renderCategories(content) {
  const { data: cats } = await supabase.from("categories").select("*").order("sort_order");
  content.innerHTML = `
    <button class="btn btn-primary btn-sm" id="add-cat" style="width:100%;margin-bottom:12px;justify-content:center">
      <i class="fa-solid fa-plus"></i> Yeni kategori
    </button>
    <div id="cat-list"></div>
  `;
  const list = content.querySelector("#cat-list");
  (cats || []).forEach((c) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <i class="fa-solid ${c.icon || "fa-comments"}"></i>
      <span class="name">${c.name}</span>
      <button class="btn btn-ghost btn-sm" data-edit="${c.id}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-danger btn-sm" data-del="${c.id}"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(row);
  });

  content.querySelector("#add-cat").addEventListener("click", async () => {
    const name = prompt("Kategori adı:");
    if (!name) return;
    const slug = prompt("URL kısa adı (slug), örn: genel:", name.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    const { error } = await supabase.from("categories").insert({ name, slug, sort_order: (cats?.length || 0) + 1 });
    if (error) return alert("Hata: " + error.message);
    renderCategories(content);
  });

  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cat = cats.find((c) => c.id == btn.dataset.edit);
      const name = prompt("Kategori adı:", cat.name);
      if (!name) return;
      await supabase.from("categories").update({ name }).eq("id", cat.id);
      renderCategories(content);
    });
  });
  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Bu kategori ve içindeki tüm konular silinsin mi?")) return;
      await supabase.from("categories").delete().eq("id", btn.dataset.del);
      renderCategories(content);
    });
  });
}

async function renderMembers(content) {
  const { data: members } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  content.innerHTML = `<div id="member-list"></div>`;
  const list = content.querySelector("#member-list");
  (members || []).forEach((m) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span class="name">${m.username}${m.banned ? " 🚫" : ""}</span>
      <select data-role="${m.id}">
        <option value="user" ${m.role === "user" ? "selected" : ""}>Üye</option>
        <option value="mod" ${m.role === "mod" ? "selected" : ""}>Moderatör</option>
        <option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option>
      </select>
      <button class="btn btn-ghost btn-sm" data-ban="${m.id}" title="${m.banned ? "Engeli kaldır" : "Engelle"}">
        <i class="fa-solid ${m.banned ? "fa-lock-open" : "fa-ban"}"></i>
      </button>
      <button class="btn btn-danger btn-sm" data-del="${m.id}"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("[data-role]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await supabase.from("profiles").update({ role: sel.value }).eq("id", sel.dataset.role);
    });
  });
  list.querySelectorAll("[data-ban]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const m = members.find((x) => x.id === btn.dataset.ban);
      await supabase.from("profiles").update({ banned: !m.banned }).eq("id", m.id);
      renderMembers(content);
    });
  });
  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Bu üye kalıcı olarak silinsin mi? (Not: auth.users kaydı yalnızca Supabase Dashboard'dan tam silinebilir)")) return;
      await supabase.from("profiles").delete().eq("id", btn.dataset.del);
      renderMembers(content);
    });
  });
}

async function renderThreads(content) {
  const { data: threads } = await supabase
    .from("threads")
    .select("id,title,pinned,locked,categories(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  content.innerHTML = `<div id="thread-admin-list"></div>`;
  const list = content.querySelector("#thread-admin-list");
  (threads || []).forEach((t) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span class="name">${t.title}</span>
      <button class="btn btn-ghost btn-sm" data-pin="${t.id}" title="Sabitle/kaldır">
        <i class="fa-solid fa-thumbtack" style="color:${t.pinned ? "var(--coral)" : "inherit"}"></i>
      </button>
      <button class="btn btn-ghost btn-sm" data-lock="${t.id}" title="Kilitle/aç">
        <i class="fa-solid ${t.locked ? "fa-lock" : "fa-lock-open"}"></i>
      </button>
      <button class="btn btn-danger btn-sm" data-del="${t.id}"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const t = threads.find((x) => x.id == btn.dataset.pin);
      await supabase.from("threads").update({ pinned: !t.pinned }).eq("id", t.id);
      renderThreads(content);
    });
  });
  list.querySelectorAll("[data-lock]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const t = threads.find((x) => x.id == btn.dataset.lock);
      await supabase.from("threads").update({ locked: !t.locked }).eq("id", t.id);
      renderThreads(content);
    });
  });
  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Bu konu silinsin mi?")) return;
      await supabase.from("threads").delete().eq("id", btn.dataset.del);
      renderThreads(content);
    });
  });
}

async function renderSettings(content) {
  const { data: settings } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  content.innerHTML = `
    <div class="form-group">
      <label>Site adı</label>
      <input id="s-name" value="${settings?.site_name || ""}">
    </div>
    <div class="form-group">
      <label>Site açıklaması</label>
      <input id="s-desc" value="${settings?.site_description || ""}">
    </div>
    <div class="form-group">
      <label><input type="checkbox" id="s-reg" ${settings?.allow_registration ? "checked" : ""}> Yeni üye kaydına izin ver</label>
    </div>
    <button class="btn btn-primary" id="s-save" style="width:100%;justify-content:center">Kaydet</button>
  `;
  content.querySelector("#s-save").addEventListener("click", async () => {
    await supabase
      .from("site_settings")
      .update({
        site_name: content.querySelector("#s-name").value,
        site_description: content.querySelector("#s-desc").value,
        allow_registration: content.querySelector("#s-reg").checked,
      })
      .eq("id", 1);
    alert("Ayarlar kaydedildi.");
  });
}
