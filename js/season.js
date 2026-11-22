/* Dulza · temporadas: Dulce se cambia de vestuario en cada festividad y la app toma un acento de color de la fecha.
   - Las festividades son las que se celebran en casi todo el mundo (con la fecha más común).
   - Los colores se COMBINAN con los de la marca: el color principal sigue siendo el de Dulza (Ajustes → Apariencia);
     la temporada aporta el acento y un fondo decorativo suave.
   - Ajustes → Apariencia → «Vestuario de temporada»: automático (según la fecha), apagado o una temporada fija.
   - Imágenes en assets/brand/gpt/temporadas/<id>/: busto.png (inicio, factura), hola.png (Dulce del chat,
     pantalla de clave, Más) y personaje.png (pantalla de carga). */
(function () {
  'use strict';
  const D = window.D;

  /* ---------- Fechas ---------- */
  const day = (y, m, d) => new Date(y, m, d);
  // n-ésimo día de la semana del mes (wd: 0 = domingo)
  function nth(y, m, wd, n) {
    const first = new Date(y, m, 1).getDay();
    return day(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7);
  }
  // Domingo de Pascua (calendario gregoriano, algoritmo de Meeus)
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1, dd = ((h + l - 7 * m + 114) % 31) + 1;
    return day(y, month, dd);
  }
  const addDays = (dt, n) => day(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
  const between = (t, a, b) => t >= a && t <= b;
  // último día de la semana del mes (wd: 0 = domingo)
  function last(y, m, wd) {
    const end = new Date(y, m + 1, 0);
    return day(y, m, end.getDate() - ((end.getDay() - wd + 7) % 7));
  }
  // la temporada empieza unos días antes de la fecha y termina ese día
  const upTo = (t, fecha, dias) => between(t, addDays(fecha, -dias), fecha);

  /* ---------- Fechas que cambian según el país (Ajustes → País) ----------
     Lo que no está aquí usa la fecha más común en el mundo. */
  const AMOR = {
    // Colombia celebra Amor y Amistad el tercer sábado de septiembre (no el 14 de febrero)
    Colombia: (t, y) => between(t, day(y, 8, 1), nth(y, 8, 6, 3)),
  };
  const AMOR_MUNDIAL = (t, y) => between(t, day(y, 1, 1), day(y, 1, 14)); // San Valentín
  const MADRE = {
    México: (y) => day(y, 4, 10), Guatemala: (y) => day(y, 4, 10), 'El Salvador': (y) => day(y, 4, 10),
    Argentina: (y) => nth(y, 9, 0, 3), España: (y) => nth(y, 4, 0, 1), Bolivia: (y) => day(y, 4, 27),
    Paraguay: (y) => day(y, 4, 15), Nicaragua: (y) => day(y, 4, 30), 'Costa Rica': (y) => day(y, 7, 15),
    'Rep. Dominicana': (y) => last(y, 4, 0), Panamá: (y) => day(y, 11, 8),
  };
  const MADRE_MUNDIAL = (y) => nth(y, 4, 0, 2); // segundo domingo de mayo
  const PADRE = {
    España: (y) => day(y, 2, 19), Bolivia: (y) => day(y, 2, 19), Honduras: (y) => day(y, 2, 19),
    Guatemala: (y) => day(y, 5, 17), 'El Salvador': (y) => day(y, 5, 17), 'Rep. Dominicana': (y) => last(y, 6, 0),
  };
  const PADRE_MUNDIAL = (y) => nth(y, 5, 0, 3); // tercer domingo de junio

  // País del negocio; si no está, se deduce del código telefónico de WhatsApp
  function pais() {
    const S = (D.data && D.data.settings) || {};
    if (S.country) return S.country;
    const c = (D.COUNTRIES || []).find((x) => String(x.d) === String(S.dial || '').replace(/\D/g, ''));
    return c ? c.n : '';
  }

  /* ---------- Temporadas (en orden de prioridad si se cruzaran) ---------- */
  const SEASONS = [
    {
      id: 'madre', name: 'Día de la Madre', emoji: '💐', saludo: '¡Feliz Día de la Madre!', brand: '#A24BD1', accent: '#FF7EB6', deco: '#FF8FBB',
      when: (t, y, p) => upTo(t, (MADRE[p] || MADRE_MUNDIAL)(y), 10),
    },
    {
      id: 'navidad', name: 'Navidad', emoji: '🎄', saludo: '¡Feliz Navidad!', brand: '#C8102E', accent: '#E2A24C', deco: '#E2A24C',
      when: (t, y) => between(t, day(y, 11, 1), day(y, 11, 31)) || between(t, day(y, 0, 1), day(y, 0, 6)),
    },
    {
      id: 'pascua', name: 'Pascua', emoji: '🐣', saludo: '¡Feliz Pascua!', brand: '#8E5BD8', accent: '#F5C542', deco: '#F5C542',
      when: (t, y) => upTo(t, easter(y), 7),
    },
    {
      id: 'padre', name: 'Día del Padre', emoji: '🎀', saludo: '¡Feliz Día del Padre!', brand: '#1F4FA8', accent: '#E2A24C', deco: '#7FB8FF',
      when: (t, y, p) => upTo(t, (PADRE[p] || PADRE_MUNDIAL)(y), 7),
    },
    {
      id: 'halloween', name: 'Halloween', emoji: '🎃', saludo: '¡Feliz Halloween!', brand: '#7B2FD0', accent: '#F07F13', deco: '#F07F13',
      when: (t, y) => between(t, day(y, 9, 20), day(y, 9, 31)),
    },
    {
      id: 'amor', emoji: '💘', brand: '#D6174F', accent: '#FF8FBB', deco: '#FF8FBB',
      // en Colombia es «Amor y Amistad» (septiembre); en el resto, San Valentín (14 de febrero)
      get name() { return AMOR[pais()] ? 'Amor y Amistad' : 'San Valentín'; },
      get saludo() { return AMOR[pais()] ? '¡Feliz día del Amor y la Amistad!' : '¡Feliz San Valentín!'; },
      when: (t, y, p) => (AMOR[p] || AMOR_MUNDIAL)(t, y),
    },
  ];

  // Lo que se cambia y lo original, para poder volver
  const ORIG = {
    bust: D.gpt.bust, full: D.gpt.full, hello: D.gpt.moods.hello, moods: Object.assign({}, D.gpt.moods), candy: Object.assign({}, D.CANDY),
    logo: D.gpt.logo, logoName: D.gpt.logoName, badge: D.gpt.badge, icon: D.gpt.icon,
  };
  // Temporadas con logos propios (temporadas/<id>/logos/: logo, letras, insignia, isotipo, favicon-64)
  const CON_LOGOS = ['navidad'];
  // En temporada, TODAS las caras de Dulce van con el vestuario de la fecha (nunca con la ropa rosa de siempre):
  // las alegres usan «hola» y las demás el busto
  const ALEGRES = ['happy', 'joy', 'hello', 'hug', 'love', 'kiss', 'cheer', 'yum', 'bake'];
  const file = (id, f) => `temporadas/${id}/${f}.png`;
  // Íconos de la interfaz que tienen versión de temporada (temporadas/<id>/iconos/<nombre>.png)
  const ICONOS = ['home', 'receipt', 'wallet', 'cart', 'users', 'cupcake', 'truck', 'gift', 'chart', 'sliders', 'more', 'sparkle', 'heart', 'star', 'bell', 'calendar'];
  // Temporadas cuya lámina de íconos ya está en la app
  const CON_ICONOS = ['navidad'];

  // Temporadas con vestuario ya dibujado (las demás quedan listas en el calendario y se encienden al agregar sus imágenes)
  const LISTAS = ['navidad'];
  SEASONS.splice(0, SEASONS.length, ...SEASONS.filter((s) => LISTAS.includes(s.id)));

  const byDate = (date = new Date()) => {
    const t = day(date.getFullYear(), date.getMonth(), date.getDate());
    const p = pais();
    return SEASONS.find((s) => s.when(t, t.getFullYear(), p)) || null;
  };

  D.season = {
    list: SEASONS,
    byDate,
    pais,
    // Adornos de la temporada (para la factura y las piezas): rutas de sus íconos temáticos, o [] si no tiene
    adornos(s = D.season.current()) {
      return s && CON_ICONOS.includes(s.id) ? ['star', 'heart', 'gift', 'sparkle', 'bell', 'cupcake'].map((n) => D.gpt.url(`temporadas/${s.id}/iconos/${n}.png`)) : [];
    },
    // Temporada vigente según Ajustes: 'auto' (por fecha, por defecto), 'off' o el id de una temporada fija
    current() {
      const pref = (D.data && D.data.settings && D.data.settings.season) || 'auto';
      if (pref === 'off') return null;
      if (pref !== 'auto') return SEASONS.find((s) => s.id === pref) || null;
      return byDate();
    },
    /* Pone o quita el vestuario y marca la página; se llama desde D.theme.apply */
    sync() {
      const s = D.season.current();
      D.gpt.bust = s ? file(s.id, 'busto') : ORIG.bust;
      D.gpt.full = s ? file(s.id, 'personaje') : ORIG.full;
      Object.assign(D.gpt.moods, ORIG.moods);
      if (s) Object.keys(D.gpt.moods).forEach((k) => (D.gpt.moods[k] = file(s.id, ALEGRES.includes(k) ? 'hola' : 'busto')));
      // logos (factura, bienvenida, menú lateral, pantalla de carga, ícono) y la pestaña del navegador
      const L = s && CON_LOGOS.includes(s.id) ? (f) => `temporadas/${s.id}/logos/${f}.png` : null;
      D.gpt.logo = L ? L('logo') : ORIG.logo;
      D.gpt.logoName = L ? L('letras') : ORIG.logoName;
      D.gpt.badge = L ? L('insignia') : ORIG.badge;
      D.gpt.icon = L ? L('isotipo') : ORIG.icon;
      const fav = document.querySelector('link[rel="icon"][sizes="64x64"]');
      if (fav) {
        fav.dataset.orig = fav.dataset.orig || fav.getAttribute('href');
        fav.setAttribute('href', L ? D.gpt.url(L('favicon-64')) : fav.dataset.orig);
      }
      try {
        localStorage.setItem('dz-season-logos', L ? '1' : '');
      } catch (e) {}
      // íconos dulces de la interfaz con la temática de la fecha
      Object.assign(D.CANDY, ORIG.candy);
      if (s && CON_ICONOS.includes(s.id)) ICONOS.forEach((n) => (D.CANDY[n] = `temporadas/${s.id}/iconos/${n}.png`));
      // caritas de Dulce que ya están en pantalla (botón y chat del asistente, pantalla de clave)
      const hola = D.gpt.url(D.gpt.moods.hello);
      document.querySelectorAll('img.bot-fab__mood, img.gmsg__mood, img.c-guide__mood, img.lock__mood').forEach((i) => {
        if (i.getAttribute('src') !== hola && /expresion-03|temporadas\/[a-z]+\/hola/.test(i.getAttribute('src') || '')) i.src = hola;
      });
      const root = document.documentElement;
      if (s) root.dataset.season = s.id;
      else delete root.dataset.season;
      try {
        localStorage.setItem('dz-season', s ? s.id : ''); // para la pantalla de carga de la próxima vez
      } catch (e) {}
      return s;
    },
  };

  // Al volver a la app otro día (por ejemplo, el 1.º de diciembre) se revisa la temporada
  let lastDay = new Date().toDateString();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !D.data || !D.data.settings) return;
    const today = new Date().toDateString();
    if (today === lastDay) return;
    lastDay = today;
    const before = document.documentElement.dataset.season || '';
    D.theme.apply();
    if ((document.documentElement.dataset.season || '') !== before && D.shell) {
      D.shell.build();
      D.router && D.router.render({ force: true });
    }
  });
})();
