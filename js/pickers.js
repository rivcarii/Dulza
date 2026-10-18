/* Dulza · listas desplegables y calendario con la apariencia de la app
   Los <select> y los <input type="date"> del navegador abren un menú «de fábrica» que no se parece a Dulza. Aquí se
   interceptan: al tocar el campo se abre una hoja de Dulza (lista con la opción marcada, o un calendario) y el valor se
   escribe en el mismo campo, así que el resto de la app (formularios, filtros) funciona igual que antes.
   El campo original sigue en la página (accesible con teclado y lectores de pantalla); solo deja de abrir el menú nativo. */
(function () {
  'use strict';
  const D = window.D;
  const { esc } = D;

  const labelOf = (el) => {
    const f = el.closest('.field');
    const s = f && f.querySelector(':scope > span:first-child');
    if (s && s.textContent.trim()) return s.textContent.trim();
    const sr = el.closest('.select-pill') && el.closest('.select-pill').querySelector('.sr-only');
    return (sr && sr.textContent.trim()) || el.getAttribute('aria-label') || 'Elegir';
  };
  const fire = (el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /* ---------- Lista de opciones ---------- */
  function openSelect(sel) {
    const opts = [...sel.options].map((o, i) => ({ i, v: o.value, t: o.textContent.trim(), on: o.selected, off: o.disabled || o.hidden })).filter((o) => !o.off);
    const many = opts.length > 10;
    const row = (o) => `<button type="button" class="row row--tap row--noavatar pk-opt" role="option" aria-selected="${o.on}" data-i="${o.i}"><span class="row__main"><span class="row__title">${esc(o.t || '—')}</span></span><span class="pk-opt__ck">${o.on ? D.icon('check') : ''}</span></button>`;
    const sh = D.sheet.open({
      title: labelOf(sel),
      trackDirty: false,
      size: many ? 'large' : undefined,
      body: `${many ? `<label class="search pk-search">${D.icon('search')}<input type="search" placeholder="Buscar" autocomplete="off" aria-label="Buscar en la lista"></label>` : ''}<div class="list pk-list" role="listbox" aria-label="${esc(labelOf(sel))}">${opts.map(row).join('')}</div>`,
    });
    const list = sh.$('.pk-list');
    const cur = sh.$('[aria-selected="true"]');
    cur && setTimeout(() => cur.scrollIntoView({ block: 'center' }), 60);
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('.pk-opt');
      if (!b) return;
      sel.selectedIndex = +b.dataset.i;
      fire(sel);
      D.haptic && D.haptic(6);
      sh.close();
    });
    const q = sh.$('.pk-search input');
    q && q.addEventListener('input', () => {
      const n = q.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      list.querySelectorAll('.pk-opt').forEach((b) => (b.hidden = !!n && !b.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(n)));
    });
  }

  /* ---------- Calendario ---------- */
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  function openDate(inp) {
    const today = D.today();
    const start = inp.value || today;
    let y = +start.slice(0, 4), m = +start.slice(5, 7) - 1, mode = 'days';
    const min = inp.min || '', max = inp.max || '';
    const sh = D.sheet.open({ title: labelOf(inp), trackDirty: false, body: '<div class="cal"></div>', footer: '' });
    const pick = (v) => {
      inp.value = v;
      fire(inp);
      D.haptic && D.haptic(6);
      sh.close();
    };
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    // animación suave al cambiar de mes o de vista (solo opacidad y un pequeño desplazamiento)
    const flash = (dir) => {
      const el = sh.$('.cal__body');
      if (!el || D.reduceMotion()) return;
      el.animate([{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    };
    function draw(dir = 0) {
      let inner = '';
      if (mode === 'months') {
        inner = `<div class="cal__months">${D.MONTHS_L.map((n, i) => `<button type="button" class="cal__m${i === m ? ' is-sel' : ''}" data-m="${i}">${cap(n)}</button>`).join('')}</div>`;
      } else {
        const first = new Date(y, m, 1);
        const off = (first.getDay() + 6) % 7; // semana desde el lunes
        const days = new Date(y, m + 1, 0).getDate();
        let cells = '';
        for (let i = 0; i < off; i++) cells += '<i class="cal__e"></i>';
        for (let d = 1; d <= days; d++) {
          const v = iso(y, m, d);
          const dis = (min && v < min) || (max && v > max);
          cells += `<button type="button" class="cal__d${v === inp.value ? ' is-sel' : ''}${v === today ? ' is-today' : ''}" data-v="${v}" ${dis ? 'disabled' : ''} aria-label="${d} de ${D.MONTHS_L[m]} de ${y}" ${v === inp.value ? 'aria-pressed="true"' : ''}>${d}</button>`;
        }
        inner = `<div class="cal__wk" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cal__grid">${cells}</div>`;
      }
      const title = mode === 'months' ? String(y) : `${cap(D.MONTHS_L[m])} ${y}`;
      const step = mode === 'months' ? 12 : 1;
      sh.setBody(`<div class="cal">
        <div class="cal__nav"><button type="button" class="icon-btn icon-btn--sm" data-step="${-12}" aria-label="Año anterior">«</button><button type="button" class="icon-btn icon-btn--sm" data-step="${-step}" aria-label="${mode === 'months' ? 'Año anterior' : 'Mes anterior'}">${D.icon('chevR', 'cal__prev')}</button>
          <button type="button" class="cal__title" data-mode aria-label="Elegir mes y año" aria-live="polite">${title}<span class="cal__caret">${D.icon('chevD')}</span></button>
          <button type="button" class="icon-btn icon-btn--sm" data-step="${step}" aria-label="${mode === 'months' ? 'Año siguiente' : 'Mes siguiente'}">${D.icon('chevR')}</button><button type="button" class="icon-btn icon-btn--sm" data-step="12" aria-label="Año siguiente">»</button></div>
        <div class="cal__body">${inner}</div>
        <div class="cal__foot"><button type="button" class="btn btn--tint btn--sm" data-today>Hoy</button>${!inp.required && inp.value ? '<button type="button" class="btn btn--plain btn--sm" data-clear>Borrar fecha</button>' : ''}</div></div>`);
      dir && flash(dir);
    }
    draw();
    sh.el.addEventListener('click', (e) => {
      const g = e.target.closest('[data-step]');
      if (g) {
        const n = +g.dataset.step;
        const t = m + n;
        y += Math.floor(t / 12);
        m = ((t % 12) + 12) % 12;
        if (mode === 'months') m = m; // en la vista de meses solo cambia el año
        draw(n > 0 ? 1 : -1);
        return;
      }
      if (e.target.closest('[data-mode]')) {
        mode = mode === 'days' ? 'months' : 'days';
        draw(0);
        const el = sh.$('.cal__body');
        el && !D.reduceMotion() && el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
        return;
      }
      const mm = e.target.closest('.cal__m');
      if (mm) {
        m = +mm.dataset.m;
        mode = 'days';
        draw(1);
        return;
      }
      const d = e.target.closest('.cal__d');
      if (d && !d.disabled) return pick(d.dataset.v);
      if (e.target.closest('[data-today]')) return pick(today);
      if (e.target.closest('[data-clear]')) return pick('');
    });
    // deslizar el dedo sobre el calendario cambia de mes
    let x0 = null;
    sh.el.addEventListener('pointerdown', (e) => { x0 = e.target.closest('.cal__body') && mode === 'days' ? e.clientX : null; });
    sh.el.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 60) return;
      const t = m + (dx < 0 ? 1 : -1);
      y += Math.floor(t / 12);
      m = ((t % 12) + 12) % 12;
      draw(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Interceptores ---------- */
  const control = (t) => {
    const h = t.closest && t.closest('label.field, .select-pill');
    if (!h) return null;
    const c = h.querySelector('select, input[type="date"]');
    return c && !c.disabled ? c : null;
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('dialog.pkblock')) return;
    const c = control(e.target);
    if (!c) return;
    e.preventDefault();
    c.tagName === 'SELECT' ? openSelect(c) : openDate(c);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('select, input[type="date"]') && e.target.closest('label.field, .select-pill')) {
      e.preventDefault();
      e.target.tagName === 'SELECT' ? openSelect(e.target) : openDate(e.target);
    }
  });
  // evita que el menú nativo se abra con el ratón o el dedo en los campos de Dulza
  document.addEventListener('mousedown', (e) => { if (control(e.target)) e.preventDefault(); }, true);

  /* El campo de fecha del navegador muestra «dd/mm/aaaa» con su propio icono: se tapa con un texto de Dulza
     («17 oct», o «Elegir fecha» si está vacío) que se actualiza solo. */
  const showDate = (inp) => {
    const f = inp.closest('label.field');
    if (f) f.dataset.show = inp.value ? D.fmtDate(inp.value) : 'Elegir fecha';
  };
  const syncDates = (root = document) => root.querySelectorAll('label.field > input[type="date"]').forEach(showDate);
  new MutationObserver(() => syncDates()).observe(document.documentElement, { childList: true, subtree: true });
  ['input', 'change'].forEach((ev) => document.addEventListener(ev, (e) => e.target.matches && e.target.matches('input[type="date"]') && showDate(e.target), true));
  document.addEventListener('reset', () => setTimeout(syncDates, 0), true);
  syncDates();

  D.pickers = { openSelect, openDate };
})();
