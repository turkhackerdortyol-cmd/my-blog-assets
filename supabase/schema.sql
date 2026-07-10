-- =========================================================
-- MEYDAN FORUM — Supabase şeması
-- Bunu Supabase Dashboard > SQL Editor içine yapıştırıp çalıştırın.
-- =========================================================

-- ---------- PROFİLLER ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  avatar_url text,
  hometown text,
  bio text,
  social_links jsonb default '{}'::jsonb, -- { "twitter": "...", "instagram": "..." }
  role text not null default 'user' check (role in ('user','mod','admin')),
  verified boolean not null default true, -- otomatik mavi tik
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- KATEGORİLER ----------
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null,
  description text,
  icon text default 'fa-comments', -- font-awesome sınıf adı
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- KONULAR ----------
create table if not exists public.threads (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  pinned boolean not null default false,
  locked boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_threads_category on public.threads(category_id);

-- ---------- MESAJLAR (cevaplar) ----------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null, -- editörden gelen sanitize edilmiş HTML
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_posts_thread on public.posts(thread_id);

-- ---------- SİTE AYARLARI (tekil satır) ----------
create table if not exists public.site_settings (
  id int primary key default 1,
  site_name text not null default 'Meydan',
  site_description text not null default 'Konuş, paylaş, tanış.',
  allow_registration boolean not null default true,
  check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- =========================================================
-- YARDIMCI FONKSİYONLAR
-- =========================================================

-- Kullanıcı adına göre e-posta bulma (giriş formunda kullanıcı adı/e-posta kabul etmek için)
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where username = p_username limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- Rol kontrol yardımcıları
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_mod_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('mod','admin'));
$$;

create or replace function public.is_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

-- Yeni kullanıcı kayıt olduğunda otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- RLS (Row Level Security)
-- =========================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.site_settings enable row level security;

-- PROFİLLER: herkes okuyabilir, kullanıcı kendi profilini günceller, admin her şeyi yönetir
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self_or_admin" on public.profiles for update
  using (auth.uid() = id or public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete using (public.is_admin());

-- Üyenin kendi rolünü/ban durumunu/tik durumunu değiştirmesini engelle (sadece admin değiştirebilir)
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.banned := old.banned;
    new.verified := old.verified;
    new.username := old.username; -- kullanıcı adı değişimi ayrı bir akışla yönetilir
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- KATEGORİLER: herkes okur, sadece admin yazar
create policy "categories_select_all" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for insert with check (public.is_admin());
create policy "categories_admin_update" on public.categories for update using (public.is_admin());
create policy "categories_admin_delete" on public.categories for delete using (public.is_admin());

-- KONULAR: herkes okur, giriş yapmış & banlı olmayan üye açar, sahibi/mod/admin günceller-siler
create policy "threads_select_all" on public.threads for select using (true);
create policy "threads_insert_auth" on public.threads for insert
  with check (auth.uid() = user_id and not public.is_banned());
create policy "threads_update_owner_or_staff" on public.threads for update
  using (auth.uid() = user_id or public.is_mod_or_admin());
create policy "threads_delete_owner_or_staff" on public.threads for delete
  using (auth.uid() = user_id or public.is_mod_or_admin());

-- MESAJLAR: herkes okur, giriş yapmış & banlı olmayan üye yazar, sahibi/mod/admin günceller-siler
create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_auth" on public.posts for insert
  with check (auth.uid() = user_id and not public.is_banned());
create policy "posts_update_owner_or_staff" on public.posts for update
  using (auth.uid() = user_id or public.is_mod_or_admin());
create policy "posts_delete_owner_or_staff" on public.posts for delete
  using (auth.uid() = user_id or public.is_mod_or_admin());

-- SİTE AYARLARI: herkes okur, sadece admin günceller
create policy "settings_select_all" on public.site_settings for select using (true);
create policy "settings_admin_update" on public.site_settings for update using (public.is_admin());

-- =========================================================
-- ÖRNEK VERİ
-- =========================================================
insert into public.categories (slug, name, description, icon, sort_order) values
  ('genel', 'Genel', 'Genel sohbet ve gündem', 'fa-comments', 1),
  ('teknoloji', 'Teknoloji', 'Yazılım, donanım, oyun', 'fa-microchip', 2),
  ('yasam', 'Yaşam', 'Günlük hayat, sağlık, kültür', 'fa-leaf', 3)
on conflict (slug) do nothing;

-- =========================================================
-- NOT: İlk admin'i atamak için, kayıt olduktan sonra SQL Editor'de:
-- update public.profiles set role = 'admin' where username = 'kullanici_adiniz';
-- =========================================================
