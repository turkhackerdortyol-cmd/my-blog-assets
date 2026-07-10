# Meydan Forum

Supabase (Postgres + Auth) destekli, GitHub Pages üzerinde **sunucu gerektirmeden** çalışan bir forum platformu. Bu, orijinal ve sıfırdan tasarlanmış bir temadır — yüklediğiniz `tr-main.zip` içindeki telifli MiFRM temasından bağımsızdır (bkz. aşağıdaki not).

## Özellikler
- Kullanıcı adı **veya** e-posta + şifre ile giriş, şifremi unuttum akışı (e-posta doğrulaması yok)
- vBSEO tarzı URL'ler: `/genel.html`, `/genel/12345-baslik-boyle.html`, `/uye/kullaniciadi.html`
- Sayfa başına `schema.org` (JSON-LD) yapılandırılmış veri (WebSite, CollectionPage, DiscussionForumPosting, ProfilePage)
- Yandan açılır admin paneli: kategori ekle/düzenle/sil, üyelere mod/admin yetkisi ver, üye engelle/sil, konu sabitle/kilitle, site ayarları
- Gelişmiş editör: kalın/italik/liste, URL ile resim, **YouTube, Dailymotion, Instagram, TikTok, Facebook, X (Twitter)** video gömme
- Üye profili: avatar, sosyal medya bağlantıları, memleket, konu geçmişi, otomatik mavi tik rozeti
- Tüm ikonlar Font Awesome

## Kurulum (5 adım)

### 1) Supabase projesi oluştur
[supabase.com](https://supabase.com) üzerinde ücretsiz bir proje açın.

### 2) Veritabanı şemasını çalıştır
Supabase Dashboard → **SQL Editor** → `supabase/schema.sql` dosyasının tüm içeriğini yapıştırıp **Run**'a basın.

### 3) Auth ayarları
Supabase Dashboard → **Authentication → Providers → Email**:
- "Confirm email" seçeneğini **kapatın** (e-posta doğrulaması istenmediği için).

**Authentication → URL Configuration** kısmına sitenizin adresini (`https://kullaniciadiniz.github.io` gibi) Site URL ve Redirect URLs olarak ekleyin — şifre sıfırlama bağlantısının çalışması için gereklidir.

### 4) Bağlantı bilgilerini gir
`assets/js/config.js` dosyasını açın, Supabase Dashboard → **Project Settings → API** kısmındaki bilgileri girin:

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

### 5) GitHub Pages'e yayınla
1. Bu klasörü bir GitHub deposuna yükleyin (kök dizinde `index.html` olacak şekilde).
2. Repo → **Settings → Pages** → Branch olarak `main` / `root` seçin.
3. Birkaç dakika içinde siteniz `https://kullaniciadiniz.github.io/repo-adi/` adresinde yayında olur.

### İlk admini atama
Kayıt olduktan sonra Supabase SQL Editor'de:
```sql
update public.profiles set role = 'admin' where username = 'kullanici_adiniz';
```

## Dosya yapısı
```
index.html              → tek sayfa uygulama kabuğu
404.html                → GitHub Pages için SPA yönlendirme hilesi (güzel URL'ler için)
assets/css/style.css     → tüm tasarım (orijinal, sıfırdan)
assets/js/config.js      → Supabase bağlantı bilgileri (BURAYI DOLDURUN)
assets/js/supabaseClient.js
assets/js/router.js      → URL ayrıştırma / sayfa geçişleri
assets/js/auth.js        → kayıt, giriş, şifremi unuttum
assets/js/editor.js       → zengin metin editörü + video gömme
assets/js/admin.js       → yandan açılır yönetim paneli
assets/js/app.js         → ana uygulama mantığı
supabase/schema.sql      → veritabanı şeması + güvenlik kuralları (RLS)
```

## Güvenlik notu
`editor.js` içindeki HTML temizleme (sanitize) fonksiyonu temel seviyededir (script/style ve `on*` olaylarını siler). Üretime almadan önce, sunucu tarafında (bir Supabase Edge Function içinde) **DOMPurify** gibi güçlü bir kütüphane ile içerik tekrar doğrulanması şiddetle tavsiye edilir.

## Telif hakkı notu
Yüklediğiniz `tr-main.zip` dosyası, MiFRM Blogger Forum temasına (Hamdi Uludağ, ticari lisans $200.000, "All Rights Reserved") ait dosyaları içeriyordu. O temanın lisansı; kopyalanmasını, dağıtılmasını ve değiştirilmesini yazılı izin olmadan yasaklıyor. Bu yüzden bu proje, o temanın kodunu/tasarımını temel almadan, istediğiniz özellik listesine göre **sıfırdan** oluşturulmuştur.
