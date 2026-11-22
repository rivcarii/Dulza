/* Dulza · Publicidad: piezas listas para estados de WhatsApp, historias de Instagram y Facebook, publicaciones y volantes.
   Las piezas se DIBUJAN EN LA APP (canvas) sobre ilustraciones sin texto (assets/publicidad/base/):
   el nombre, los precios del catálogo y el WhatsApp de Ajustes salen siempre al día. Si cambias un precio en
   Postres, la próxima vez que abras Publicidad las imágenes ya traen el precio nuevo.
   «Compartir» abre el menú del teléfono con el archivo (WhatsApp → Mi estado, Instagram → Tu historia, Facebook…);
   donde no se puede compartir archivos (computadora) se descarga. */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const BASE = 'assets/publicidad/';
  const IL = (n) => `${BASE}base/${n}.jpg`;

  /* ==========================================================================
     Datos: postres de las ilustraciones y piezas
     ========================================================================== */
  // Cada ilustración muestra un postre concreto; se enlaza con el catálogo por id (y si no, por nombre).
  const POSTRES = {
    torta: { ids: ['mvd4dk6ghaihm'], re: /chocolate/i, lines: ['Torta de', 'chocolate'], short: 'Torta de chocolate', frase: '¡Antójate de chocolate!', bg: '#FDE4C9', ink: '#5A2E1B', sombra: '#E2A24C' },
    flan: { ids: ['mvd4eiqtpry6w'], re: /flan/i, lines: ['Flan de', 'caramelo'], short: 'Flan', frase: '¡Suavecito y con caramelo!', bg: '#FEEFC4', ink: '#8A4A10', sombra: '#E2A24C' },
    napolitano: { ids: ['mvd4ljtu5my38'], re: /napolitano/i, lines: ['Napolitano'], short: 'Napolitano', frase: '¡Fresco, cremoso y con fresas!', bg: '#FDD9E5', ink: '#C4165F', sombra: '#FF8FBB' },
  };
  const ORDEN = ['torta', 'flan', 'napolitano'];
  const SLUG = { torta: 'torta-chocolate', flan: 'flan', napolitano: 'napolitano' };

  const FMT = {
    historia: { label: 'Historia y estado', w: 1080, h: 1920, tip: 'WhatsApp → «Mi estado» · Instagram y Facebook → «Tu historia»' },
    post: { label: 'Publicación', w: 1080, h: 1080, tip: 'Instagram y Facebook → publicación en el muro · WhatsApp → chats o grupos' },
    volante: { label: 'Volante', w: 1240, h: 1754, tip: 'Para imprimir o mandar por chat' },
  };

  const PIEZAS = [];
  ORDEN.forEach((k) => {
    const P = POSTRES[k];
    PIEZAS.push({ id: `historia-${SLUG[k]}`, fmt: 'historia', kind: 'postre', k, title: P.short });
    PIEZAS.push({ id: `post-${SLUG[k]}`, fmt: 'post', kind: 'postre', k, title: P.short });
  });
  PIEZAS.push({ id: 'historia-menu', fmt: 'historia', kind: 'menuV', title: 'Nuestro menú' });
  PIEZAS.push({ id: 'post-menu', fmt: 'post', kind: 'menuC', title: 'Nuestro menú' });
  PIEZAS.push({ id: 'volante-menu', fmt: 'volante', kind: 'volante', title: 'Volante del menú' });
  /* ---------- Festividades: cada una con su propia colección de plantillas ----------
     Ilustraciones en base/<id>-<postre>-v|c.jpg (cada postre) y base/<id>-v|c.jpg (general). Fondo oscuro → letras
     blancas; fondo claro (Pascua) → letras de color. */
  const esCO = () => !!(D.season && /colombia/i.test(D.season.pais() || ''));
  const FEST = {
    navidad: { emoji: '🎄', name: 'Navidad', saludo: '¡Feliz Navidad!', frase: '¡Endulza tu Navidad!', general: 'Encarga tus postres navideños', ink: '#fff', sombra: '#7A0A30', acento: '#FFD66B', sub: '#FFE6F1' },
    amor: {
      emoji: '💘', get name() { return esCO() ? 'Amor y Amistad' : 'San Valentín'; }, get saludo() { return esCO() ? '¡Feliz Amor y Amistad!' : '¡Feliz San Valentín!'; },
      frase: '¡Endulza a quien quieres!', general: 'Regala algo dulce', ink: '#fff', sombra: '#7A0A2C', acento: '#FFD1E3', sub: '#FFE6F1',
    },
    madre: { emoji: '💐', name: 'Día de la Madre', saludo: '¡Feliz Día de la Madre!', frase: '¡Para la reina de la casa!', general: 'Consiente a mamá con algo dulce', ink: '#fff', sombra: '#4A1F70', acento: '#FFD1F0', sub: '#F3E6FF' },
    padre: { emoji: '👔', name: 'Día del Padre', saludo: '¡Feliz Día del Padre!', frase: '¡Para el mejor papá!', general: 'Consiente a papá con algo dulce', ink: '#fff', sombra: '#0E2350', acento: '#FFD66B', sub: '#DCEBFF' },
    pascua: { emoji: '🐣', name: 'Pascua', saludo: '¡Felices Pascuas!', frase: '¡Dulces Pascuas!', general: 'Postres para compartir en Pascua', ink: '#6B3FA0', sombra: '#F5C542', acento: '#C4165F', sub: '#5A2E1B' },
    halloween: { emoji: '🎃', name: 'Halloween', saludo: '¡Feliz Halloween!', frase: '¡Dulce o truco!', general: 'Postres de miedo… ¡de ricos!', ink: '#fff', sombra: '#24093F', acento: '#FFB347', sub: '#F1E3FF' },
  };
  // Festividades cuyas ilustraciones ya están en la app (bg: degradado de fondo para las piezas automáticas)
  const FEST_LISTAS = ['navidad', 'amor', 'madre', 'padre', 'pascua', 'halloween'];
  const FEST_BG = {
    navidad: ['#90043A', '#C81056'], amor: ['#9E0E3C', '#D6336C'], madre: ['#5E3291', '#A57BD8'],
    padre: ['#0E2350', '#2A4F9E'], pascua: ['#FFF6D2', '#FFE39A'], halloween: ['#1E0736', '#5B2A8C'],
  };
  FEST_LISTAS.forEach((t) => {
    const F = FEST[t];
    ORDEN.forEach((k) => {
      PIEZAS.push({ id: `historia-${t}-${SLUG[k]}`, fmt: 'historia', kind: 'postre', k, t, get title() { return `${POSTRES[k].short} · ${FEST[t].name}`; } });
      PIEZAS.push({ id: `post-${t}-${SLUG[k]}`, fmt: 'post', kind: 'postre', k, t, get title() { return `${POSTRES[k].short} · ${FEST[t].name}`; } });
    });
    PIEZAS.push({ id: `historia-${t}`, fmt: 'historia', kind: 'fest', t, get title() { return FEST[t].saludo; } });
    PIEZAS.push({ id: `post-${t}`, fmt: 'post', kind: 'fest', t, get title() { return FEST[t].saludo; } });
  });

  /* ---------- Postres nuevos del catálogo: piezas automáticas ----------
     Todo postre activo con precio que no tenga ilustración propia recibe su historia y su post (todo el año y en cada
     festividad), armados con su ícono del catálogo y Dulce al lado. Si luego se le dibuja una ilustración, se agrega a POSTRES. */
  const nuevos = () => (D.data.products || []).filter((p) => sells(p) && !ORDEN.some((k) => prod(k) === p)).sort((a, b) => a.name.localeCompare(b.name));
  function piezas() {
    const out = PIEZAS.slice();
    nuevos().forEach((p) => {
      ['', ...FEST_LISTAS].forEach((t) => {
        const pre = t ? `${t}-` : '';
        const title = () => (t ? `${p.name} · ${FEST[t].name}` : p.name);
        out.push({ id: `historia-${pre}p-${p.id}`, fmt: 'historia', kind: 'gen', pid: p.id, t, get title() { return title(); } });
        out.push({ id: `post-${pre}p-${p.id}`, fmt: 'post', kind: 'gen', pid: p.id, t, get title() { return title(); } });
      });
    });
    return out;
  }
  Object.defineProperty(D, 'PUBLICIDAD', { get: piezas, configurable: true });

  /* ---------- Catálogo ---------- */
  function prod(k) {
    const P = POSTRES[k];
    const list = D.data.products || [];
    return list.find((p) => P.ids.includes(p.id)) || list.find((p) => P.re.test(p.name || '')) || null;
  }
  function sells(p) {
    return !!p && p.active !== false && p.price > 0;
  }
  const preciosDe = (p) => (sells(p) ? { contado: D.money(p.price), plazo: D.product.hasTwo(p) ? D.money(p.priceCredit) : '' } : null);
  const precios = (k) => preciosDe(prod(k));
  const byId = (id) => (D.data.products || []).find((p) => p.id === id);
  // Todos los postres a la venta, primero los que tienen ilustración: [{ name, pr, k? }]
  const menu = () => [
    ...ORDEN.map((k) => ({ k, name: POSTRES[k].short, pr: precios(k) })).filter((x) => x.pr),
    ...nuevos().map((p) => ({ name: p.name, pr: preciosDe(p), p })),
  ];
  const phone = () => String(D.data.settings.phone || '').trim();
  const available = (pz) => (pz.kind === 'postre' ? !!precios(pz.k) : pz.kind === 'gen' ? sells(byId(pz.pid)) : menu().length > 0);
  // Firma de lo que cambia el dibujo: si cambian postres, precios, nombre o el WhatsApp, se vuelve a dibujar
  const firma = () => JSON.stringify([menu().map((x) => [x.name, x.pr, x.p && x.p.emoji]), phone(), D.data.settings.name]);

  /* ==========================================================================
     Dibujo (canvas)
     ========================================================================== */
  const imgs = new Map();
  function img(url) {
    if (!imgs.has(url)) {
      imgs.set(
        url,
        new Promise((res, rej) => {
          const i = new Image();
          i.decoding = 'async';
          i.onload = () => res(i);
          i.onerror = () => {
            imgs.delete(url);
            rej(new Error('No se pudo cargar ' + url));
          };
          i.src = url;
        })
      );
    }
    return imgs.get(url);
  }
  let fontsReady = null;
  const fonts = () =>
    (fontsReady =
      fontsReady ||
      (document.fonts
        ? Promise.all(['80px "Titan One"', '800 40px Nunito', '700 40px Nunito'].map((f) => document.fonts.load(f).catch(() => null))).then(() => true)
        : Promise.resolve(true)));

  const TITAN = (s) => `${Math.round(s)}px "Titan One", "Arial Black", sans-serif`; // tamaños enteros: «30.999999px» confundía al ajuste
  const NUNITO = (s, w = 800) => `${w} ${Math.round(s)}px Nunito, "Segoe UI", system-ui, sans-serif`;
  const WA_PATH =
    'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1 2.2 1.4 2.5 1.5.3.2.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.5.4.1.1.1.7-.2 1.3Z';
  let waPath = null;

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  // Achica la letra hasta que el texto quepa en maxW
  function fit(c, txt, font, size, maxW) {
    let s = size;
    c.font = font(s);
    while (s > 10 && c.measureText(txt).width > maxW) c.font = font(--s);
    return s;
  }
  // Texto con sombra dura (como las letras de caramelo de la marca)
  function txt(c, s, x, y, { font, color, align = 'center', shadow, ls = 0, maxW } = {}) {
    c.font = font;
    if (maxW && c.measureText(s).width > maxW) {
      const m = /(\d+(?:\.\d+)?)px/.exec(font);
      const base = font.replace(/\d+(?:\.\d+)?px/, '§px');
      fit(c, s, (z) => base.replace('§', z), +m[1], maxW);
    }
    if ('letterSpacing' in c) c.letterSpacing = ls ? ls + 'px' : '0px';
    c.textAlign = align;
    c.textBaseline = 'alphabetic';
    if (shadow) {
      c.fillStyle = shadow[2];
      c.fillText(s, x + shadow[0], y + shadow[1]);
    }
    c.fillStyle = color;
    c.fillText(s, x, y);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
  }
  // Caja blanca con borde chocolate y sombra de color debajo
  function caja(c, x, y, w, h, { r = 26, border = 5, sombra = '#C4165F', off = 8, fill = '#fff', stroke = '#3B1D10' } = {}) {
    rr(c, x, y + off, w, h, r);
    c.fillStyle = sombra;
    c.fill();
    rr(c, x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = border;
    c.strokeStyle = stroke;
    rr(c, x + border / 2, y + border / 2, w - border, h - border, r - border / 2);
    c.stroke();
  }
  function waIcon(c, x, y, size) {
    waPath = waPath || (typeof Path2D !== 'undefined' ? new Path2D(WA_PATH) : null);
    if (!waPath) return;
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.fillStyle = '#fff';
    c.fill(waPath);
    c.restore();
  }
  // Botón verde de WhatsApp; lines = 1 o 2 renglones
  function cta(c, x, y, w, h, lines, size, { r = h / 2, border = 5, off = 8, icon = size * 1.25 } = {}) {
    caja(c, x, y, w, h, { r, border, sombra: '#0E5A24', off, fill: '#25A244', stroke: '#0E5A24' });
    c.font = NUNITO(size);
    const tw = Math.max(...lines.map((l) => c.measureText(l).width));
    const gap = size * 0.35;
    const total = icon + gap + tw;
    const maxW = w - 40;
    let s = size;
    if (total > maxW) {
      s = Math.floor(size * ((maxW - icon - gap) / tw));
      c.font = NUNITO(s);
    }
    const tw2 = Math.max(...lines.map((l) => c.measureText(l).width));
    const x0 = x + (w - (icon + gap + tw2)) / 2;
    waIcon(c, x0, y + (h - icon) / 2, icon);
    const lh = s * 1.15;
    const y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + s * 0.36;
    lines.forEach((l, i) => txt(c, l, x0 + icon + gap, y0 + i * lh, { font: NUNITO(s), color: '#fff', align: 'left' }));
  }
  const ctaLines = (two) => {
    const n = phone();
    if (!n) return two ? ['Pide por', 'WhatsApp'] : ['Pide por WhatsApp'];
    return two ? ['WhatsApp', n] : [`WhatsApp ${n}`];
  };
  // Pastilla de precio: etiqueta arriba, valor grande abajo
  function pill(c, x, y, w, h, tag, val, { tagS, valS, valColor, sombra, border = 5, off = 8, r = 26 }) {
    caja(c, x, y, w, h, { r, border, sombra, off });
    txt(c, tag.toUpperCase(), x + w / 2, y + h * 0.3, { font: NUNITO(tagS), color: '#8F4DFF', ls: 2, maxW: w - 24 });
    txt(c, val, x + w / 2, y + h * 0.82, { font: TITAN(valS), color: valColor, maxW: w - 30 });
  }
  function pillWidth(c, val, valS, min, pad) {
    c.font = TITAN(valS);
    return Math.max(min, c.measureText(val).width + pad * 2);
  }
  function fillBg(c, w, h, top, bottom) {
    if (!bottom || bottom === top) {
      c.fillStyle = top;
    } else {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      c.fillStyle = g;
    }
    c.fillRect(0, 0, w, h);
  }

  /* ---------- Logo de la marca (las letras «Dulza» de caramelo; en festividad, su versión de temporada) ----------
     Si el negocio tiene otro nombre, se escribe con la tipografía. (cx, top) = centro y borde de arriba; h = alto. */
  const esDulza = () => /^dulza$/i.test(String(D.data.settings.name || 'Dulza').trim());
  const logoUrl = (t) => (t ? `assets/brand/gpt/temporadas/${t}/logos/letras.png` : 'assets/brand/gpt/v3/logos/logo-nombre.png');
  async function marca(c, cx, top, h, { t = '', align = 'center', color = '#FF3D8B', shadow = '#C4165F' } = {}) {
    if (esDulza()) {
      let i = null;
      try {
        i = await img(logoUrl(t));
      } catch (e) {
        if (t) i = await img(logoUrl('')).catch(() => null);
      }
      if (i) {
        const w = (i.width / i.height) * h;
        const x = align === 'right' ? cx - w : align === 'left' ? cx : cx - w / 2;
        c.drawImage(i, x, top, w, h);
        return;
      }
    }
    const s = Math.round(h * 0.62);
    txt(c, D.data.settings.name || 'Dulza', cx, top + h * 0.78, { font: TITAN(s), color, align, shadow: [0, Math.max(3, s / 22), shadow], maxW: 700 });
  }

  /* ---------- Pieza de un postre (normal o navideña) ---------- */
  async function drawPostre(c, pz) {
    const P = POSTRES[pz.k];
    const pr = precios(pz.k);
    const v = pz.fmt === 'historia';
    const F = pz.t ? FEST[pz.t] : null;
    const nav = !!F; // pieza de festividad
    const NAV = F ? { ink: F.ink, sombra: F.sombra, frase: F.acento, pill: F.sombra } : null;
    const ilus = await img(IL(`${F ? pz.t + '-' : ''}${pz.k}-${v ? 'v' : 'c'}`));
    const W = 1080, H = v ? 1920 : 1080;
    const ink = nav ? NAV.ink : P.ink;
    const sombra = nav ? NAV.sombra : P.sombra;
    const frase = nav ? F.frase : P.frase;
    const marca_ = nav ? { color: F.ink, shadow: [0, 4, NAV.sombra] } : { color: '#FF3D8B', shadow: [0, 4, '#C4165F'] };
    fillBg(c, W, H, P.bg);
    if (!v) c.drawImage(ilus, 0, ilus.height - 2, ilus.width, 2, 0, 1040, 1080, 40); // franja de abajo del mismo fondo
    if (v) {
      // la ilustración es 2:3 y la historia 9:16: las franjas de arriba y abajo se llenan estirando su primer
      // y último renglón, así el fondo continúa sin corte
      c.drawImage(ilus, 0, 0, ilus.width, 2, 0, 0, 1080, 162);
      c.drawImage(ilus, 0, ilus.height - 2, ilus.width, 2, 0, 1778, 1080, 142);
      c.drawImage(ilus, 0, 160, 1080, 1620);
      // cabecera
      await marca(c, 540, 34, 118, { t: pz.t, color: marca_.color, shadow: marca_.shadow[2] });
      let y = 272;
      P.lines.forEach((l, i) => {
        txt(c, l, 540, y, { font: TITAN(128), color: ink, shadow: [0, 5, sombra], maxW: 1000 });
        if (i < P.lines.length - 1) y += 124;
      });
      txt(c, frase, 540, y + 80, { font: NUNITO(46), color: nav ? NAV.frase : '#8F4DFF', shadow: nav ? [0, 3, NAV.sombra] : null, maxW: 980 });
      // precios
      const ps = nav ? NAV.pill : P.sombra;
      const items = pr.plazo ? [['Contado', pr.contado, '#FF3D8B'], ['A plazo', pr.plazo, '#B0661A']] : [['Precio', pr.contado, '#FF3D8B']];
      const ws = items.map((it) => pillWidth(c, it[1], 82, 340, 30));
      const gap = 16;
      let x = (W - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1))) / 2;
      items.forEach((it, i) => {
        pill(c, x, 1500, ws[i], 152, it[0], it[1], { tagS: 26, valS: 82, valColor: it[2], sombra: ps });
        x += ws[i] + gap;
      });
      cta(c, 180, 1700, 720, 104, ctaLines(false), 44);
    } else {
      c.drawImage(ilus, 0, -30, 1080, 1080);
      let y = 112;
      P.lines.forEach((l, i) => {
        txt(c, l, 44, y, { font: TITAN(84), color: ink, align: 'left', shadow: [0, 5, sombra], maxW: 760 });
        if (i < P.lines.length - 1) y += 80;
      });
      txt(c, frase, 44, y + 52, { font: NUNITO(34), color: nav ? NAV.frase : '#8F4DFF', align: 'left', shadow: nav ? [0, 3, NAV.sombra] : null, maxW: 760 });
      await marca(c, 1040, 14, 104, { t: pz.t, align: 'right', color: marca_.color, shadow: marca_.shadow[2] });
      // fila inferior: precios + WhatsApp
      const ps = nav ? NAV.pill : P.sombra;
      const items = pr.plazo ? [['Contado', pr.contado, '#FF3D8B'], ['A plazo', pr.plazo, '#B0661A']] : [['Precio', pr.contado, '#FF3D8B']];
      const ws = items.map((it) => pillWidth(c, it[1], 54, 230, 22));
      const cw = 270, gap = 14, h = 104;
      let x = (W - (ws.reduce((a, b) => a + b, 0) + cw + gap * ws.length)) / 2;
      items.forEach((it, i) => {
        pill(c, x, 916, ws[i], h, it[0], it[1], { tagS: 20, valS: 54, valColor: it[2], sombra: ps, border: 4, off: 6 });
        x += ws[i] + gap;
      });
      cta(c, x, 916, cw, h, ctaLines(true), 30, { r: 26, border: 4, off: 6, icon: 40 });
    }
  }

  /* ---------- Tarjeta de precio del menú (nombre + contado + a plazo) ---------- */
  function menuCard(c, x, y, w, k, { nameS, rowS, lh }) {
    const P = POSTRES[k];
    const pr = precios(k);
    const lines = P.short.length > 11 ? P.lines : [P.short];
    const h = nameS * 2.05 + rowS * 2.6 + 26;
    caja(c, x, y, w, h, { r: 28, border: 5, sombra: '#C4165F', off: 8 });
    let yy = y + 14 + nameS;
    lines.forEach((l, i) => txt(c, l, x + w / 2, yy + i * nameS * 1.02, { font: TITAN(nameS), color: '#5A2E1B', maxW: w - 20 }));
    yy = y + 14 + nameS * 2.05 + rowS * 1.05;
    const row = (tag, val, color, yv) => {
      c.font = NUNITO(rowS * 0.62);
      if ('letterSpacing' in c) c.letterSpacing = '1px';
      const tw = c.measureText(tag).width;
      if ('letterSpacing' in c) c.letterSpacing = '0px';
      c.font = NUNITO(rowS, 900);
      const vw = c.measureText(val).width;
      const x0 = x + (w - (tw + 8 + vw)) / 2;
      txt(c, tag, x0, yv, { font: NUNITO(rowS * 0.62), color: '#8F4DFF', align: 'left', ls: 1 });
      txt(c, val, x0 + tw + 8, yv, { font: NUNITO(rowS, 900), color, align: 'left' });
    };
    if (!pr) row('', 'Agotado', '#84707a', yy);
    else {
      row(pr.plazo ? 'CONTADO' : 'PRECIO', pr.contado, '#FF3D8B', yy);
      if (pr.plazo) row('A PLAZO', pr.plazo, '#B0661A', yy + rowS * lh);
    }
  }

  // ¿El menú es justo el de las ilustraciones (los 3 postres ilustrados, a la venta, y nada más)?
  const menuClasico = () => {
    const m = menu();
    return m.length === ORDEN.length && m.every((x) => x.k);
  };
  /* Lista de precios dentro de una caja blanca: todos los postres a la venta, en 1 o 2 columnas según cuántos haya */
  function listaPrecios(c, x, y, w, h, { titulo = 'Nuestro menú', max = 44 } = {}) {
    const items = menu();
    caja(c, x, y, w, h, { r: 32, border: 5, sombra: '#C4165F', off: 8 });
    const th = titulo ? Math.min(46, h * 0.16) : 0;
    if (titulo) txt(c, titulo, x + w / 2, y + 14 + th, { font: TITAN(th), color: '#FF3D8B' });
    const cols = (w >= 900 && items.length > 5) || items.length > 9 ? 2 : 1; // recuadro ancho: 2 columnas; angosto: 1 más grande
    const perCol = Math.ceil(items.length / cols);
    const top = y + (titulo ? th + 34 : 22), bottom = y + h - 18;
    const rowH = Math.min(max * 1.6, (bottom - top) / perCol);
    let fs = Math.max(16, Math.min(max, rowH * 0.62));
    const colW = (w - 40) / cols;
    const two = items.some((it) => it.pr.plazo);
    const precio = (it) => it.pr.contado + (it.pr.plazo ? ` · ${it.pr.plazo}` : '');
    // un solo tamaño de letra para todos los renglones: el que deje caber al nombre y al precio más largos
    items.forEach((it) => {
      c.font = TITAN(fs);
      const nw = c.measureText(it.name).width;
      c.font = NUNITO(fs * 0.92, 900);
      const pw = c.measureText(precio(it)).width;
      const libre = colW - 30;
      if (nw + pw + 24 > libre) fs = Math.max(14, fs * (libre / (nw + pw + 24)));
    });
    items.forEach((it, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const cx = x + 20 + col * colW, cy = top + row * rowH + rowH * 0.68;
      txt(c, it.name, cx + 10, cy, { font: TITAN(fs), color: '#5A2E1B', align: 'left' });
      txt(c, precio(it), cx + colW - 10, cy, { font: NUNITO(fs * 0.92, 900), color: '#FF3D8B', align: 'right' });
    });
    if (two) txt(c, 'Contado · a plazo', x + w - 30, y + h - 6, { font: NUNITO(Math.max(14, fs * 0.5)), color: '#8F4DFF', align: 'right' });
  }

  async function drawMenuC(c) {
    const ilus = await img(IL('menu-c'));
    fillBg(c, 1080, 1080, '#FCDFF0');
    c.drawImage(ilus, 0, 0, 1080, 1080);
    await marca(c, 780, 36, 204);
    txt(c, 'Postres hechos con amor', 780, 282, { font: NUNITO(38), color: '#8F4DFF', maxW: 540 });
    txt(c, '¡Antójate!', 780, 352, { font: TITAN(44), color: '#5A2E1B' });
    cta(c, 590, 400, 380, 76, ctaLines(false), 30, { border: 5, off: 8, icon: 38 });
    if (menuClasico()) [397, 625, 850].forEach((x, i) => menuCard(c, x, 848, 214, ORDEN[i], { nameS: 27, rowS: 25, lh: 1.4 }));
    else listaPrecios(c, 470, 500, 590, 560, { max: 34 }); // a la derecha de Dulce, sin taparla
  }

  async function drawMenuV(c) {
    const ilus = await img(IL('menu-v'));
    fillBg(c, 1080, 1920, '#FCDFF2');
    c.drawImage(ilus, 0, 130, 1080, 1620);
    await marca(c, 540, 36, 222);
    txt(c, 'Postres hechos con amor', 540, 300, { font: NUNITO(44), color: '#8F4DFF' });
    if (menuClasico()) [45, 385, 725].forEach((x, i) => menuCard(c, x, 1470, 310, ORDEN[i], { nameS: 36, rowS: 32, lh: 1.4 }));
    else listaPrecios(c, 40, 1400, 1000, 340, { max: 44 });
    cta(c, 190, 1760, 700, 104, ctaLines(false), 44);
  }

  async function drawVolante(c) {
    const ilus = await img(IL('menu-v'));
    const W = 1240, H = 1754;
    fillBg(c, W, H, '#FCDFF2');
    // marco punteado
    c.save();
    c.setLineDash([18, 12]);
    c.lineWidth = 6;
    c.strokeStyle = '#FF8FBB';
    rr(c, 29, 29, W - 58, H - 58, 48);
    c.stroke();
    c.restore();
    await marca(c, 620, 40, 214);
    txt(c, 'Postres hechos con amor', 620, 292, { font: NUNITO(46), color: '#8F4DFF' });
    // tabla del menú con todo el catálogo: si hay más de 3 postres, la ilustración se recorta para hacerles lugar
    const rows = menu().map((it) => [it.name, it.pr]);
    const two = rows.some((r) => r[1].plazo);
    const rowH = rows.length > 8 ? Math.max(44, 560 / rows.length) : 70;
    const extra = Math.max(0, Math.min(400, (rows.length - 3) * rowH));
    // ilustración recortada (mascota + postres)
    c.save();
    c.beginPath();
    c.rect(210, 296, 820, 890 - extra);
    c.clip();
    const k = (890 - extra) / 890;
    c.drawImage(ilus, 620 - 410 * k, 296 - 126 * k, 820 * k, 1230 * k);
    c.restore();
    const x = 110, y = 1190 - extra, w = 1020;
    const h = 112 + rows.length * rowH + 20;
    caja(c, x, y, w, h, { r: 36, border: 6, sombra: '#C4165F', off: 10 });
    txt(c, 'Nuestro menú', 620, y + 62, { font: TITAN(46), color: '#FF3D8B' });
    const cL = x + 50, cC = two ? x + w - 250 : x + w - 50, cP = x + w - 50;
    txt(c, 'POSTRE', cL, y + 104, { font: NUNITO(24), color: '#8F4DFF', align: 'left', ls: 2 });
    txt(c, two ? 'CONTADO' : 'PRECIO', cC, y + 104, { font: NUNITO(24), color: '#8F4DFF', align: 'right', ls: 2 });
    if (two) txt(c, 'A PLAZO', cP, y + 104, { font: NUNITO(24), color: '#8F4DFF', align: 'right', ls: 2 });
    rows.forEach((r, i) => {
      const yy = y + 112 + i * rowH;
      c.save();
      c.setLineDash([3, 6]);
      c.lineWidth = 3;
      c.strokeStyle = '#FF8FBB';
      c.beginPath();
      c.moveTo(cL, yy + 6);
      c.lineTo(cP, yy + 6);
      c.stroke();
      c.restore();
      const fs = Math.min(38, rowH * 0.56);
      txt(c, r[0], cL, yy + rowH * 0.77, { font: TITAN(fs), color: '#5A2E1B', align: 'left', maxW: 520 });
      txt(c, r[1].contado, cC, yy + rowH * 0.77, { font: NUNITO(fs, 900), color: '#FF3D8B', align: 'right' });
      if (two) txt(c, r[1].plazo || r[1].contado, cP, yy + rowH * 0.77, { font: NUNITO(fs, 900), color: '#B0661A', align: 'right' });
    });
    // nota de pago (dos colores) y botón
    const ny = y + h + 66;
    const a = 'Paga de contado o ', b = 'a plazo de 8, 15 o 30 días';
    c.font = NUNITO(34);
    const wa = c.measureText(a).width, wb = c.measureText(b).width;
    const nx = (W - wa - wb) / 2;
    txt(c, a, nx, ny, { font: NUNITO(34), color: '#5A2E1B', align: 'left' });
    txt(c, b, nx + wa, ny, { font: NUNITO(34), color: '#8F4DFF', align: 'left' });
    cta(c, 270, ny + 34, 700, 72, ctaLines(false), 34, { border: 4, off: 6, icon: 44 });
  }

  /* ---------- Pieza automática de un postre nuevo (sin ilustración propia) ----------
     Fondo de la ocasión con confeti, el dibujo del postre (catálogo) dentro de un sticker con brillo, Dulce al lado
     con el vestuario de la fecha, el nombre, los precios y el WhatsApp. Usa la versión HD del dibujo si existe. */
  const NORMAL = { bg: ['#FFE6F1', '#FFC9DF'], ink: '#5A2E1B', sombra: '#FF8FBB', frase: '#8F4DFF', deco: ['#FF3D8B', '#8F4DFF', '#E2A24C', '#FFFFFF'] };
  const FRASES = ['¡Antójate!', '¡Recién hecho para ti!', '¡Hecho con amor!', '¡Pruébalo hoy!'];
  async function dibujoPostre(e) {
    if (D.isPostre(e)) {
      const n = e.slice(2);
      return img(`assets/brand/gpt/v3/postres-hd/postre-${n}.png`).catch(() => img(D.postreUrl(e)));
    }
    return null; // emoji
  }
  function confeti(c, W, H, colors, seed) {
    let h = seed;
    const rnd = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
    c.save();
    for (let i = 0; i < 46; i++) {
      c.globalAlpha = 0.18 + rnd() * 0.22;
      c.fillStyle = colors[i % colors.length];
      const x = rnd() * W, y = rnd() * H, s = 6 + rnd() * 12;
      if (i % 3 === 0) {
        c.beginPath();
        c.arc(x, y, s / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.save();
        c.translate(x, y);
        c.rotate(rnd() * Math.PI);
        rr(c, -s, -s / 3.2, s * 2, s / 1.6, s / 3.2);
        c.fill();
        c.restore();
      }
    }
    c.restore();
  }
  async function drawGen(c, pz) {
    const p = byId(pz.pid);
    const pr = preciosDe(p);
    const v = pz.fmt === 'historia';
    const F = pz.t ? FEST[pz.t] : null;
    const W = 1080, H = v ? 1920 : 1080;
    const bg = F ? FEST_BG[pz.t] : NORMAL.bg;
    const ink = F ? F.ink : NORMAL.ink;
    const sombra = F ? F.sombra : NORMAL.sombra;
    const seed = [...p.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const frase = F ? F.frase : FRASES[seed % FRASES.length];
    const [dib, dulce, band] = await Promise.all([
      dibujoPostre(p.emoji || D.DEFAULT_GLYPH),
      // Dulce de cuerpo entero (el busto termina recortado en la cintura y el corte se notaba)
      img(F ? `assets/brand/gpt/temporadas/${pz.t}/personaje.png` : 'assets/brand/gpt/v3/personaje.png').catch(() => null),
      img(`${BASE}bandejas/${pz.t || 'normal'}.png`).catch(() => null),
    ]);
    fillBg(c, W, H, bg[0], bg[1]);
    confeti(c, W, H, F ? ['#FFFFFF', F.acento, F.sub] : NORMAL.deco, seed);

    // el postre sobre su bandeja con pedestal (como en las ilustraciones), con un brillo suave detrás
    const R = v ? 360 : 230, cx = v ? 590 : 690, cy = v ? 890 : 520;
    const glow = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
    glow.addColorStop(0, 'rgba(255,255,255,0.6)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
    const sw = R * 2.1; // ancho de la bandeja
    const plato = cy + R * 0.42; // donde se apoya el postre
    if (band) {
      const sh = (band.height / band.width) * sw;
      c.drawImage(band, cx - sw / 2, plato - sh * (BANDEJA_PLATO[pz.t || 'normal'] || 0.22), sw, sh);
    } else bandejaDibujada(c, cx, plato, sw, F ? F.acento : '#E2A24C');
    const alto = R * 1.35, ancho = R * 1.6; // caja máxima del postre
    if (dib) {
      const s = Math.min(ancho / dib.width, alto / dib.height);
      c.drawImage(dib, cx - (dib.width * s) / 2, plato - dib.height * s + R * 0.06, dib.width * s, dib.height * s);
    } else {
      c.font = `${Math.round(R * 1.1)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      c.textAlign = 'center';
      c.fillText(p.emoji || '🧁', cx, plato + R * 0.02);
    }
    // destellos alrededor del sticker
    c.fillStyle = F ? F.acento : '#E2A24C';
    [[-1.05, -0.75, 26], [0.95, -0.9, 20], [1.08, 0.55, 16]].forEach(([dx, dy, s]) => {
      const x = cx + dx * R, y = cy + dy * R;
      c.beginPath();
      c.moveTo(x, y - s);
      c.quadraticCurveTo(x, y, x + s, y);
      c.quadraticCurveTo(x, y, x, y + s);
      c.quadraticCurveTo(x, y, x - s, y);
      c.quadraticCurveTo(x, y, x, y - s);
      c.fill();
    });
    // Dulce presentando (abajo a la izquierda)
    if (dulce) {
      // de pie junto a la bandeja, con los pies justo encima de los precios
      const dh = v ? 640 : 560;
      const dw = (dulce.width / dulce.height) * dh;
      c.drawImage(dulce, v ? 6 : 16, (v ? 1486 : 900) - dh, dw, dh);
    }

    // textos
    c.font = TITAN(v ? 120 : 84);
    const nameLines = wrapLines(c, p.name, v ? 980 : 600, 2);
    if (v) {
      await marca(c, 540, 34, 118, { t: pz.t, color: ink, shadow: sombra });
      let y = 290;
      nameLines.forEach((l, i) => txt(c, l, 540, y + i * 118, { font: TITAN(nameLines.length > 1 ? 108 : 124), color: ink, shadow: [0, 5, sombra], maxW: 1000 }));
      y += (nameLines.length - 1) * 118;
      txt(c, frase, 540, y + 76, { font: NUNITO(46), color: F ? F.acento : NORMAL.frase, shadow: F ? [0, 3, F.sombra] : null, maxW: 980 });
      const items = pr.plazo ? [['Contado', pr.contado, '#FF3D8B'], ['A plazo', pr.plazo, '#B0661A']] : [['Precio', pr.contado, '#FF3D8B']];
      const ws = items.map((it) => pillWidth(c, it[1], 76, 300, 28));
      let x = (W - ws.reduce((a, b) => a + b, 0) - 16 * (ws.length - 1)) / 2;
      items.forEach((it, i) => {
        pill(c, x, 1500, ws[i], 144, it[0], it[1], { tagS: 24, valS: 76, valColor: it[2], sombra: F ? F.sombra : '#C4165F' });
        x += ws[i] + 16;
      });
      cta(c, 180, 1700, 720, 104, ctaLines(false), 44);
    } else {
      nameLines.forEach((l, i) => txt(c, l, 44, 112 + i * 84, { font: TITAN(nameLines.length > 1 ? 76 : 84), color: ink, align: 'left', shadow: [0, 5, sombra], maxW: 640 }));
      const fy = 112 + (nameLines.length - 1) * 84 + 54;
      txt(c, frase, 44, fy, { font: NUNITO(34), color: F ? F.acento : NORMAL.frase, align: 'left', shadow: F ? [0, 3, F.sombra] : null, maxW: 640 });
      await marca(c, 1040, 14, 104, { t: pz.t, align: 'right', color: ink, shadow: sombra });
      const items = pr.plazo ? [['Contado', pr.contado, '#FF3D8B'], ['A plazo', pr.plazo, '#B0661A']] : [['Precio', pr.contado, '#FF3D8B']];
      const ws = items.map((it) => pillWidth(c, it[1], 54, 210, 20));
      const cw = 270, gap = 14, h = 104;
      let x = W - 40 - (ws.reduce((a, b) => a + b, 0) + cw + gap * ws.length);
      items.forEach((it, i) => {
        pill(c, x, 916, ws[i], h, it[0], it[1], { tagS: 20, valS: 54, valColor: it[2], sombra: F ? F.sombra : '#C4165F', border: 4, off: 6 });
        x += ws[i] + gap;
      });
      cta(c, x, 916, cw, h, ctaLines(true), 30, { r: 26, border: 4, off: 6, icon: 40 });
    }
  }
  // Bandejas dibujadas por Codex (assets/publicidad/bandejas/<ocasión>.png): BANDEJA_PLATO es la altura, en fracción
  // de la imagen, de la superficie del plato donde se apoya el postre
  const BANDEJA_PLATO = { normal: 0.21, navidad: 0.18, amor: 0.26, madre: 0.3, padre: 0.2, pascua: 0.25, halloween: 0.21 };
  // Bandeja de respaldo, dibujada a mano, por si su imagen no cargó
  function bandejaDibujada(c, cx, y, w, acento) {
    const lin = '#3B1D10';
    c.save();
    c.lineWidth = 5;
    c.strokeStyle = lin;
    // pie y base
    c.fillStyle = '#FFF8EE';
    c.beginPath();
    c.moveTo(cx - w * 0.08, y + w * 0.08);
    c.lineTo(cx + w * 0.08, y + w * 0.08);
    c.lineTo(cx + w * 0.05, y + w * 0.3);
    c.lineTo(cx - w * 0.05, y + w * 0.3);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = acento;
    c.beginPath();
    c.ellipse(cx, y + w * 0.33, w * 0.2, w * 0.05, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // plato: borde dorado y superficie crema
    c.fillStyle = acento;
    c.beginPath();
    c.ellipse(cx, y + w * 0.03, w * 0.5, w * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#FFFDF6';
    c.beginPath();
    c.ellipse(cx, y, w * 0.46, w * 0.075, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // Parte un texto en renglones que quepan en maxW (como máximo n renglones)
  function wrapLines(c, s, maxW, n) {
    const words = String(s || '').split(/\s+/);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width <= maxW || !cur) cur = t;
      else {
        lines.push(cur);
        cur = w;
      }
    });
    if (cur) lines.push(cur);
    if (lines.length > n) lines.splice(n - 1, lines.length, lines.slice(n - 1).join(' '));
    return lines;
  }

  /* ---------- Pieza general de una festividad (mascota + los tres postres, sin precios) ---------- */
  async function drawFest(c, pz) {
    const F = FEST[pz.t];
    const v = pz.fmt === 'historia';
    const ilus = await img(IL(`${pz.t}-${v ? 'v' : 'c'}`));
    const acento = { color: F.acento, shadow: [0, 5, F.sombra] };
    const lista = menu().map((x) => x.name).join('  ·  ');
    if (v) {
      // la ilustración (2:3) se centra y las franjas se llenan con su primer y último renglón
      c.drawImage(ilus, 0, 0, ilus.width, 2, 0, 0, 1080, 152);
      c.drawImage(ilus, 0, ilus.height - 2, ilus.width, 2, 0, 1768, 1080, 152);
      c.drawImage(ilus, 0, 150, 1080, 1620);
      await marca(c, 540, 20, 190, { t: pz.t, color: F.ink, shadow: F.sombra });
      txt(c, F.saludo, 540, 300, { font: TITAN(84), ...acento, maxW: 1000 });
      txt(c, F.general, 540, 1556, { font: TITAN(54), color: F.ink, shadow: [0, 4, F.sombra], maxW: 980 });
      txt(c, lista, 540, 1616, { font: NUNITO(38), color: F.sub, maxW: 980 });
      cta(c, 190, 1740, 700, 104, phone() ? [`WhatsApp ${phone()}`] : ['Encarga por WhatsApp'], 44);
    } else {
      c.drawImage(ilus, 0, 0, 1080, 1080);
      await marca(c, 750, 8, 164, { t: pz.t, color: F.ink, shadow: F.sombra });
      txt(c, F.saludo, 750, 240, { font: TITAN(70), ...acento, maxW: 600 });
      txt(c, F.general, 750, 296, { font: NUNITO(34), color: F.sub, shadow: [0, 2, F.sombra], maxW: 600 });
      cta(c, 280, 976, 600, 76, ctaLines(false), 32, { icon: 38 });
    }
  }

  const DRAW = { postre: drawPostre, menuC: drawMenuC, menuV: drawMenuV, volante: drawVolante, fest: drawFest, gen: drawGen };

  // Dibuja la pieza a la escala pedida (1 = tamaño real) y devuelve el canvas
  async function render(pz, scale = 1) {
    await fonts();
    const f = FMT[pz.fmt];
    const cv = document.createElement('canvas');
    cv.width = Math.round(f.w * scale);
    cv.height = Math.round(f.h * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    c.imageSmoothingQuality = 'high';
    await DRAW[pz.kind](c, pz);
    return cv;
  }
  const toBlob = (cv, q) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen'))), 'image/jpeg', q));
  D.publicidadRender = render; // para pruebas

  /* ---------- Caché: archivo grande y miniatura, según la firma (precios + WhatsApp) ---------- */
  const files = new Map(); // id → { sig, job }
  function fileOf(pz) {
    const sig = firma();
    const hit = files.get(pz.id);
    if (hit && hit.sig === sig) return hit.job;
    const job = render(pz, 1)
      .then((cv) => toBlob(cv, 0.9))
      .then((b) => new File([b], `dulza-${pz.id}.jpg`, { type: 'image/jpeg' }))
      .catch((e) => {
        files.delete(pz.id);
        throw e;
      });
    files.set(pz.id, { sig, job });
    return job;
  }
  const thumbs = new Map(); // id → { sig, job(url) }
  function thumbOf(pz) {
    const sig = firma();
    const hit = thumbs.get(pz.id);
    if (hit && hit.sig === sig) return hit.job;
    if (hit) hit.job.then((u) => URL.revokeObjectURL(u)).catch(() => {});
    const job = render(pz, 360 / FMT[pz.fmt].w)
      .then((cv) => toBlob(cv, 0.82))
      .then((b) => URL.createObjectURL(b))
      .catch((e) => {
        thumbs.delete(pz.id);
        throw e;
      });
    thumbs.set(pz.id, { sig, job });
    return job;
  }

  /* ==========================================================================
     Compartir y descargar
     ========================================================================== */
  function save(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    D.toast('Imagen descargada');
  }
  const shareText = (pz) => {
    const n = phone();
    const pide = n ? `Pide por WhatsApp: ${n}` : 'Pide por WhatsApp';
    if (pz.kind === 'postre') {
      const pr = precios(pz.k);
      return `${pz.t ? FEST[pz.t].emoji + ' ' : ''}${POSTRES[pz.k].short} de ${D.data.settings.name || 'Dulza'}: ${pr.contado}${pr.plazo ? ` de contado o ${pr.plazo} a plazo` : ''}. ${pide} 💖`;
    }
    if (pz.kind === 'gen') {
      const p = byId(pz.pid);
      const pr = preciosDe(p);
      return `${pz.t ? FEST[pz.t].emoji + ' ' : ''}${p.name} de ${D.data.settings.name || 'Dulza'}: ${pr.contado}${pr.plazo ? ` de contado o ${pr.plazo} a plazo` : ''}. ${pide} 💖`;
    }
    return `${D.data.settings.name || 'Dulza'} · postres hechos con amor 💖 ${pide}`;
  };

  async function share(pz, btn) {
    btn && btn.classList.add('is-busy');
    try {
      const file = await fileOf(pz);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: pz.title, text: shareText(pz) });
        } catch (e) {
          if (e && e.name === 'AbortError') return; // la persona cerró el menú
          save(file); // el navegador no dejó compartir: se descarga
        }
      } else save(file);
    } catch (e) {
      D.toast('No pude preparar la imagen. Revisa tu internet e intenta de nuevo.', { tone: 'bad' });
    } finally {
      btn && btn.classList.remove('is-busy');
    }
  }
  async function download(pz, btn) {
    btn && btn.classList.add('is-busy');
    try {
      save(await fileOf(pz));
    } catch (e) {
      D.toast('No pude preparar la imagen. Revisa tu internet e intenta de nuevo.', { tone: 'bad' });
    } finally {
      btn && btn.classList.remove('is-busy');
    }
  }
  const find = (id) => piezas().find((p) => p.id === id);

  // Compartir necesita que el toque sea reciente: la imagen se empieza a preparar desde que el dedo toca el botón
  document.addEventListener(
    'pointerdown',
    (e) => {
      const b = e.target.closest('[data-act="ad.share"],[data-act="ad.download"]');
      const pz = b && find(b.dataset.id);
      if (pz) fileOf(pz).catch(() => {});
    },
    { passive: true }
  );

  /* ==========================================================================
     Galería
     ========================================================================== */
  // Dos filtros: ocasión (todo el año o cada festividad) y formato. Al entrar en temporada, abre en la de la fecha.
  const temporadaHoy = () => {
    const s = D.season && D.season.current();
    return s && FEST_LISTAS.includes(s.id) ? s.id : '';
  };
  const st = (D.ui.state.publicidad = { f: '', o: null });
  const FORMATOS = [['', 'Todos'], ['historia', 'Historias y estados'], ['post', 'Publicaciones'], ['volante', 'Volantes']];
  const ocasiones = () => [['', 'Todas'], ['siempre', '🧁 Todo el año'], ...FEST_LISTAS.map((t) => [t, `${FEST[t].emoji} ${FEST[t].name}`])];
  const pasa = (pz) => (!st.f || pz.fmt === st.f) && (!st.o || (st.o === 'siempre' ? !pz.t : pz.t === st.o));
  const ratio = (pz) => `${FMT[pz.fmt].w} / ${FMT[pz.fmt].h}`;

  function gridHtml() {
    // por formato (historias, publicaciones, volante) para que las tarjetas de cada fila tengan la misma altura
    // primero la festividad de la fecha, luego por formato
    const orden = Object.keys(FMT);
    const hoy = temporadaHoy();
    const peso = (pz) => (hoy && pz.t === hoy ? 0 : 1) * 10 + orden.indexOf(pz.fmt);
    const list = piezas().filter((pz) => available(pz) && pasa(pz)).sort((a, b) => peso(a) - peso(b));
    if (!list.length)
      return D.ui.empty({ title: 'No hay piezas aquí', text: 'Activa tus postres en el catálogo con su precio para ver su publicidad.', mood: 'think', compact: true });
    return `<div class="ad-grid">${list
      .map(
        (pz) => `<article class="ad card" style="--ratio:${ratio(pz)}">
          <button type="button" class="ad__thumb" data-act="ad.open" data-id="${pz.id}" aria-label="Ver ${esc(pz.title)} en grande">
            <img data-thumb="${pz.id}" alt="" decoding="async" draggable="false"></button>
          <div class="ad__info"><span class="ad__title">${esc(pz.title)}</span><span class="ad__fmt">${esc(FMT[pz.fmt].label)}</span></div>
          <div class="ad__btns">
            <button type="button" class="btn btn--sm ad__share" data-act="ad.share" data-id="${pz.id}">${D.icon('share')}<span>Compartir</span></button>
            <button type="button" class="icon-btn ad__dl" data-act="ad.download" data-id="${pz.id}" aria-label="Descargar ${esc(pz.title)}">${D.icon('download')}</button>
          </div>
        </article>`
      )
      .join('')}</div>`;
  }

  // Las miniaturas se dibujan cuando la tarjeta se acerca a la pantalla
  let io = null;
  function paintThumbs(root) {
    io && io.disconnect();
    // se observa el recuadro (la imagen todavía no tiene tamaño hasta que se dibuja)
    const boxes = $$('.ad__thumb', root);
    const paint = (box) => {
      const el = $('img[data-thumb]', box);
      const pz = el && find(el.dataset.thumb);
      pz &&
        thumbOf(pz)
          .then((u) => {
            el.onload = () => el.classList.add('is-in');
            el.src = u;
          })
          .catch(() => {});
    };
    if (!('IntersectionObserver' in window)) return boxes.forEach(paint);
    io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          paint(e.target);
        }),
      { rootMargin: '400px 0px' }
    );
    boxes.forEach((el) => io.observe(el));
  }

  D.views.publicidad = {
    title: 'Publicidad',
    render() {
      const n = phone();
      if (st.o === null) st.o = temporadaHoy(); // primera vez: la festividad de la fecha
      const chips = (list, cur, attr) => list.map(([v, l]) => `<button type="button" class="filter-chip" ${attr}="${v}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('');
      return D.ui.page({
        title: 'Publicidad',
        sub: 'Imágenes con tus precios al día, listas para estados, historias y redes',
        body: `<div class="toolbar" data-rise>
            <div class="chips-row" id="ad-ocas" aria-label="Ocasión">${chips(ocasiones(), st.o, 'data-ado')}</div>
            <div class="chips-row" id="ad-fmts" aria-label="Formato">${chips(FORMATOS, st.f, 'data-adf')}</div>
          </div>
          <p class="ad-hint muted" data-rise>${D.icon('sparkle')}<span>Toca <b>Compartir</b> y elige WhatsApp, Instagram o Facebook. Los precios salen de tu catálogo de <a href="#/productos">Postres</a>${
            n ? '' : '; guarda el WhatsApp del negocio en <a href="#/ajustes">Ajustes</a> para que aparezca en las imágenes'
          }.</span></p>
          <div id="ad-grid" data-rise>${gridHtml()}</div>`,
      });
    },
    mount(root) {
      paintThumbs(root);
    },
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-adf],[data-ado]');
    if (!b) return;
    if ('adf' in b.dataset) {
      st.f = b.dataset.adf;
      $$('#ad-fmts .filter-chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
    } else {
      st.o = b.dataset.ado;
      $$('#ad-ocas .filter-chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }
    const g = $('#ad-grid');
    g.innerHTML = gridHtml();
    paintThumbs(g);
  });

  D.act['ad.share'] = (el) => {
    const pz = find(el.dataset.id);
    pz && share(pz, el);
  };
  D.act['ad.download'] = (el) => {
    const pz = find(el.dataset.id);
    pz && download(pz, el);
  };

  /* ---------- Vista previa en grande ---------- */
  D.act['ad.open'] = (el) => {
    const pz = find(el.dataset.id);
    if (!pz) return;
    const sh = D.sheet.open({
      title: pz.title,
      left: false,
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
      body: `<div class="stack pad ad-preview">
          <div class="ad-preview__box" style="aspect-ratio:${ratio(pz)}"><img class="ad-preview__img" alt="${esc(pz.title)}" hidden></div>
          <p class="muted center ad-preview__tip">${esc(FMT[pz.fmt].tip)}</p>
        </div>`,
      footer: `<button type="button" class="btn btn--plain" data-act="ad.download" data-id="${pz.id}">${D.icon('download')}Descargar</button>
        <button type="button" class="btn" data-act="ad.share" data-id="${pz.id}">${D.icon('share')}Compartir</button>`,
    });
    const im = sh && sh.el ? $('.ad-preview__img', sh.el) : null;
    fileOf(pz)
      .then((f) => {
        if (!im) return;
        const u = URL.createObjectURL(f);
        im.onload = () => setTimeout(() => URL.revokeObjectURL(u), 1000);
        im.src = u;
        im.hidden = false;
      })
      .catch(() => D.toast('No pude preparar la imagen. Revisa tu internet e intenta de nuevo.', { tone: 'bad' }));
  };
})();
