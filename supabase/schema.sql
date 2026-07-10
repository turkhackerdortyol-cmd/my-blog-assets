-- ============================================================
-- MiFRM Forum - Supabase / PostgreSQL Şeması
-- Supabase Dashboard > SQL Editor içine yapıştırıp çalıştırın.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- ÜYELER ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      varchar(32) unique not null,
  email         varchar(255) unique not null,
  password_hash text not null,
  role          varchar(16) not null default 'member', -- member | mod | admin
  avatar_url    text,
  bio           text,
  location      varchar(120),
  social_twitter   text,
  social_instagram text,
  social_youtube   text,
  social_facebook  text,
  social_website   text,
  is_banned     boolean not null default false,
  ban_reason    text,
  post_count    integer not null default 0,
  thread_count  integer not null default 0,
  likes_received integer not null default 0,
  reset_token    text,
  reset_token_expires timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- KATEGORİLER ----------
create table if not exists categories (
  id          serial primary key,
  name        varchar(80) not null,
  slug        varchar(80) unique not null,
  description varchar(255),
  icon        varchar(40) default 'fa-comments', -- font-awesome class (fa-solid ...)
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- KONULAR ----------
create table if not exists threads (
  id           serial primary key,
  category_id  integer not null references categories(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  title        varchar(180) not null,
  slug         varchar(200) not null,
  body_html    text not null,
  is_pinned    boolean not null default false,
  is_locked    boolean not null default false,
  view_count   integer not null default 0,
  reply_count  integer not null default 0,
  like_count   integer not null default 0,
  last_reply_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_threads_category on threads(category_id);
create index if not exists idx_threads_slug on threads(id, slug);

-- ---------- CEVAPLAR / MESAJLAR ----------
create table if not exists posts (
  id          serial primary key,
  thread_id   integer not null references threads(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  body_html   text not null,
  like_count  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_posts_thread on posts(thread_id);

-- ---------- BEĞENİLER (thread veya post) ----------
create table if not exists likes (
  id         serial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  thread_id  integer references threads(id) on delete cascade,
  post_id    integer references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, thread_id, post_id)
);

-- ---------- SİTE AYARLARI (admin panel) ----------
create table if not exists site_settings (
  key   varchar(60) primary key,
  value text
);
insert into site_settings (key, value) values
  ('site_name', 'MiFRM Forum'),
  ('site_slogan', 'Hayat çok güzel'),
  ('registration_open', 'true'),
  ('footer_text', '© MiFRM Forum')
on conflict (key) do nothing;

-- ---------- Varsayılan kategori (örnek) ----------
insert into categories (name, slug, description, icon, sort_order) values
  ('Genel', 'genel', 'Genel sohbet ve konular', 'fa-comments', 1)
on conflict (slug) do nothing;

-- ---------- İlk admin kullanıcı ----------
-- Şifre "admin123" (bcrypt hash). İlk girişten sonra MUTLAKA değiştirin.
-- Hash aşağıda örnek olarak bırakılmıştır; gerçek hash'i backend ilk kurulumda
-- (npm run seed) otomatik üretir. Bu satırı manuel çalıştırmak isterseniz
-- README'deki "İlk Admin" adımını izleyin.
