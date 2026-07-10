# MiFRM Forum — Node.js + Supabase Sürümü

MiFRM Blogger temasının **görünümünü birebir koruyarak** (theme-vb.css hiç değiştirilmedi)
gerçek bir üyelik sistemi, veritabanı ve admin paneli ile çalışan forum uygulaması.

## İçindekiler
- Gerçek üyelik: kullanıcı adı + e-posta + şifre ile kayıt, giriş, **e-posta doğrulaması yok**
  (kayıt olur olmaz direkt giriş yapılır), "Şifremi Unuttum" akışı (e-posta ile sıfırlama linki)
- SEO dostu URL yapısı: `/genel/12345-hayat-cok-guzel.html` (vBSEO tarzı) + `schema.org`
  `DiscussionForumPosting` JSON-LD verisi
- Sağdan açılan **Admin Paneli** (popup): kategori ekle/sil, üyelere **Moderatör/Admin** rolü
  verme, üye engelleme/silme, konu sabitleme/kilitleme/silme, genel site ayarları
- Konu açma / cevap yazma, tema ile uyumlu basit editör: **resim URL** ekleme ve
  **YouTube, Dailymotion, Instagram, TikTok, Facebook, Twitter/X** video gömme
- Üye profili: avatar, sosyal medya linkleri, memleket, açtığı konular/mesajlar, beğeni sayısı,
  **her üyede otomatik mavi onay rozeti**
- **Beğeni eklentisi** (XenForo tarzı) — konu ve mesajlarda AJAX beğeni butonu
- Tüm ikonlar Font Awesome (`fa-*`) — orijinal temadaki CDN linkleri korundu

## Kurulum

### 1) Supabase projesi oluşturun
1. https://supabase.com üzerinde ücretsiz bir proje açın.
2. Proje içinde **SQL Editor**'ü açın, bu depodaki `supabase/schema.sql` dosyasının tamamını
   yapıştırıp çalıştırın (tüm tabloları ve örnek "Genel" kategorisini oluşturur).
3. **Project Settings > API** sayfasından `Project URL` ve `service_role` anahtarını kopyalayın.

### 2) Ortam değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayın ve doldurun:

```bash
cp .env.example .env
```

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` → Supabase'den aldığınız değerler
- `JWT_SECRET` → rastgele, uzun bir metin
- `SITE_URL` → yayındaki adresiniz (geliştirme için `http://localhost:3000`)
- `SMTP_*` → "Şifremi Unuttum" e-postası göndermek için. Boş bırakırsanız sıfırlama linki
  **konsola yazdırılır** (geliştirme için yeterlidir, canlıda bir SMTP girmeniz önerilir).

### 3) İlk admin
`.env` içindeki `SEED_ADMIN_*` bilgileriyle **sunucu ilk açıldığında admin otomatik
oluşturulur** (elle komut çalıştırmanıza gerek yok — bu, terminale erişemediğiniz
telefon/Render gibi ortamlarda önemlidir). İsterseniz manuel de tetikleyebilirsiniz:
`npm run seed`.

```bash
npm install
npm start
```
Site `http://localhost:3000` adresinde açılır. `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`
ile giriş yapıp sağ üstteki menüden **Yönetim Paneli**'ni açabilirsiniz. Giriş yaptıktan sonra
profilinizden şifrenizi değiştirmenizi öneririz.

## Sadece telefonla kurulum (bilgisayarsız)

Barındırma (Supabase, Render) tamamen tarayıcıdan yapılır, sorun değil. Tek zorluk,
bu klasördeki ~40 dosyayı **klasör yapısını bozmadan** GitHub'a yüklemek — normal
GitHub web sitesindeki "Dosya Yükle" butonu telefonda alt klasörleri kaybeder. Bu yüzden
küçük bir uygulama kullanmanız gerekiyor:

### Android
1. Play Store'dan **Termux** kurun.
2. Bu zip dosyasını telefonunuza indirip **Dosyalar** uygulamasıyla bir klasöre çıkarın (unzip).
3. Termux'u açıp sırayla:
   ```bash
   pkg install git -y
   termux-setup-storage
   cd storage/downloads/mifrm-forum-app/app   # zip'i çıkardığınız yol neyse
   git init
   git branch -M main
   git add .
   git commit -m "ilk yukleme"
   ```
4. github.com'da (tarayıcıdan) yeni **boş** bir repo oluşturun (README eklemeden).
5. GitHub'da **Settings > Developer settings > Personal access tokens > Tokens (classic)**
   üzerinden bir token oluşturun (yetkisi: `repo`). Bunu şifre yerine kullanacaksınız.
6. Termux'a dönün:
   ```bash
   git remote add origin https://github.com/KULLANICIADI/REPO_ADI.git
   git push -u origin main
   ```
   Kullanıcı adı sorunca GitHub kullanıcı adınızı, şifre sorunca 5. adımdaki **token**'ı yapıştırın.

### iPhone
1. App Store'dan **Working Copy** uygulamasını kurun.
2. Zip'i **Dosyalar** uygulamasında bir klasöre çıkarın.
3. Working Copy'de GitHub hesabınızla giriş yapıp yeni bir repo oluşturun.
4. Working Copy içinden "Dosya Ekle" ile çıkardığınız `app` klasörünün içeriğini seçip
   commit edip **Push** yapın.

Kod GitHub'a yüklendikten sonraki tüm adımlar (Supabase, Render) tamamen tarayıcıdan,
dosya yükleme gerektirmeden yapılır — aşağıdaki adımları takip edin.

## GitHub'da barındırma — önemli not

Bu uygulama bir **Node.js sunucusu**dur (Express + EJS), bu yüzden **GitHub Pages'te
doğrudan çalışmaz** (Pages yalnızca statik dosya sunar). Kodu GitHub'a normal şekilde
yükleyip, aşağıdaki gibi ücretsiz katmanı olan bir servisle GitHub reponuza bağlayarak
otomatik dağıtım yapabilirsiniz:

- **Render.com** (Web Service > "Build and deploy from a Git repository") — `npm install` /
  `npm start`, ortam değişkenlerini panelden girersiniz.
- **Railway.app** — GitHub reposunu seçip deploy edersiniz, ortam değişkenlerini eklersiniz.
- **Fly.io** de benzer şekilde çalışır.

Repo'yu GitHub'a yüklemek için:
```bash
git init
git add .
git commit -m "MiFRM Forum - ilk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
git push -u origin main
```
`.env` dosyanız `.gitignore` sayesinde repoya **yüklenmez** — gizli anahtarlarınızı her
zaman barındırma servisinin "Environment Variables" panelinden girin.

## URL Yapısı
- Anasayfa: `/`
- Kategori: `/genel`
- Konu: `/genel/12345-hayat-cok-guzel.html`
- Yeni konu: `/genel/yeni-konu`
- Profil: `/uye/kullaniciadi`
- Giriş / Kayıt / Şifremi Unuttum: `/giris`, `/kayit`, `/sifremi-unuttum`

## Editörde resim/video ekleme
Editör araç çubuğundaki 🖼️ ve 🎬 butonları `[img]url[/img]` ve `[video]url[/video]`
etiketlerini otomatik ekler; sunucu bunları güvenli `<img>` / `<iframe>` HTML'ine çevirir.
Desteklenen video siteleri: YouTube, Dailymotion, Instagram, TikTok, Facebook, Twitter/X.

## Kapsam notu (v1)
Bu sürüm, istenen tüm ana özellikleri **gerçek bir backend ile** çalışır hâlde sunar:
üyelik/giriş/şifre sıfırlama, kategoriler, konu/cevap, admin paneli (kategori, rol,
engelleme, silme, sabitleme, site ayarları), beğeni eklentisi, profil, SEO URL + schema.org,
platform video gömme. Editör; sade ve güvenli bir metin+etiket editörüdür (tam WYSIWYG,
sürükle-bırak resim yükleme veya bildirim çanı gibi öğeler kapsam dışında bırakıldı —
isterseniz bir sonraki adımda bunları da ekleyebilirim).
