/* Dulza · iconos, logotipo y mascota (SVG propios, sin dependencias) */
(function () {
  'use strict';
  const D = window.D;

  /* ---------- Iconos (trazo, 24×24) ---------- */
  const I = {
    home: '<path d="M4 10.6 12 4l8 6.6V19a1.2 1.2 0 0 1-1.2 1.2H15v-5.4H9v5.4H5.2A1.2 1.2 0 0 1 4 19z"/>',
    receipt: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V20.5l-2.4-1.5-2.4 1.5-1.7-1.2-1.7 1.2-2.4-1.5-2.4 1.5V4.5a1 1 0 0 1 1-1z"/><path d="M9 8.5h6M9 12h6"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h12.2a1.3 1.3 0 0 0 1.3-1.3V9.3A1.3 1.3 0 0 0 18.2 8H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1.1" fill="currentColor" stroke="none"/>',
    cart: '<path d="M3.5 4.5h2l2.2 10.6a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.76l1.4-6.1H6.2"/><circle cx="9.5" cy="19.6" r="1.2"/><circle cx="17" cy="19.6" r="1.2"/>',
    more: '<circle cx="12" cy="12" r="8.5"/><circle cx="8.3" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15.7" cy="12" r="1" fill="currentColor" stroke="none"/>',
    users: '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.5 19.5v-.8a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v.8"/><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18.6 14.3a5 5 0 0 1 2 4.4v.8"/>',
    userPlus: '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.5 19.5v-.8a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v.8"/><path d="M19 8v6M16 11h6"/>',
    cupcake: '<path d="M6.3 12.6h11.4l-1.3 7a1 1 0 0 1-1 .8H8.6a1 1 0 0 1-1-.8z"/><path d="M6.6 12.6a3.2 3.2 0 0 1 .6-5.9 4.8 4.8 0 0 1 9.6 0 3.2 3.2 0 0 1 .6 5.9"/><path d="M10 15.5l.4 3.2M14 15.5l-.4 3.2"/>',
    truck: '<path d="M3.5 6.5h10v9.6h-10z"/><path d="M13.5 9.6h3.7l3.3 3.3v3.2h-7"/><circle cx="7.4" cy="17.9" r="1.7" fill="var(--surface)"/><circle cx="17" cy="17.9" r="1.7" fill="var(--surface)"/>',
    chart: '<path d="M5 19.5V11M12 19.5V4.5M19 19.5v-6.5"/>',
    sliders: '<path d="M4 8h9M17.5 8H20M4 16h3M11 16h9"/><circle cx="15.2" cy="8" r="2.1"/><circle cx="9" cy="16" r="2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="10.8" cy="10.8" r="6"/><path d="M15.3 15.3 20 20"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5.5 12.6l4.2 4.2L18.5 8"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="M8.4 12.4l2.6 2.6 4.6-5"/>',
    chevR: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    chevL: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevD: '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
    whatsapp: '<path d="M12 3.6a8.4 8.4 0 0 0-7.2 12.7L3.6 20.4l4.2-1.1A8.4 8.4 0 1 0 12 3.6z"/><path d="M9.3 8.4c-.4.4-.6 1-.3 1.8.8 2.1 2.4 3.6 4.5 4.5.8.3 1.4.1 1.8-.3l.5-.7-1.8-1.1-.8.6c-.7-.3-1.7-1.2-2-2l.6-.8-1-1.8z" fill="currentColor" stroke="none"/>',
    share: '<path d="M12 15.5V4.2M8.2 7.8 12 4l3.8 3.8"/><path d="M7 10.5H6a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5a1 1 0 0 0-1-1h-1"/>',
    download: '<path d="M12 4.5v10.8M8 11.5l4 4 4-4M5 19.5h14"/>',
    upload: '<path d="M12 15.5V4.7M8 8.5l4-4 4 4M5 19.5h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 10.8v5.4M14 10.8v5.4"/>',
    edit: '<path d="M4.5 19.5h4L19 9a2.8 2.8 0 0 0-4-4L4.5 15.5z"/><path d="m13.2 6.8 4 4"/>',
    phone: '<path d="M5.2 4h3.6l1.7 4.4-2.2 1.4a11 11 0 0 0 5.9 5.9l1.4-2.2 4.4 1.7v3.6a1.2 1.2 0 0 1-1.3 1.2A15.6 15.6 0 0 1 4 5.3 1.2 1.2 0 0 1 5.2 4z"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.4"/><path d="M4 10.2h16M8.2 3.6v3.6M15.8 3.6v3.6"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 1.9"/>',
    alert: '<path d="M12 4.2 3.4 19.2a.9.9 0 0 0 .8 1.3h15.6a.9.9 0 0 0 .8-1.3z"/><path d="M12 10v4.2M12 17.2v.01"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2.4"/><path d="m4.5 16 4.6-4.6 3.8 3.8 2.5-2.5 4.1 4"/><circle cx="9" cy="9.3" r="1.1" fill="currentColor" stroke="none"/>',
    note: '<path d="M6.5 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8.6 9h6.8M8.6 12.6h6.8M8.6 16.2h4"/>',
    copy: '<rect x="9" y="9" width="10.5" height="11" rx="2"/><path d="M15 9V6.2a1.7 1.7 0 0 0-1.7-1.7H6.7A1.7 1.7 0 0 0 5 6.2v8.1A1.7 1.7 0 0 0 6.7 16H9"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5M12 7.9v.01"/>',
    coin: '<circle cx="12" cy="12" r="8.6"/><path d="M14.6 9.6c-.4-.9-1.4-1.4-2.6-1.4-1.4 0-2.5.7-2.5 1.9s1 1.6 2.5 1.9 2.5.7 2.5 1.9-1.1 1.9-2.5 1.9c-1.2 0-2.2-.5-2.6-1.4M12 6.4v1.8M12 15.8v1.8"/>',
    trend: '<path d="m4 16.5 5-5 3.8 3.8L20 8M15 8h5v5"/>',
    box: '<path d="M4.5 8.2 12 4l7.5 4.2v7.6L12 20l-7.5-4.2z"/><path d="m4.8 8.4 7.2 4 7.2-4M12 12.4V20"/>',
    tag: '<path d="M4.5 11.6V5.5a1 1 0 0 1 1-1h6.1l8 8a1 1 0 0 1 0 1.4l-5.7 5.7a1 1 0 0 1-1.4 0z"/><circle cx="8.6" cy="8.6" r="1.1" fill="currentColor" stroke="none"/>',
    heart: '<path d="M12 19.6s-7-4.3-7-9.6a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.3-7 9.6-7 9.6z"/>',
    sparkle: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
    moon: '<path d="M19 14.2A7.6 7.6 0 0 1 9.8 5a7.6 7.6 0 1 0 9.2 9.2z"/>',
    app: '<rect x="6.5" y="3" width="11" height="18" rx="2.8"/><path d="M10.5 18h3"/>',
    shield: '<path d="M12 3.6 5 6.4v5.2c0 4.2 2.8 7.1 7 8.8 4.2-1.7 7-4.6 7-8.8V6.4z"/><path d="m9 12.2 2.2 2.2 3.8-4.2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    cloud: '<path d="M7.2 18.5a4.2 4.2 0 0 1-.7-8.35 5.6 5.6 0 0 1 10.7-1.1 4.7 4.7 0 0 1-.5 9.45z"/>',
    list: '<path d="M8.5 7h11M8.5 12h11M8.5 17h11"/><circle cx="4.7" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="17" r="1" fill="currentColor" stroke="none"/>',
  };
  D.ICONS = I;
  D.icon = (name, cls = '') =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${I[name] || ''}</svg>`;

  /* ---------- Mascota y logotipo ---------- */
  const A = (D.art = {});

  A.palette = (o = {}) => {
    const C = D.color;
    const brand = o.brand || D.data.settings.brand;
    const accent = o.accent || D.data.settings.accent;
    return {
      brand,
      accent,
      frost: C.mix(brand, '#ffffff', 0.66),
      frostShade: C.mix(brand, '#ffffff', 0.42),
      cup: C.mix(accent, '#ffffff', 0.1),
      cupDeep: C.mix(accent, '#000000', 0.16),
      cherry: C.mix(brand, '#000000', 0.12),
      cheek: C.mix(brand, '#ffffff', 0.2),
      ink: '#3a2230',
    };
  };

  /* mood: 'happy' | 'sleepy' */
  A.mascotSVG = (o = {}) => {
    const p = A.palette(o);
    const size = o.size ? `width="${o.size}" height="${o.size}"` : '';
    const eyes =
      o.mood === 'sleepy'
        ? `<path d="M78 141q6 5 12 0M110 141q6 5 12 0" fill="none" stroke="${p.ink}" stroke-width="3.4" stroke-linecap="round"/>`
        : `<g class="mascot-eyes"><circle cx="84" cy="140" r="5.4" fill="${p.ink}"/><circle cx="116" cy="140" r="5.4" fill="${p.ink}"/><circle cx="85.8" cy="138.2" r="1.7" fill="#fff"/><circle cx="117.8" cy="138.2" r="1.7" fill="#fff"/></g>`;
    return `<svg class="mascot ${o.cls || ''}" viewBox="0 0 200 200" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mascota de Dulza">
<ellipse cx="100" cy="191" rx="54" ry="6.5" fill="#000" opacity=".1"/>
<path d="M46 106H154L136.5 180Q134.5 190 124 190H76Q65.500 190 63.500 180Z" fill="${p.cup}"/>
<g stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"><path d="M70 114l7 70M91 114l3 72M109 114l-3 72M130 114l-7 70"/></g>
<path d="M46 106H154L152 115Q100 125 48 115Z" fill="${p.cupDeep}" opacity=".35"/>
${eyes}
<ellipse cx="72" cy="153" rx="7.5" ry="4.6" fill="${p.cheek}" opacity=".7"/><ellipse cx="128" cy="153" rx="7.5" ry="4.6" fill="${p.cheek}" opacity=".7"/>
<path d="M91.500 151.500Q100 160 108.500 151.500" fill="none" stroke="${p.ink}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M36 112C30 91 46 79 66 79H134C154 79 170 91 164 112C152 122 48 122 36 112Z" fill="${p.frostShade}"/>
<path d="M36 108C30 88 46 76 66 76H134C154 76 170 88 164 108C152 118 48 118 36 108Z" fill="${p.frost}"/>
<path d="M54 86C48 68 64 56 82 56H118C136 56 152 68 146 86C132 94 68 94 54 86Z" fill="${p.frostShade}"/>
<path d="M54 82C48 64 64 52 82 52H118C136 52 152 64 146 82C132 90 68 90 54 82Z" fill="${p.frost}"/>
<path d="M76 62C72 48 84 33 100 29C116 33 128 48 124 62C112 70 88 70 76 62Z" fill="${p.frostShade}"/>
<path d="M76 58C72 44 84 30 100 26C116 30 128 44 124 58C112 66 88 66 76 58Z" fill="${p.frost}"/>
<g fill="#fff" opacity=".6"><ellipse cx="60" cy="91" rx="10" ry="3.800" transform="rotate(-18 60 91)"/><ellipse cx="79" cy="65" rx="8" ry="3.200" transform="rotate(-20 79 65)"/><ellipse cx="91" cy="41" rx="5" ry="2.500" transform="rotate(-25 91 41)"/></g>
<g stroke-width="4.200" stroke-linecap="round"><path d="M56 99l5-3" stroke="${p.accent}"/><path d="M84 104l5-1.500" stroke="#fff"/><path d="M114 103l5 2" stroke="${p.brand}"/><path d="M140 97l4-3.500" stroke="${p.accent}"/><path d="M72 72l4-2" stroke="${p.brand}"/><path d="M104 74l5 1" stroke="#fff"/><path d="M128 70l3-3" stroke="${p.accent}"/></g>
<path d="M101 17q2-9 11-12" fill="none" stroke="#4d7c3b" stroke-width="3.200" stroke-linecap="round"/>
<circle cx="100" cy="24" r="10.500" fill="${p.cherry}"/><circle cx="96" cy="20.500" r="2.800" fill="#fff" opacity=".65"/>
</svg>`;
  };

  /* Logotipo: cupcake blanco sobre mosaico de marca (también es el ícono de la app) */
  A.markSVG = (o = {}) => {
    const p = A.palette(o);
    const C = D.color;
    const top = C.mix(p.brand, '#ffffff', 0.12);
    const bot = C.mix(p.brand, '#000000', 0.28);
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    const bleed = o.bleed; // sin esquinas redondeadas (ícono de la app)
    const sc = o.scale || 1;
    const size = o.size ? `width="${o.size}" height="${o.size}"` : '';
    return `<svg class="mark ${o.cls || ''}" viewBox="0 0 120 120" ${size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${D.esc(D.data.settings.name)}">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
<rect width="120" height="120" rx="${bleed ? 0 : 28}" fill="url(#${id})"/>
<g transform="translate(60 62) scale(${0.46 * sc}) translate(-100 -100)">
<path d="M46 106H154L136.500 180Q134.500 190 124 190H76Q65.500 190 63.500 180Z" fill="#fff"/>
<g stroke="${p.brand}" stroke-opacity=".28" stroke-width="7" stroke-linecap="round"><path d="M72 120l5 56M100 120v58M128 120l-5 56"/></g>
<path d="M36 108C30 88 46 76 66 76H134C154 76 170 88 164 108C152 118 48 118 36 108Z" fill="#fff" opacity=".94"/>
<path d="M54 82C48 64 64 52 82 52H118C136 52 152 64 146 82C132 90 68 90 54 82Z" fill="#fff"/>
<path d="M76 58C72 44 84 30 100 26C116 30 128 44 124 58C112 66 88 66 76 58Z" fill="#fff"/>
<path d="M44 110C60 118 140 118 156 110" fill="none" stroke="${p.brand}" stroke-opacity=".22" stroke-width="6" stroke-linecap="round"/>
<circle cx="100" cy="22" r="12" fill="${p.accent}"/><path d="M101 12q2-9 12-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
</g></svg>`;
  };

  /* Elementos listos para insertar en pantalla (respetan logo / mascota subidos por la usuaria) */
  A.mascot = (o = {}) => {
    const S = D.data.settings;
    if (S.mascot) return `<img class="mascot mascot-img ${o.cls || ''}" src="${S.mascot}" alt="Mascota de ${D.esc(S.name)}" ${o.size ? `width="${o.size}" height="${o.size}"` : ''}>`;
    return A.mascotSVG(o);
  };
  A.logo = (o = {}) => {
    const S = D.data.settings;
    if (S.logo) return `<img class="mark mark-img ${o.cls || ''}" src="${S.logo}" alt="${D.esc(S.name)}" ${o.size ? `width="${o.size}" height="${o.size}"` : ''}>`;
    return A.markSVG(o);
  };

  /* SVG → <img> para dibujar en canvas */
  A.toImage = (svg) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  A.srcToImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
})();
