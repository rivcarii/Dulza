/* Dulza · tema: modo claro/oscuro, paleta derivada de dos colores, ajuste al hardware */
(function () {
  'use strict';
  const D = window.D;
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const INK = '#2a1a23';

  D.theme = {
    scheme() {
      const t = D.data.settings.theme;
      return t === 'auto' ? (mqDark.matches ? 'dark' : 'light') : t;
    },

    /* Calcula y aplica todas las variables de color a partir de brand + accent */
    apply() {
      const S = D.data.settings;
      const root = document.documentElement;
      const C = D.color;
      const brand = C.valid(S.brand) ? S.brand : D.defaults.brand;
      const accent = C.valid(S.accent) ? S.accent : D.defaults.accent;
      const scheme = D.theme.scheme();
      const dark = scheme === 'dark';

      // Texto sobre el color de marca: blanco o tinta, el que cumpla contraste 4.5
      let onBrand = '#ffffff';
      let fill = brand;
      if (C.contrast(brand, '#ffffff') >= 4.5) onBrand = '#ffffff';
      else if (C.contrast(brand, INK) >= 4.5) onBrand = INK;
      else fill = C.ensure(brand, '#ffffff', 4.5, '#000000');

      // Texto de color de marca sobre superficies
      const surface = dark ? '#231a1f' : '#ffffff';
      const ink = dark ? C.ensure(brand, surface, 4.8, '#ffffff') : C.ensure(brand, surface, 4.8, '#000000');

      const vars = {
        '--brand': brand,
        '--accent': accent,
        '--brand-fill': fill,
        '--on-brand': onBrand,
        '--brand-ink': ink,
      };
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      root.dataset.theme = scheme;

      const bg = dark ? C.mix('#120d10', brand, 0.07) : C.mix('#fffaf8', brand, 0.04);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) { meta.dataset.base = bg; meta.setAttribute('content', document.documentElement.classList.contains('has-sheet') ? C.mix(bg, '#000000', 0.42) : bg); }
      try {
        localStorage.setItem('dz-theme', JSON.stringify({ mode: S.theme, scheme, vars, bg }));
      } catch (e) {}
    },

    /* Colores ya resueltos (para dibujar en canvas / SVG sin variables CSS) */
    colors() {
      const S = D.data.settings;
      const cs = getComputedStyle(document.documentElement);
      const g = (v, fb) => cs.getPropertyValue(v).trim() || fb;
      return {
        brand: g('--brand', S.brand),
        fill: g('--brand-fill', S.brand),
        onBrand: g('--on-brand', '#ffffff'),
        ink: g('--brand-ink', S.brand),
        accent: g('--accent', S.accent),
      };
    },

    /* Detecta equipos modestos para aligerar efectos (sin tocar el diseño) */
    tunePerformance() {
      const nav = navigator;
      const lowMem = nav.deviceMemory && nav.deviceMemory <= 2;
      const lowCpu = nav.hardwareConcurrency && nav.hardwareConcurrency <= 2;
      const saveData = nav.connection && nav.connection.saveData;
      const reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
      document.documentElement.dataset.perf = lowMem || lowCpu || saveData || reducedData ? 'lite' : 'full';
    },

    init() {
      D.theme.tunePerformance();
      D.theme.apply();
      const onScheme = () => D.data.settings.theme === 'auto' && D.theme.apply();
      mqDark.addEventListener ? mqDark.addEventListener('change', onScheme) : mqDark.addListener(onScheme);
    },
  };

  /* Con una hoja abierta, la cortina oscurece la página: la barra de estado del teléfono (Android) se oscurece igual, sin franja clara arriba */
  new MutationObserver(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta || !meta.dataset.base) return;
    meta.setAttribute('content', document.documentElement.classList.contains('has-sheet') ? D.color.mix(meta.dataset.base, '#000000', 0.42) : meta.dataset.base);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
