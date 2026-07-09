/*
  Cloudflare Worker: /manifest.json ve /sw.js dosyalarını, Blogger sizin
  isteğinize izin vermediği için, bu Worker üzerinden blogunuzun KENDİ
  alan adından (aynı origin) servis eder. Bu, tarayıcının gerçek "Ana
  Ekrana Ekle" (beforeinstallprompt) istemini tetikleyebilmesi için
  ZORUNLUDUR — servis worker'ı yalnızca kendi origin'inden kayıt edilebilir.

  KURULUM (Cloudflare Dashboard):
  1) Workers & Pages > Create Worker > bu dosyanın tamamını yapıştır > Deploy.
  2) Worker'ın ayarlarında "Triggers" > "Add Route" ile şu iki route'u ekle
     (alanadiniz.com kısmını kendi domaininizle değiştirin):
       - alanadiniz.com/manifest.json   (Zone: alanadiniz.com)
       - alanadiniz.com/sw.js           (Zone: alanadiniz.com)
     Not: Domaininiz Cloudflare'de "Proxied" (turuncu bulut) olmalı.
  3) manifest.json içindeki "name", "short_name" ve "description" alanlarını
     kendi site adınızla güncelleyin.
  4) https://alanadiniz.com/manifest.json ve https://alanadiniz.com/sw.js
     adreslerini tarayıcıda açıp doğru içerik döndüğünü doğrulayın.
  5) Chrome DevTools > Application > Manifest ve Service Workers
     sekmelerinden kurulabilirlik kontrolünü yapın.
*/

const MANIFEST_JSON = {
  "name": "Mifrm Blogger Forum",
  "short_name": "MİFRM",
  "description": "Güncel konular, tartışmalar ve daha fazlası artık cebinizde.",
  "id": "/",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#f5f4ee",
  "theme_color": "#c15f3c",
  "lang": "tr",
  "dir": "ltr",
  "icons": [
    {
      "src": "https://turkhackerdortyol-cmd.github.io/my-blog-assets/1000589759-photoaidcom-cropped.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "https://turkhackerdortyol-cmd.github.io/my-blog-assets/1000589759-photoaidcom-cropped.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "https://turkhackerdortyol-cmd.github.io/my-blog-assets/1000589759-photoaidcom-cropped.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
};

const SW_JS = `
const CACHE_NAME = 'vb-pwa-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/manifest.json') {
      return new Response(JSON.stringify(MANIFEST_JSON, null, 2), {
        headers: {
          'content-type': 'application/manifest+json; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (url.pathname === '/sw.js') {
      return new Response(SW_JS, {
        headers: {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=0, must-revalidate',
          'Service-Worker-Allowed': '/',
        },
      });
    }

    // Diğer tüm istekler normal şekilde Blogger'a (origin) geçer.
    return fetch(request);
  },
};
