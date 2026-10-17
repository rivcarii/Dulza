/* Dulza · arranque, navegación (hash) y estructura adaptable (barra de pestañas / riel / barra lateral) */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;

  const NAV = [
    { id: 'inicio', label: 'Inicio', icon: 'home', tab: true },
    { id: 'ventas', label: 'Ventas', icon: 'receipt', tab: true },
    { id: 'cobros', label: 'Cobros', icon: 'wallet', tab: true },
    { id: 'compras', label: 'Compras', icon: 'cart', tab: true },
    { id: 'clientes', label: 'Clientes', icon: 'users', group: 'Catálogo' },
    { id: 'productos', label: 'Postres', icon: 'cupcake', group: 'Catálogo' },
    { id: 'proveedores', label: 'Proveedores', icon: 'truck', group: 'Catálogo' },
    { id: 'reportes', label: 'Reportes', icon: 'chart', group: 'Análisis' },
    { id: 'ajustes', label: 'Ajustes', icon: 'sliders', group: 'Cuenta' },
  ];
  D.NAV = NAV;

  /* ==========================================================================
     Estructura
     ========================================================================== */
  const shell = (D.shell = {
    build() {
      const S = D.data.settings;
      const main = NAV.filter((n) => n.tab);
      const groups = {};
      NAV.filter((n) => !n.tab).forEach((n) => (groups[n.group] = groups[n.group] || []).push(n));

      const ownWord = !S.logo && /^dulza$/i.test(String(S.name || '').trim()); // con el logo de Dulza no se repite el mosaico
      const item = (n) => `<a class="nav-item" href="#/${n.id}" data-route="${n.id}">${D.icon(n.icon)}<span>${esc(n.label)}</span><i class="nav-badge" data-badge="${n.id}" hidden></i></a>`;
      $('#sidebar').innerHTML = `
        <a class="brand${ownWord ? ' brand--word' : ''}" href="#/inicio" aria-label="${esc(S.name)} · Inicio">
          <span class="brand__mark">${D.art.logo({ size: 40 })}</span>
          <span class="brand__text">${ownWord ? `<img class="brand__word" src="${D.gpt.url(D.gpt.logoName)}" alt="${esc(S.name)}" decoding="async">` : `<b>${esc(S.name)}</b>`}<small>Ventas y compras</small></span>
        </a>
        <div class="nav-group">${main.map(item).join('')}</div>
        ${Object.entries(groups).map(([g, list]) => `<div class="nav-group"><p class="nav-group__title">${esc(g)}</p>${list.map(item).join('')}</div>`).join('')}
        <div class="sidebar__foot">
          <button class="nav-install" data-act="app.install" hidden>${D.icon('download')}<span>Instalar app</span></button>
          <p class="sidebar__hint"><kbd>N</kbd> nueva venta · <kbd>/</kbd> buscar</p>
        </div>`;

      $('#tabbar').innerHTML = `<div class="tabbar__track" style="--n:5;--i:0">
        <span class="tabbar__ind" aria-hidden="true"></span>
        ${main.map((n) => `<a class="tab" href="#/${n.id}" data-route="${n.id}">${D.icon(n.icon)}<span>${esc(n.label)}</span><i class="tab-badge" data-badge="${n.id}" hidden></i></a>`).join('')}
        <a class="tab" href="#/mas" data-route="mas">${D.icon('more')}<span>Más</span></a>
      </div>`;
    },

    update(route) {
      const mainIds = NAV.filter((n) => n.tab).map((n) => n.id);
      const tabRoute = mainIds.includes(route) ? route : 'mas';
      $$('#sidebar [data-route]').forEach((a) => a.setAttribute('aria-current', a.dataset.route === route ? 'page' : 'false'));
      $$('#tabbar [data-route]').forEach((a) => a.setAttribute('aria-current', a.dataset.route === tabRoute ? 'page' : 'false'));
      const idx = [...mainIds, 'mas'].indexOf(tabRoute);
      $('.tabbar__track').style.setProperty('--i', idx);
      shell.badges();
    },

    badges() {
      const overdue = D.q.overdueCount();
      $$('[data-badge="cobros"]').forEach((b) => {
        b.hidden = overdue === 0;
        b.textContent = overdue > 9 ? '9+' : String(overdue);
        b.setAttribute('aria-label', `${overdue} vencidas`);
      });
    },
  });

  /* ==========================================================================
     Router
     ========================================================================== */
  let current = null;
  let io = null;
  const scrolls = {};

  function bindNavbar(root) {
    io && io.disconnect();
    const nav = $('[data-navbar]', root);
    const title = $('.page__title', root);
    if (!nav || !title || !('IntersectionObserver' in window)) return;
    const h = nav.offsetHeight || 56;
    io = new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting && e.boundingClientRect.top < h), { rootMargin: `-${h - 4}px 0px 0px 0px`, threshold: 0 });
    io.observe(title);
  }

  function animateIn(root) {
    const page = $('.page', root);
    if (!page) return;
    const reduce = D.reduceMotion();
    page.animate(
      reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: reduce ? 160 : 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
    if (!reduce)
      $$('[data-rise]', root)
        .slice(0, 10)
        .forEach((el, i) =>
          el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], {
            duration: 420,
            delay: 40 + i * 45,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'backwards',
          })
        );
  }

  let holdUntil = 0;
  D.router = {
    get route() {
      return current;
    },
    parse() {
      const h = location.hash.replace(/^#\/?/, '').split('?')[0];
      return D.views[h] ? h : 'inicio';
    },
    go(id) {
      location.hash = '#/' + id;
    },
    /* Evita repintar la pantalla mientras un ajuste ya actualizó el DOM por su cuenta */
    hold(ms = 400) {
      holdUntil = performance.now() + ms;
    },
    render({ animate = false, force = false } = {}) {
      if (!force && performance.now() < holdUntil) return shell.badges();
      const id = D.router.parse();
      const v = D.views[id];
      const root = $('#view');
      const changed = id !== current;
      const sy = window.scrollY;
      if (changed && current) scrolls[current] = sy;
      root.innerHTML = v.render();
      shell.update(id);
      v.mount && v.mount(root);
      bindNavbar(root);
      if (changed) {
        current = id;
        window.scrollTo(0, scrolls[id] || 0);
        D.ui.countUp(root);
        animateIn(root);
        document.title = `${v.title || ''} · ${D.data.settings.name}`;
        if (animate !== 'quiet') $('#main').focus({ preventScroll: true });
      } else {
        window.scrollTo(0, sy);
      }
    },
  };

  /* ==========================================================================
     Instalación (PWA)
     ========================================================================== */
  let deferredInstall = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  D.install = {
    get available() {
      return !!deferredInstall;
    },
    get standalone() {
      return isStandalone();
    },
    get ios() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    $$('.nav-install').forEach((b) => (b.hidden = false));
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    $$('.nav-install').forEach((b) => (b.hidden = true));
    D.toast('¡Dulza instalada!');
  });
  D.act['app.install'] = async () => {
    if (deferredInstall) {
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      $$('.nav-install').forEach((b) => (b.hidden = true));
    } else D.installHelp();
  };
  D.installHelp = () => {
    const ios = D.install.ios;
    D.sheet.open({
      title: 'Instalar Dulza',
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
      left: false,
      body: `<div class="stack pad">
        <div class="center">${D.art.mascot({ size: 96, cls: 'mascot--alive' })}</div>
        ${D.install.standalone ? '<p class="center">Ya estás usando Dulza como app. 🎉</p>' : ios
          ? `<ol class="steps">
              <li><b>Abre Dulza en Safari</b> (debe ser Safari, no otro navegador).</li>
              <li>Toca el botón <b>Compartir</b> ${D.icon('share', 'i--inline')} de la barra inferior.</li>
              <li>Elige <b>«Agregar a pantalla de inicio»</b>.</li>
              <li>Toca <b>Agregar</b>. ¡Listo! Abrirá a pantalla completa y funciona sin internet.</li></ol>`
          : `<ol class="steps">
              <li>En <b>Chrome o Edge</b>, abre el menú del navegador (⋮).</li>
              <li>Elige <b>«Instalar Dulza»</b> o <b>«Agregar a pantalla de inicio»</b>.</li>
              <li>Se abrirá como una app, con su propio ícono y sin la barra del navegador.</li></ol>`}
      </div>`,
    });
  };

  /* ==========================================================================
     Atajos de teclado (solo equipos con teclado y puntero fino)
     ========================================================================== */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    if (D.sheet.top() || document.querySelector('dialog[open]')) return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      (e.shiftKey ? D.act['purchase.new'] : D.act['sale.new'])?.();
    } else if (e.key === '/') {
      const s = $('.search input');
      if (s) {
        e.preventDefault();
        s.focus();
      }
    }
  });

  /* ==========================================================================
     Arranque
     ========================================================================== */
  async function boot() {
    await D.store.init();
    D.theme.init();
    // nada de la app se dibuja hasta que se entra con usuario y clave
    if (D.auth) await D.auth.gate();
    shell.build();

    let sig = '';
    D.store.on(() => {
      const S = D.data.settings;
      const s = [S.brand, S.accent, S.theme, S.logo ? 1 : 0, S.name].join('|');
      if (s !== sig) {
        sig = s;
        D.theme.apply();
        shell.build();
      }
      D.router.render();
    });
    sig = [D.data.settings.brand, D.data.settings.accent, D.data.settings.theme, D.data.settings.logo ? 1 : 0, D.data.settings.name].join('|');

    window.addEventListener('hashchange', () => D.router.render({ force: true }));
    if (!location.hash) history.replaceState(null, '', '#/inicio');
    D.router.render({ force: true });
    document.documentElement.classList.add('ready');

    // Acción directa desde un acceso rápido del ícono (?action=nueva-venta)
    const action = new URLSearchParams(location.search).get('action');
    if (action) {
      history.replaceState(null, '', location.pathname + location.hash);
      const map = { 'nueva-venta': 'sale.new', 'nueva-compra': 'purchase.new', cobros: null };
      if (action === 'cobros') D.router.go('cobros');
      else if (map[action]) setTimeout(() => D.act[map[action]] && D.act[map[action]](), 350);
    }

    if (!D.data.settings.onboarded && D.onboarding) setTimeout(() => D.onboarding.open(), 250);
    // recordatorio, una vez por sesión, mientras siga la clave por defecto
    if (D.auth && D.auth.usingDefault() && !sessionStorage.getItem('dulza-claveaviso')) {
      sessionStorage.setItem('dulza-claveaviso', '1');
      setTimeout(() => D.toast('Sigues con la clave por defecto: cámbiala en Ajustes → Seguridad', { tone: 'info', icon: 'shield' }), 2400);
    }

    registerWorker();
  }

  /* Service worker: funciona sin internet y avisa si hay una versión nueva */
  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (location.protocol === 'file:' || (local && !location.search.includes('sw'))) return;
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        const notify = (worker) =>
          D.toast('Hay una versión nueva de Dulza', {
            tone: 'info',
            icon: 'sparkle',
            action: {
              label: 'Actualizar',
              fn: () => {
                worker.postMessage('skipWaiting');
              },
            },
          });
        if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w &&
            w.addEventListener('statechange', () => {
              if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w);
            });
        });
      })
      .catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
