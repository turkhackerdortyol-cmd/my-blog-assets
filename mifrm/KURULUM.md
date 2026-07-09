# PWA "Ana Ekrana Ekle" Kurulumu — Mifrm Tema

teyit.org'daki gibi bir kurulum akışı: önce temanın kendi renkleriyle
tasarlanmış özel banner çıkar ("... artık cebinde! / Şimdi Yükle / Başka
zaman"), "Şimdi Yükle" tıklanınca tarayıcının **gerçek, native** kurulum
penceresi açılır (Görsel 2'deki gibi).

## Neden Cloudflare Worker gerekiyor?
Chrome'un native kurulum istemini (`beforeinstallprompt`) tetikleyebilmesi için:
1. Geçerli bir `manifest.json`
2. **Aynı origin'den** (blogunuzun kendi alan adından) kayıtlı bir `service worker`
3. HTTPS

şart. Blogger, sitenize kendi domaininizin kökünden `/manifest.json` veya
`/sw.js` gibi ham dosyalar servis etmenize izin vermiyor — ve servis
worker'lar spesifikasyon gereği yalnızca kendi origin'lerinden kayıt
edilebiliyor (GitHub Pages/jsdelivr gibi başka bir origin'den asla
çalışmaz). Bu yüzden Cloudflare Worker, bu iki dosyayı sizin domaininizin
kökünden servis eden bir "köprü" görevi görüyor. Blogunuzun geri kalanı
her zamanki gibi Blogger'dan servis edilmeye devam ediyor; Worker sadece
bu iki path'e dokunuyor.

## Kurulum Adımları

### 1) Cloudflare Worker'ı yayınlayın
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**
2. `cloudflare-worker.js` dosyasının tüm içeriğini yapıştırın → **Deploy**
3. Worker'ın **Settings → Triggers → Add Route** kısmından, kendi domaininiz için
   şu iki route'u ekleyin (Zone: alanadiniz.com):
   - `alanadiniz.com/manifest.json`
   - `alanadiniz.com/sw.js`
   (Domaininizin Cloudflare'de turuncu bulut/Proxied olduğundan emin olun.)
4. `cloudflare-worker.js` içindeki `MANIFEST_JSON` alanındaki `"name"`,
   `"short_name"` ve `"description"` değerlerini kendi site bilgilerinizle
   güncelleyin (aynı değişikliği referans için `manifest.json` dosyasında da
   yapabilirsiniz).

### 2) GitHub deposunu güncelleyin (theme-vb.css / theme-vb.js)
Temanız zaten `theme-vb.css` ve `theme-vb.js` dosyalarını
`turkhackerdortyol-cmd/my-blog-assets` deposundan **@v2** etiketiyle (pinned
tag) çekiyor. Bu depoda:
1. `theme-vb.css` ve `theme-vb.js` dosyalarını, bu pakette verilen
   güncellenmiş sürümlerle değiştirin (dosyaların sonuna PWA banner
   kodu eklenmiştir, mevcut hiçbir şey silinmemiştir).
2. **Önemli:** `@v2` bir sabit (pinned) etikettir, jsdelivr onu agresif
   önbelleğe alır. Değişikliklerin yayına yansıması için ya:
   - yeni bir `v3` etiketi/release oluşturup `mifrmpro-pwa.xml` içindeki
     iki CDN linkini `@v2` yerine `@v3` yapın, **veya**
   - jsdelivr önbelleğini şu adresten temizleyin:
     `https://purge.jsdelivr.net/gh/turkhackerdortyol-cmd/my-blog-assets@v2/theme-vb.css`
     ve aynısını `theme-vb.js` için de yapın.

### 3) Blogger temasını güncelleyin
1. Blogger panelinde **Tema → Düzenle (HTML)** açın.
2. Mevcut temanın tamamını, bu pakette verilen `mifrmpro-pwa.xml` içeriğiyle
   değiştirin (yalnızca `<head>` içine PWA ile ilgili birkaç satır eklendi,
   başka hiçbir şey değişmedi).
3. Kaydedin.

### 4) Test edin
- `https://alanadiniz.com/manifest.json` ve `https://alanadiniz.com/sw.js`
  adreslerini tarayıcıda açıp doğru içerik döndüğünü kontrol edin.
- Chrome DevTools → **Application** sekmesi → **Manifest** ve
  **Service Workers** bölümlerinden kurulabilirlik hatası olup olmadığına
  bakın.
- Android Chrome'da siteyi ilk kez ziyaret ettiğinizde (yaklaşık 1.2 sn
  sonra) özel banner çıkmalı; "Şimdi Yükle" tıklandığında native kurulum
  penceresi açılmalı.
- iOS Safari'de `beforeinstallprompt` desteklenmediği için otomatik olarak
  "Paylaş simgesine dokun → Ana Ekrana Ekle" talimatlı bir banner gösterilir.

## Davranış Detayları
- Banner, kullanıcı "Başka zaman" derse **14 gün** boyunca tekrar çıkmaz
  (`localStorage: vbPwaLaterUntil`).
- Kullanıcı gerçekten yüklerse (`appinstalled` event) bir daha **hiç**
  çıkmaz (`localStorage: vbPwaDone`).
- Site zaten "standalone" modda (yani zaten yüklenmiş) açıldıysa banner
  hiç gösterilmez.
- Tüm metinler ve renkler mevcut temanızın `:root` CSS değişkenlerinden
  (`--dkbg`, `--blue`, `--w` vb.) geliyor; herhangi bir tema varyantı
  (zümrüt, gece, bordo, lacivert) seçiliyse banner otomatik olarak o
  paletle uyumlu görünür.

## Not: İkon Kalitesi
Şu an manifest'te 192×192 ve 512×512 için **aynı görsel** referans
gösteriliyor (verdiğiniz tek görsel). Chrome bunu kabul eder ve gerekirse
ölçekler, ancak en iyi sonuç için gerçekten 192×192 ve ayrı bir 512×512
piksel boyutunda iki ayrı PNG hazırlayıp `my-blog-assets` deposuna
eklemeniz ve `manifest.json` ile `cloudflare-worker.js` içindeki `src`
alanlarını buna göre güncellemeniz önerilir (maskable ikon için görselin
ortadaki %80'lik "safe zone" içinde olması gerekir).
