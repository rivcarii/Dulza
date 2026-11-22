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
  ORDEN.forEach((k) => {
    PIEZAS.push({ id: `historia-navidad-${SLUG[k]}`, fmt: 'historia', kind: 'postre', k, nav: true, title: `${POSTRES[k].short} navideño` });
    PIEZAS.push({ id: `post-navidad-${SLUG[k]}`, fmt: 'post', kind: 'postre', k, nav: true, title: `${POSTRES[k].short} navideño` });
  });
  PIEZAS.push({ id: 'historia-navidad', fmt: 'historia', kind: 'navGen', nav: true, title: 'Feliz Navidad' });
  PIEZAS.push({ id: 'post-navidad', fmt: 'post', kind: 'navGen', nav: true, title: 'Feliz Navidad' });
  D.PUBLICIDAD = PIEZAS;

  /* ---------- Catálogo ---------- */
  function prod(k) {
    const P = POSTRES[k];
    const list = D.data.products || [];
    return list.find((p) => P.ids.includes(p.id)) || list.find((p) => P.re.test(p.name || '')) || null;
  }
  const sells = (p) => !!p && p.active !== false && p.price > 0;
  function precios(k) {
    const p = prod(k);
    if (!sells(p)) return null;
    return { contado: D.money(p.price), plazo: D.product.hasTwo(p) ? D.money(p.priceCredit) : '' };
  }
  const phone = () => String(D.data.settings.phone || '').trim();
  const available = (pz) => (pz.kind === 'postre' ? !!precios(pz.k) : ORDEN.some((k) => precios(k)));
  // Firma de lo que cambia el dibujo: si cambian precios o el WhatsApp, se vuelve a dibujar
  const firma = () => JSON.stringify([ORDEN.map(precios), phone()]);

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

  const TITAN = (s) => `${s}px "Titan One", "Arial Black", sans-serif`;
  const NUNITO = (s, w = 800) => `${w} ${s}px Nunito, "Segoe UI", system-ui, sans-serif`;
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
      const m = /(\d+)px/.exec(font);
      const base = font.replace(/\d+px/, '§px');
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

  /* ---------- Pieza de un postre (normal o navideña) ---------- */
  const NAV = { top: '#90043A', bottom: '#C81056', ink: '#fff', sombra: '#7A0A30', frase: '#FFD66B', pill: '#7A0A30' };
  async function drawPostre(c, pz) {
    const P = POSTRES[pz.k];
    const pr = precios(pz.k);
    const v = pz.fmt === 'historia';
    const nav = !!pz.nav;
    const ilus = await img(IL(`${nav ? 'navidad-' : ''}${pz.k}-${v ? 'v' : 'c'}`));
    const W = 1080, H = v ? 1920 : 1080;
    const ink = nav ? NAV.ink : P.ink;
    const sombra = nav ? NAV.sombra : P.sombra;
    const frase = nav ? '¡Endulza tu Navidad!' : P.frase;
    const marca = nav ? { color: '#fff', shadow: [0, 4, NAV.sombra] } : { color: '#FF3D8B', shadow: [0, 4, '#C4165F'] };
    fillBg(c, W, H, nav ? NAV.top : P.bg, nav ? NAV.bottom : null);
    if (v) {
      // la ilustración es 2:3 y la historia 9:16: las franjas de arriba y abajo se llenan estirando su primer
      // y último renglón, así el fondo continúa sin corte
      c.drawImage(ilus, 0, 0, ilus.width, 2, 0, 0, 1080, 162);
      c.drawImage(ilus, 0, ilus.height - 2, ilus.width, 2, 0, 1778, 1080, 142);
      c.drawImage(ilus, 0, 160, 1080, 1620);
      // cabecera
      txt(c, 'Dulza', 540, 132, { font: TITAN(64), ...marca });
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
      txt(c, 'Dulza', 1036, 92, { font: TITAN(58), align: 'right', ...marca });
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

  async function drawMenuC(c) {
    const ilus = await img(IL('menu-c'));
    fillBg(c, 1080, 1080, '#FCDFF0');
    c.drawImage(ilus, 0, 0, 1080, 1080);
    txt(c, 'Dulza', 780, 212, { font: TITAN(150), color: '#FF3D8B', shadow: [0, 6, '#C4165F'] });
    txt(c, 'Postres hechos con amor', 780, 282, { font: NUNITO(38), color: '#8F4DFF', maxW: 540 });
    txt(c, '¡Antójate!', 780, 352, { font: TITAN(44), color: '#5A2E1B' });
    cta(c, 590, 400, 380, 76, ctaLines(false), 30, { border: 5, off: 8, icon: 38 });
    [397, 625, 850].forEach((x, i) => menuCard(c, x, 848, 214, ORDEN[i], { nameS: 27, rowS: 25, lh: 1.4 }));
  }

  async function drawMenuV(c) {
    const ilus = await img(IL('menu-v'));
    fillBg(c, 1080, 1920, '#FCDFF2');
    c.drawImage(ilus, 0, 130, 1080, 1620);
    txt(c, 'Dulza', 540, 230, { font: TITAN(170), color: '#FF3D8B', shadow: [0, 6, '#C4165F'] });
    txt(c, 'Postres hechos con amor', 540, 300, { font: NUNITO(44), color: '#8F4DFF' });
    [45, 385, 725].forEach((x, i) => menuCard(c, x, 1470, 310, ORDEN[i], { nameS: 36, rowS: 32, lh: 1.4 }));
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
    txt(c, 'Dulza', 620, 228, { font: TITAN(170), color: '#FF3D8B', shadow: [0, 6, '#C4165F'] });
    txt(c, 'Postres hechos con amor', 620, 292, { font: NUNITO(46), color: '#8F4DFF' });
    // ilustración recortada (mascota + postres)
    c.save();
    c.beginPath();
    c.rect(210, 296, 820, 890);
    c.clip();
    c.drawImage(ilus, 210, 296 - 126, 820, 1230);
    c.restore();
    // tabla del menú
    const rows = ORDEN.map((k) => [POSTRES[k].short, precios(k)]).filter((r) => r[1]);
    const two = rows.some((r) => r[1].plazo);
    const x = 110, y = 1190, w = 1020, rowH = 70;
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
      txt(c, r[0], cL, yy + 54, { font: TITAN(38), color: '#5A2E1B', align: 'left', maxW: 520 });
      txt(c, r[1].contado, cC, yy + 54, { font: NUNITO(38, 900), color: '#FF3D8B', align: 'right' });
      if (two) txt(c, r[1].plazo || r[1].contado, cP, yy + 54, { font: NUNITO(38, 900), color: '#B0661A', align: 'right' });
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

  /* ---------- Navidad general (mascota + los tres postres, sin precios) ---------- */
  async function drawNavGen(c, pz) {
    const v = pz.fmt === 'historia';
    const ilus = await img(IL(`navidad-${v ? 'v' : 'c'}`));
    const blanco = { color: '#fff', shadow: [0, 7, '#7A0A30'] };
    const oro = { color: '#FFD66B', shadow: [0, 5, '#7A0A30'] };
    if (v) {
      fillBg(c, 1080, 1920, '#A4063D', '#D31B63');
      c.drawImage(ilus, 0, 150, 1080, 1620);
      txt(c, 'Dulza', 540, 200, { font: TITAN(150), ...blanco });
      txt(c, '¡Feliz Navidad!', 540, 300, { font: TITAN(84), ...oro, maxW: 1000 });
      txt(c, 'Endulza tu Navidad', 540, 1556, { font: TITAN(54), color: '#fff', shadow: [0, 4, '#7A0A30'], maxW: 980 });
      const lista = ORDEN.filter((k) => precios(k)).map((k) => POSTRES[k].short).join('  ·  ');
      txt(c, lista, 540, 1616, { font: NUNITO(38), color: '#FFE6F1', maxW: 980 });
      cta(c, 190, 1740, 700, 104, phone() ? [`WhatsApp ${phone()}`] : ['Encarga por WhatsApp'], 44);
    } else {
      fillBg(c, 1080, 1080, '#B8144C');
      c.drawImage(ilus, 0, 0, 1080, 1080);
      txt(c, 'Dulza', 750, 150, { font: TITAN(120), ...blanco });
      txt(c, '¡Feliz Navidad!', 750, 240, { font: TITAN(70), ...oro, maxW: 600 });
      txt(c, 'Encarga tus postres navideños', 750, 296, { font: NUNITO(34), color: '#FFE6F1', shadow: [0, 2, '#7A0A30'], maxW: 600 });
      cta(c, 280, 976, 600, 76, ctaLines(false), 32, { icon: 38 });
    }
  }

  const DRAW = { postre: drawPostre, menuC: drawMenuC, menuV: drawMenuV, volante: drawVolante, navGen: drawNavGen };

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
      return `${pz.nav ? '🎄 ' : ''}${POSTRES[pz.k].short} de ${D.data.settings.name || 'Dulza'}: ${pr.contado}${pr.plazo ? ` de contado o ${pr.plazo} a plazo` : ''}. ${pide} 💖`;
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
  const find = (id) => PIEZAS.find((p) => p.id === id);

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
  const st = (D.ui.state.publicidad = { f: '' });
  const FILTROS = [['', 'Todas'], ['historia', 'Historias y estados'], ['post', 'Publicaciones'], ['navidad', 'Navidad'], ['volante', 'Volantes']];
  const pasa = (pz) => !st.f || (st.f === 'navidad' ? pz.nav : pz.fmt === st.f);
  const ratio = (pz) => `${FMT[pz.fmt].w} / ${FMT[pz.fmt].h}`;

  function gridHtml() {
    // por formato (historias, publicaciones, volante) para que las tarjetas de cada fila tengan la misma altura
    const orden = Object.keys(FMT);
    const list = PIEZAS.filter((pz) => available(pz) && pasa(pz)).sort((a, b) => orden.indexOf(a.fmt) - orden.indexOf(b.fmt));
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
      return D.ui.page({
        title: 'Publicidad',
        sub: 'Imágenes con tus precios al día, listas para estados, historias y redes',
        body: `<div class="toolbar" data-rise><div class="chips-row" id="ad-fmts">${FILTROS.map(
          ([v, l]) => `<button type="button" class="filter-chip" data-adf="${v}" aria-pressed="${v === st.f}">${esc(l)}</button>`
        ).join('')}</div></div>
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
    const b = e.target.closest('[data-adf]');
    if (!b) return;
    st.f = b.dataset.adf;
    $$('#ad-fmts .filter-chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
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
