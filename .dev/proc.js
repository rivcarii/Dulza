// Herramienta de desarrollo: recorta las láminas transparentes de GPT en piezas sueltas.
// Se carga desde el navegador (fetch + eval) con el servidor .dev/serve.py y guarda con /__save.
window.P = window.P || {};
P.load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
P.px = (img) => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return { c, x, d: x.getImageData(0, 0, c.width, c.height) }; };
P.mask = (d, thr = 10) => { const n = d.width * d.height, m = new Uint8Array(n); for (let i = 0; i < n; i++) m[i] = d.data[i * 4 + 3] > thr ? 1 : 0; return m; };
P.dilate = (m, w, h, r) => {
  if (!r) return m;
  const t = new Uint8Array(m.length), o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) { let last = -1e9; for (let x = 0; x < w; x++) { if (m[y * w + x]) last = x; if (x - last <= r) t[y * w + x] = 1; } last = 1e9; for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) last = x; if (last - x <= r) t[y * w + x] = 1; } }
  for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (t[y * w + x]) last = y; if (y - last <= r) o[y * w + x] = 1; } last = 1e9; for (let y = h - 1; y >= 0; y--) { if (t[y * w + x]) last = y; if (last - y <= r) o[y * w + x] = 1; } }
  return o;
};
P.label = (m, w, h) => {
  const lab = new Int32Array(m.length), comps = []; let id = 0; const st = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || lab[s]) continue; id++; let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0; st.push(s); lab[s] = id;
    while (st.length) {
      const p = st.pop(), x = p % w, y = (p / w) | 0; area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = id; st.push(p - 1); } if (x < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = id; st.push(p + 1); }
      if (y > 0 && m[p - w] && !lab[p - w]) { lab[p - w] = id; st.push(p - w); } if (y < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = id; st.push(p + w); }
    }
    comps.push({ id, x0, y0, x1, y1, area });
  }
  return { lab, comps };
};
// Recorta un componente (con su borde blanco) y deja transparente todo lo que no es suyo.
P.cropComp = (o, lab, c, opts = {}) => {
  const pad = opts.pad ?? 6, dil = opts.dil ?? 4, w = o.c.width, h = o.c.height;
  const x0 = Math.max(0, c.x0 - dil - 2), y0 = Math.max(0, c.y0 - dil - 2), x1 = Math.min(w - 1, c.x1 + dil + 2), y1 = Math.min(h - 1, c.y1 + dil + 2), cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  let loc = new Uint8Array(cw * ch);
  const ids = c.ids ? new Set(c.ids) : null; // un grupo de componentes (la pieza y sus chispas sueltas)
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const l = lab[(y + y0) * w + x + x0]; if (ids ? ids.has(l) : l === c.id) loc[y * cw + x] = 1; }
  if (opts.cutX !== undefined) { for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const gx = x + x0; if (opts.side === 'L' ? gx > opts.cutX : gx <= opts.cutX) loc[y * cw + x] = 0; } }
  loc = P.dilate(loc, cw, ch, dil);
  const src = o.x.getImageData(x0, y0, cw, ch), d = src.data; let bx0 = cw, by0 = ch, bx1 = 0, by1 = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = y * cw + x; if (!loc[i]) d[i * 4 + 3] = 0; if (d[i * 4 + 3] > 8) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } }
  const t = document.createElement('canvas'); t.width = cw; t.height = ch; t.getContext('2d').putImageData(src, 0, 0);
  const out = document.createElement('canvas'); out.width = bx1 - bx0 + 1 + pad * 2; out.height = by1 - by0 + 1 + pad * 2;
  out.getContext('2d').drawImage(t, bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1, pad, pad, bx1 - bx0 + 1, by1 - by0 + 1);
  return out;
};
// Quita restos finos (las rayas punteadas de la lámina): erosiona, se queda con las piezas grandes y vuelve a crecer.
P.clean = (cv, er = 2, back = 3, keepFrac = 0.05, thr = 28) => {
  const w = cv.width, h = cv.height, x = cv.getContext('2d', { willReadFrequently: true }), img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < thr) d[i] = 0; // el halo casi invisible es lo que une los restos con la pieza
  const M = new Uint8Array(w * h); for (let i = 0; i < M.length; i++) M[i] = d[i * 4 + 3] > 8 ? 1 : 0;
  const inv = M.map((v) => (v ? 0 : 1)), E = P.dilate(inv, w, h, er).map((v) => (v ? 0 : 1)); // erosión
  const { lab, comps } = P.label(E, w, h); const big = Math.max(...comps.map((c) => c.area)); const keep = new Uint8Array(w * h);
  const ok = new Set(comps.filter((c) => c.area >= big * keepFrac).map((c) => c.id)); for (let i = 0; i < keep.length; i++) if (ok.has(lab[i])) keep[i] = 1;
  const grown = P.dilate(keep, w, h, back); for (let i = 0; i < M.length; i++) if (!grown[i]) d[i * 4 + 3] = 0;
  x.putImageData(img, 0, 0); return cv;
};
/* ---- Piezas derivadas del personaje de cuerpo completo (v3/personaje.png) ---- */
P.cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// Busto: la mitad de arriba (gorro, cara, cupcake, hombros) con el borde inferior difuminado.
P.bust = (img, keepH = 640, fade = 110) => {
  const c = P.cv(img.naturalWidth, keepH), x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const g = x.createLinearGradient(0, keepH - fade, 0, keepH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, keepH - fade, c.width, fade); return c;
};
// Mosaico rosa con el personaje (ícono de la app). o: {round, scale, dy, dx}
P.tile = (img, size, o = {}) => {
  const c = P.cv(size, size), x = c.getContext('2d'); x.save();
  if (o.round) { x.beginPath(); x.roundRect(0, 0, size, size, size * o.round); x.clip(); }
  const g = x.createLinearGradient(0, 0, size, size); g.addColorStop(0, '#FF9CC6'); g.addColorStop(1, '#FF3D8B'); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const rg = x.createRadialGradient(size * 0.55, size * 0.38, 0, size * 0.55, size * 0.38, size * 0.62); rg.addColorStop(0, 'rgba(255,255,255,.42)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, size, size);
  const k = (size / 640) * (o.scale || 1), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  x.drawImage(img, (size - dw) / 2 + (o.dx || 0) * size, size * 0.035 + (o.dy || 0) * size, dw, dh); x.restore(); return c;
};
P.makeBrand = async (B = 'assets/brand/gpt/v3/') => {
  const img = await P.load(B + 'personaje.png?' + Date.now()), out = {};
  const bust = P.bust(img); out.busto = await P.save(bust, B + 'busto.png');
  out.isotipo = await P.save(P.tile(img, 1024, { round: 0.22 }), B + 'isotipo.png');
  out.i512 = await P.save(P.tile(img, 512, { round: 0.22 }), 'assets/icon-512.png');
  out.i192 = await P.save(P.tile(img, 192, { round: 0.22 }), 'assets/icon-192.png');
  out.mask = await P.save(P.tile(img, 512, { scale: 0.8, dy: 0.02 }), 'assets/icon-maskable-512.png');
  out.apple = await P.save(P.tile(img, 180, { scale: 0.92 }), 'assets/apple-touch-icon.png');
  out.f64 = await P.save(P.tile(img, 64, { round: 0.22, scale: 1.25, dy: -0.03, dx: 0.0 }), 'assets/favicon-64.png');
  out.f32 = await P.save(P.tile(img, 32, { round: 0.22, scale: 1.25, dy: -0.03 }), 'assets/favicon-32.png');
  return out;
};
// Hoja de contactos numerada para revisar un lote de piezas.
P.sheet = (cvs, cols, cell, bg = '#FFE6F1') => {
  const rows = Math.ceil(cvs.length / cols), c = P.cv(cols * cell, rows * cell), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.font = 'bold 14px sans-serif';
  cvs.forEach((s, i) => { const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell, k = Math.min((cell - 20) / s.width, (cell - 20) / s.height, 1.5), w = s.width * k, h = s.height * k; x.drawImage(s, cx + (cell - w) / 2, cy + (cell - h) / 2 + 6, w, h); x.fillStyle = '#3A1230'; x.fillText(String(i + 1), cx + 4, cy + 14); });
  return c;
};
// toDataURL es síncrono: no se frena cuando el panel está oculto (toBlob sí).
P.save = async (cv, name) => {
  const bin = atob(cv.toDataURL('image/png').split(',')[1]), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const res = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: u });
  return res.ok;
};
P.init = async (base = 'assets/brand/gpt/v3/') => {
  P.imgs = {};
  for (const n of ['personaje-y-expresiones', 'postres-y-elementos', 'logos']) {
    const img = await P.load(base + n + '.webp?' + Date.now()); const o = Object.assign({ img }, P.px(img)); const w = o.c.width, h = o.c.height;
    const L = P.label(P.dilate(P.mask(o.d, 200), w, h, 1), w, h); o.lab = L.lab; o.comps = L.comps; P.imgs[n] = o;
  }
  return Object.keys(P.imgs);
};
