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
      id: 'madre', name: 'Día de la Madre', emoji: '💐', saludo: '¡Feliz Día de la Madre!', accent: '#B65FD6', deco: '#FF8FBB',
      when: (t, y, p) => upTo(t, (MADRE[p] || MADRE_MUNDIAL)(y), 10),
    },
    {
      id: 'navidad', name: 'Navidad', emoji: '🎄', saludo: '¡Feliz Navidad!', accent: '#D7263D', deco: '#E2A24C',
      when: (t, y) => between(t, day(y, 11, 1), day(y, 11, 31)) || between(t, day(y, 0, 1), day(y, 0, 6)),
    },
    {
      id: 'pascua', name: 'Pascua', emoji: '🐣', saludo: '¡Feliz Pascua!', accent: '#9B6BE0', deco: '#F5C542',
      when: (t, y) => upTo(t, easter(y), 7),
    },
    {
      id: 'padre', name: 'Día del Padre', emoji: '🎀', saludo: '¡Feliz Día del Padre!', accent: '#2E6FD8', deco: '#7FB8FF',
      when: (t, y, p) => upTo(t, (PADRE[p] || PADRE_MUNDIAL)(y), 7),
    },
    {
      id: 'halloween', name: 'Halloween', emoji: '🎃', saludo: '¡Feliz Halloween!', accent: '#F07F13', deco: '#8F4DFF',
      when: (t, y) => between(t, day(y, 9, 20), day(y, 9, 31)),
    },
    {
      id: 'amor', emoji: '💘', accent: '#E0245E', deco: '#FF8FBB',
      // en Colombia es «Amor y Amistad» (septiembre); en el resto, San Valentín (14 de febrero)
      get name() { return AMOR[pais()] ? 'Amor y Amistad' : 'San Valentín'; },
      get saludo() { return AMOR[pais()] ? '¡Feliz día del Amor y la Amistad!' : '¡Feliz San Valentín!'; },
      when: (t, y, p) => (AMOR[p] || AMOR_MUNDIAL)(t, y),
    },
  ];

  // Lo que se cambia y lo original, para poder volver
  const ORIG = { bust: D.gpt.bust, full: D.gpt.full, hello: D.gpt.moods.hello };
  const file = (id, f) => `temporadas/${id}/${f}.png`;

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
      D.gpt.moods.hello = s ? file(s.id, 'hola') : ORIG.hello;
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
