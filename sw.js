/* Dulza · service worker
   Guarda la app en el dispositivo para que abra al instante y funcione sin internet.
   IMPORTANTE: cada vez que cambies cualquier archivo y lo vuelvas a publicar, sube el número de VERSION
   para que los dispositivos descarguen la actualización. */
const VERSION = 'dulza-v1.16.0';
const FONT_CACHE = 'dulza-fonts';
const GPT = 'assets/brand/gpt/';
const pad = (n) => String(n).padStart(2, '0');

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/theme.css',
  'css/base.css',
  'css/components.css',
  'css/app.css',
  'js/core.js',
  'js/store.js',
  'js/sync.js',
  'js/cloud.js',
  'js/theme.js',
  'js/art.js',
  'js/character.js',
  'js/brand.js',
  'js/ui.js',
  'js/sound.js',
  'js/pickers.js',
  'js/demo.js',
  'js/invoice.js',
  'js/forms.js',
  'js/entities.js',
  'js/views/inicio.js',
  'js/views/ventas.js',
  'js/views/cobros.js',
  'js/views/compras.js',
  'js/views/clientes.js',
  'js/views/productos.js',
  'js/views/proveedores.js',
  'js/views/reportes.js',
  'js/views/ajustes.js',
  'js/auth.js',
  'js/consulta.js',
  'js/guide.js',
  'js/onboarding.js',
  'js/app.js',
  'assets/favicon-64.png',
  // personaje, logos, 16 expresiones, 42 íconos de postres y stickers (GPT)
  GPT + 'v3/personaje.png',
  GPT + 'v3/busto.png',
  GPT + 'v3/isotipo.png',
  GPT + 'v3/logos/logo-personaje.png',
  GPT + 'v3/logos/logo-nombre.png',
  ...Array.from({ length: 16 }, (_, i) => `${GPT}v3/expresiones/expresion-${pad(i + 1)}.png`),
  ...Array.from({ length: 52 }, (_, i) => `${GPT}v3/postres/postre-${pad(i + 1)}.png`),
  // íconos dulces de la interfaz
  ...Array.from({ length: 10 }, (_, i) => `${GPT}v3/iconos/ui-${pad(i + 1)}.png`),
  ...Array.from({ length: 10 }, (_, i) => `${GPT}v3/iconos/tienda-${pad(i + 1)}.png`),
  ...['02', '04', '05', '06', '07', '09'].map((n) => `${GPT}v3/iconos/deco-${n}.png`),
  GPT + 'v2/sticker-pastel-b.png',
  GPT + 'v2/sticker-helado-b.png',
  GPT + 'v2/sticker-flan-b.png',
  GPT + 'v2/sticker-postres-frios-b.png',
  'assets/favicon-32.png',
  'assets/apple-touch-icon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
];

// Al instalar se pide cada archivo saltándose la caché HTTP (GitHub Pages guarda 10 minutos): así una versión nueva
// nunca se queda con archivos viejos mezclados.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' })).then((res) => {
            if (!res.ok) throw new Error(`${res.status} ${url}`);
            return cache.put(url, res);
          })
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dulza-') && k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* La app avisa «Hay una versión nueva» y, al tocar Actualizar, pide activar esta versión */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Tipografías de la marca (Google Fonts) y SDK de Firebase (versión fija en la URL): se guardan la primera vez
  // para que funcionen sin internet
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  // version.json siempre sale a internet: es lo que le dice a la app que hay una versión nueva
  if (url.pathname.endsWith('/version.json')) return;

  // Abrir la app (cualquier ruta): siempre el index guardado
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html', { ignoreSearch: true }).then((hit) => hit || fetch(req))
    );
    return;
  }

  // Resto: primero lo guardado; si falta, red y se guarda para la próxima
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
