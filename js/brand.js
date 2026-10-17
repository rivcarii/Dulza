/* Dulza · logotipo: letras (Titan One) + isotipo con el personaje + composiciones.
   Tipografías de la marca (de «Letras Dulza»): Titan One para nombres y títulos, Nunito para texto. */
(function () {
  'use strict';
  const D = (window.D = window.D || {});
  D.art = D.art || {};

  const FONT_DISPLAY = "'Titan One','Arial Rounded MT Bold','Trebuchet MS',sans-serif";
  const FONT_BODY = "'Nunito','Segoe UI',system-ui,sans-serif";
  const FONTS_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&amp;family=Titan+One&amp;display=swap');";

  /* Sabores de color (claro, medio, oscuro) tomados de «Letras Dulza» */
  const FLAV = {
    fresa: ['#ff9ec4', '#ff3d8b', '#c4165f'],
    mora: ['#cfa8ff', '#8f4dff', '#5a1fc2'],
    caramelo: ['#ffd08a', '#ff9a1f', '#c9620a'],
  };
  D.art.FLAVORS = FLAV;

  const W_EM = 2.989; // ancho de «Dulza» en Titan One, en em
  const ROT = [-3, 2, -2, 3, -1];
  const YOFF = [0, 0.02, -0.012, 0.016, 0];
  const uid = () => 'b' + Math.random().toString(36).slice(2, 7);

  /* ---------- Letras «Dulza» ---------- */
  /* o.flavor: 'fresa' | 'mora' | 'caramelo' · o.mono: '#hex' (un solo color) · o.reverse: letras blancas */
  D.art.wordmarkParts = function (o = {}) {
    const fs = o.fs || 160;
    const text = o.text || 'Dulza';
    const id = uid();
    const asc = 0.78 * fs;
    const W = W_EM * fs;
    const [l, b, d] = FLAV[o.flavor || 'fresa'] || FLAV.fresa;
    const mono = o.mono;
    const rev = o.reverse;
    const edge = mono || (rev ? o.edge || d : d);
    const rot = ROT.slice(0, text.length).join(' ');
    const dys = YOFF.slice(0, text.length).map((v, i) => ((v - (i ? YOFF[i - 1] : 0)) * fs).toFixed(2)).join(' ');
    const t = `x="0" y="0" font-family="${FONT_DISPLAY}" font-size="${fs}" rotate="${rot}" dy="${dys}" textLength="${W.toFixed(1)}" lengthAdjust="spacingAndGlyphs"`;
    const ext = [1, 2, 3].map((k) => `<text ${t} transform="translate(0 ${(k * 0.026 * fs).toFixed(2)})">${text}</text>`).join('');
    const fill = mono ? mono : rev ? '#ffffff' : `url(#${id}g)`;
    const rich = !mono && !rev;
    const inner = `
<defs>
  <linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${-asc}" x2="0" y2="0"><stop offset="0" stop-color="${l}"/><stop offset=".42" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>
  <linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="0" y1="${-asc}" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".72"/><stop offset=".06" stop-color="#fff" stop-opacity=".72"/><stop offset=".061" stop-color="#fff" stop-opacity=".22"/><stop offset=".34" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <pattern id="${id}s" width="${0.17 * fs}" height="${0.17 * fs}" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="${0.07 * fs}" height="${0.17 * fs}" fill="#fff" opacity=".4"/></pattern>
  <clipPath id="${id}c"><text ${t}>${text}</text></clipPath>
  <filter id="${id}f" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="${0.05 * fs}" stdDeviation="${0.035 * fs}" flood-color="#000" flood-opacity="${rev ? 0.18 : 0.28}"/></filter>
</defs>
${mono ? '' : `<g filter="url(#${id}f)" fill="${edge}" stroke="${edge}" stroke-width="${0.1 * fs}" stroke-linejoin="round">${ext}<text ${t}>${text}</text></g>`}
<text ${t} fill="${fill}">${text}</text>
${rich ? `<g clip-path="url(#${id}c)"><rect x="-10" y="${-asc - 8}" width="${W + 20}" height="${asc + 14}" fill="url(#${id}s)"/><rect x="-10" y="${-asc - 8}" width="${W + 20}" height="${asc + 14}" fill="url(#${id}h)"/></g>` : ''}`;
    const vb = { x: -0.08 * fs, y: -(0.78 + 0.1) * fs, w: W + 0.16 * fs, h: 1.07 * fs };
    return { inner, vb, W, fs, asc };
  };

  D.art.wordmark = function (o = {}) {
    const p = D.art.wordmarkParts(o);
    const size = o.size ? `width="${o.size}"` : '';
    return `<svg class="wordmark ${o.cls || ''}" viewBox="${p.vb.x.toFixed(1)} ${p.vb.y.toFixed(1)} ${p.vb.w.toFixed(1)} ${p.vb.h.toFixed(1)}" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dulza">${o.importFonts ? `<style>${FONTS_IMPORT}</style>` : ''}${p.inner}</svg>`;
  };

  /* ---------- Isotipo: el personaje dentro de un mosaico ---------- */
  /* o.shape: 'tile' | 'circle' | 'bleed' (sin esquinas, para el ícono de la app) · o.scale: reduce el dibujo (zona segura) */
  D.art.isotipo = function (o = {}) {
    const id = uid();
    const brand = o.brand || (D.data && D.data.settings && D.data.settings.brand) || '#ff3d8b';
    const mix = D.color ? D.color.mix : (a) => a;
    const top = mix(brand, '#ffffff', 0.3);
    const bot = mix(brand, '#000000', 0.18);
    const shape = o.shape || 'tile';
    const S = 512;
    const sc = o.scale || 1;
    const clip = shape === 'circle' ? `<circle cx="256" cy="256" r="256"/>` : `<rect width="512" height="512" rx="${shape === 'bleed' ? 0 : 118}"/>`;
    const char = D.art.character({ raw: true, view: 'bust', mood: o.mood || 'happy', badge: false, wordmark: false, brand });
    const cw = 490 * sc, ch = 612 * sc;
    const cx = (S - cw) / 2, cy = -10 * sc + (S - S * sc) * 0.3;
    const sprinkles = [[70, 120, -30, '#fff'], [440, 96, 28, '#ffe08a'], [446, 250, -12, '#cfa8ff'], [58, 300, 20, '#ffe08a'], [96, 40, 50, '#cfa8ff']]
      .map(([x, y, r, c]) => `<rect x="${x}" y="${y}" width="30" height="11" rx="5.5" fill="${c}" opacity=".75" transform="rotate(${r} ${x + 15} ${y + 5})"/>`)
      .join('');
    const size = o.size ? `width="${o.size}" height="${o.size}"` : '';
    return `<svg class="isotipo ${o.cls || ''}" viewBox="0 0 ${S} ${S}" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dulza">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient><clipPath id="${id}c">${clip}</clipPath></defs>
<g clip-path="url(#${id}c)">
<rect width="512" height="512" fill="url(#${id}g)"/>
<circle cx="256" cy="330" r="236" fill="#fff" opacity=".13"/>
${sprinkles}
<svg x="${cx}" y="${cy}" width="${cw}" height="${ch}" viewBox="${D.art.CHAR_VIEWS.bust}">${char}</svg>
</g></svg>`;
  };

  /* ---------- Composiciones ---------- */
  /* Vertical: personaje + letras + lema */
  D.art.logoVertical = function (o = {}) {
    const wm = D.art.wordmarkParts({ fs: 150, flavor: o.flavor, mono: o.mono, reverse: o.reverse, edge: o.edge });
    const char = D.art.character({ raw: true, view: 'bust', mood: o.mood || 'happy', badge: false, wordmark: false, brand: o.brand });
    const tag = o.tagline === false ? '' : `<text x="450" y="906" text-anchor="middle" font-family="${FONT_BODY}" font-weight="800" font-size="34" fill="${o.ink || '#3a1230'}" letter-spacing="1.5">POSTRES HECHOS CON AMOR</text>`;
    const wmW = 640;
    const sc = wmW / wm.vb.w;
    const size = o.size ? `width="${o.size}"` : '';
    return `<svg class="logo logo--v ${o.cls || ''}" viewBox="0 0 900 940" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dulza · Postres hechos con amor">${o.importFonts ? `<style>${FONTS_IMPORT}</style>` : ''}
<svg x="150" y="0" width="600" height="750" viewBox="${D.art.CHAR_VIEWS.bust}">${char}</svg>
<g transform="translate(${450 - (wm.vb.w * sc) / 2 - wm.vb.x * sc} ${612 - wm.vb.y * sc}) scale(${sc})">${wm.inner}</g>
${tag}</svg>`;
  };

  /* Horizontal: isotipo + letras + lema */
  D.art.logoHorizontal = function (o = {}) {
    const wm = D.art.wordmarkParts({ fs: 150, flavor: o.flavor, mono: o.mono, reverse: o.reverse, edge: o.edge });
    const iso = D.art.isotipo({ brand: o.brand, shape: 'tile', mood: o.mood });
    const sc = 610 / wm.vb.w;
    const size = o.size ? `width="${o.size}"` : '';
    const tag = o.tagline === false ? '' : `<text x="296" y="250" font-family="${FONT_BODY}" font-weight="800" font-size="27" fill="${o.ink || '#3a1230'}" letter-spacing="1.2">POSTRES HECHOS CON AMOR</text>`;
    return `<svg class="logo logo--h ${o.cls || ''}" viewBox="0 0 940 268" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dulza · Postres hechos con amor">${o.importFonts ? `<style>${FONTS_IMPORT}</style>` : ''}
<g transform="translate(10 10) scale(.4687)">${iso.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>
<g transform="translate(${292 - wm.vb.x * sc} ${6 - wm.vb.y * sc}) scale(${sc})">${wm.inner}</g>
${tag}</svg>`;
  };

  /* ---------- Personaje y logo oficiales: ilustraciones de GPT (assets/brand/gpt/) ----------
     Para reemplazar una pieza por su versión en alta resolución basta con guardar el PNG con el mismo nombre.
     El dibujo vectorial anterior queda disponible como D.art.character / D.art.isotipo. */
  const EXPR = (n) => `v3/expresiones/expresion-${String(n).padStart(2, '0')}.png`;
  D.gpt = {
    base: 'assets/brand/gpt/',
    full: 'v3/personaje.png', // cuerpo completo (guiño con cupcake)
    bust: 'v3/busto.png', // gorro, cara, cupcake y hombros
    icon: 'v3/isotipo.png', // mosaico rosa con el personaje
    logo: 'v3/logos/logo-personaje.png', // personaje + letras «Dulza»
    logoName: 'v3/logos/logo-nombre.png', // solo las letras «Dulza» con crema y corazones
    badge: 'v3/logos/logo-insignia-circulo.png', // insignia redonda
    // expresiones de la lámina de GPT (16); las de arriba se usan en la app, el resto quedan listas
    moods: {
      happy: EXPR(1),
      joy: EXPR(5),
      wink: EXPR(9),
      wow: EXPR(8),
      sleepy: EXPR(14),
      love: EXPR(15),
      think: EXPR(7),
      hello: EXPR(3),
      hug: EXPR(4),
      kiss: EXPR(6),
      yum: EXPR(10),
      bake: EXPR(11),
      sad: EXPR(12),
      angry: EXPR(13),
      cheer: EXPR(16),
    },
    // stickers por categoría de postre (pantallas vacías, bienvenida, redes)
    stickers: {
      pastel: 'v2/sticker-pastel-b.png',
      helado: 'v2/sticker-helado-b.png',
      flan: 'v2/sticker-flan-b.png',
      frios: 'v2/sticker-postres-frios-b.png',
    },
  };
  D.gpt.url = (file) => D.gpt.base + file;

  /* ---------- Íconos de postres (lámina de GPT): se guardan como «p:NN» en el campo emoji del postre ---------- */
  D.POSTRES = [
    'Torta de fresa', 'Torta de chocolate', 'Torta rosada', 'Torta de galleta', 'Cheesecake de caramelo', 'Porción red velvet', 'Torta de mora', 'Torta de frutas',
    'Porción de fresa', 'Porción de chocolate', 'Porción de frutos rojos', 'Porción de caramelo', 'Porción red velvet con fresa', 'Porción de galleta', 'Porción de chocolate crocante', 'Porción de frutas',
    'Flan', 'Brownie', 'Brownie con crema', 'Cupcake rosa', 'Cupcake de chocolate', 'Cupcake de fresa', 'Cupcake de galleta', 'Cupcake de mora',
    'Helado de fresa', 'Helado de chocolate', 'Helado rosa', 'Helado de galleta', 'Copa de helado', 'Vaso de fresas con crema', 'Vaso de crema', 'Vaso de chocolate',
    'Batido rosa', 'Paleta de chocolate', 'Paleta rosa', 'Paleta de chocolate con perlas', 'Paleta de fresa', 'Postre de frutas en vaso', 'Postre de mango', 'Postre de galleta',
    'Ensalada de frutas', 'Copa de frutas',
    'Galletas apiladas', 'Galleta con chispas', 'Galleta de corazón de chocolate', 'Sándwich de galleta', 'Galleta de colores', 'Galleta glaseada', 'Galleta de mantequilla', 'Galleta de corazón rosa', 'Galleta de chocolate glaseada', 'Galletas de chocolate',
  ];
  D.DEFAULT_GLYPH = 'p:20';
  D.isPostre = (e) => /^p:\d{2}$/.test(e || '');
  D.postreUrl = (e) => `${D.gpt.base}v3/postres/postre-${e.slice(2)}.png`;
  D.postreLabel = (e) => D.POSTRES[+e.slice(2) - 1] || 'Postre';
  // HTML del ícono de un postre: imagen si es «p:NN», emoji si es otro texto
  D.glyph = (e, cls = '') => {
    e = e || D.DEFAULT_GLYPH;
    return D.isPostre(e) ? `<img class="glyph ${cls}" src="${D.postreUrl(e)}" alt="" decoding="async" draggable="false">` : D.esc(e);
  };

  /* ---------- Íconos dulces de la interfaz (lámina de GPT): reemplazan a los íconos de trazo de estos nombres ---------- */
  const ICO = (f) => `v3/iconos/${f}.png`;
  D.CANDY = {
    home: ICO('ui-01'), users: ICO('ui-02'), search: ICO('ui-03'), cart: ICO('ui-04'), chat: ICO('ui-05'), bell: ICO('ui-06'), calendar: ICO('ui-07'), pin: ICO('ui-08'), sliders: ICO('ui-09'), more: ICO('ui-10'),
    heart: ICO('deco-02'), star: ICO('deco-04'), bow: ICO('deco-05'), crown: ICO('deco-06'), flower: ICO('deco-07'), sparkle: ICO('deco-09'),
    open: ICO('tienda-01'), closed: ICO('tienda-02'), truck: ICO('tienda-03'), gift: ICO('tienda-04'), box: ICO('tienda-05'), receipt: ICO('tienda-06'), tag: ICO('tienda-07'), wallet: ICO('tienda-08'), percent: ICO('tienda-09'), chart: ICO('tienda-10'),
    cupcake: 'v3/postres/postre-20.png',
  };
  const lineIcon = D.icon;
  D.icon = (name, cls = '') =>
    D.CANDY[name] ? `<img class="i i--candy ${cls}" src="${D.gpt.url(D.CANDY[name])}" alt="" aria-hidden="true" decoding="async" draggable="false">` : lineIcon(name, cls);

  /* ---------- Estados de ánimo: la mascota cambia de cara según lo que pasa ---------- */
  D.SALE_MOOD = { paid: 'joy', pending: 'hello', partial: 'wink', overdue: 'sad' }; // estado de la factura → expresión
  D.mood = (name, o = {}) =>
    `<img class="mood ${o.cls || ''}" src="${D.gpt.url(D.gpt.moods[name] || D.gpt.moods.happy)}" alt="" ${o.size ? `width="${o.size}" height="${o.size}"` : ''} aria-hidden="true" decoding="async" draggable="false">`;

  D.art.vectorMascot = D.art.character;
  D.art.mascotSVG = (o = {}) => {
    const view = o.view || 'bust';
    const file = view === 'full' ? D.gpt.full : o.mood && o.mood !== 'happy' && D.gpt.moods[o.mood] ? D.gpt.moods[o.mood] : D.gpt.bust;
    const name = (D.data && D.data.settings && D.data.settings.name) || 'Dulza';
    return `<img class="mascot mascot-img ${o.cls || ''}" src="${D.gpt.url(file)}" alt="Mascota de ${D.esc ? D.esc(name) : name}" ${o.size ? `width="${o.size}"` : ''} decoding="async">`;
  };
  D.art.markSVG = (o = {}) =>
    `<img class="mark mark-img ${o.cls || ''}" src="${D.gpt.url(D.gpt.icon)}" alt="${D.esc ? D.esc((D.data && D.data.settings && D.data.settings.name) || 'Dulza') : 'Dulza'}" ${o.size ? `width="${o.size}" height="${o.size}"` : ''} decoding="async">`;
})();
