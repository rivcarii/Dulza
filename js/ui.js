/* Dulza · componentes de interfaz: hojas (sheets), alertas, avisos, selectores y plantillas */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;

  D.act = {}; // acciones [data-act]
  D.inp = {}; // entradas [data-input]
  D.chg = {}; // cambios [data-change]
  D.seg = {}; // controles segmentados [data-seg]
  D.views = {};

  /* ==========================================================================
     Delegación de eventos
     ========================================================================== */
  document.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-seg] button');
    if (seg) {
      const box = seg.closest('[data-seg]');
      const btns = $$('button', box);
      btns.forEach((b) => b.setAttribute('aria-pressed', b === seg ? 'true' : 'false'));
      box.style.setProperty('--i', btns.indexOf(seg));
      const fn = D.seg[box.dataset.seg];
      fn && fn(seg.dataset.v, box, seg);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && !act.disabled) {
      const fn = D.act[act.dataset.act];
      if (fn) {
        if (act.tagName !== 'A') e.preventDefault();
        fn(act, e);
      }
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      D.sheet.closeAll();
      location.hash = '#/' + go.dataset.go;
    }
  });
  /* Filas con role="button": Enter / Espacio las activan */
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) {
      e.preventDefault();
      e.target.click();
    }
  });
  document.addEventListener('input', (e) => {
    const t = e.target.closest('[data-input]');
    if (t && D.inp[t.dataset.input]) D.inp[t.dataset.input](t, e);
  });
  document.addEventListener('change', (e) => {
    const t = e.target.closest('[data-change]');
    if (t && D.chg[t.dataset.change]) D.chg[t.dataset.change](t, e);
  });

  /* ==========================================================================
     Plantillas pequeñas
     ========================================================================== */
  const ui = (D.ui = { state: {} });

  ui.avatar = (name, cls = '') => `<span class="avatar ${cls}" style="--h:${D.hue(name)}" aria-hidden="true">${esc(D.initials(name))}</span>`;
  ui.emoji = (e, cls = '', crown = false) => `<span class="avatar avatar--emoji ${cls}" aria-hidden="true">${D.glyph(e)}${crown ? D.icon('crown', 'crown') : ''}</span>`;
  ui.chip = (tone, label, icon) => `<span class="chip chip--${tone}">${icon ? D.icon(icon) : ''}${esc(label)}</span>`;
  ui.statusChip = (key) => ui.chip(D.STATUS[key].tone, D.STATUS[key].label);

  /* Texto de vencimiento: "vence en 5 días" / "venció hace 3 días" */
  ui.dueText = (doc, balance) => {
    if (!doc.due) return '';
    if (balance <= 0) return '';
    const n = D.diffDays(doc.due, D.today());
    if (n < 0) return `venció ${D.relDay(doc.due)}`;
    if (n === 0) return 'vence hoy';
    return `vence ${D.relDay(doc.due)}`;
  };

  ui.empty = ({ title, text, cta, act, mood = 'happy', compact = false, art = '' }) => `
    <div class="empty ${compact ? 'empty--compact' : ''}">
      <div class="empty__art">${art && D.gpt && D.gpt.stickers[art] ? `<img class="empty__sticker mascot--alive" src="${D.gpt.url(D.gpt.stickers[art])}" alt="" decoding="async">` : D.art.mascot({ size: compact ? 84 : 120, mood, cls: 'mascot--alive' })}</div>
      <h3 class="empty__title">${esc(title)}</h3>
      ${text ? `<p class="empty__text">${esc(text)}</p>` : ''}
      ${cta ? `<button class="btn" data-act="${act}">${D.icon('plus')}${esc(cta)}</button>` : ''}
    </div>`;

  /* Control segmentado: opts = [[valor, etiqueta], ...] */
  ui.seg = (name, opts, value) => {
    const idx = Math.max(0, opts.findIndex((o) => o[0] === value));
    return `<div class="seg" role="group" data-seg="${name}" style="--n:${opts.length};--i:${idx}">${opts
      .map((o) => `<button type="button" data-v="${o[0]}" aria-pressed="${o[0] === value}">${typeof o[1] === 'object' ? o[1].html : esc(o[1])}</button>`)
      .join('')}</div>`;
  };

  ui.search = (name, value, placeholder = 'Buscar') => `
    <label class="search">${D.icon('search')}<input type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(placeholder)}" value="${esc(value || '')}" data-input="${name}" aria-label="${esc(placeholder)}"></label>`;

  ui.page = ({ title, sub, kicker, left = '', actions = '', body = '', fab = '', cls = '' }) => `
    <div class="navbar" data-navbar><div class="navbar__in">
      <div class="navbar__side">${left}</div>
      <div class="navbar__title" aria-hidden="true">${esc(title)}</div>
      <div class="navbar__side navbar__side--end">${actions}</div>
    </div></div>
    <div class="page ${cls}">
      <header class="page__head">
        ${kicker ? `<p class="page__kicker">${kicker}</p>` : ''}
        <h1 class="page__title">${esc(title)}</h1>
        ${sub ? `<p class="page__sub">${sub}</p>` : ''}
      </header>
      ${body}
    </div>${fab}`;

  ui.fab = (act, label, icon = 'plus') =>
    `<button class="fab" data-act="${act}" aria-label="${esc(label)}">${D.icon(icon)}<span>${esc(label)}</span></button>`;

  /* Cuenta animada para cifras destacadas (una sola vez por sesión) */
  ui.countUp = (root) => {
    if (D.reduceMotion()) return;
    $$('[data-count]', root).forEach((el) => {
      const to = parseFloat(el.dataset.count);
      const key = el.dataset.countKey;
      if (key && ui.state['_c_' + key]) return;
      if (key) ui.state['_c_' + key] = true;
      const t0 = performance.now(), dur = 700;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = D.moneyC(to * e);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = D.moneyC(to);
      };
      requestAnimationFrame(step);
    });
  };

  /* Lectura de formularios: <input name> con data-money / type=number */
  ui.read = (root) => {
    const out = {};
    $$('[name]', root).forEach((el) => {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.dataset.money !== undefined || el.type === 'number') out[el.name] = D.parseNum(el.value);
      else out[el.name] = el.value.trim();
    });
    return out;
  };
  /* Formato de dinero al salir del campo */
  document.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('[data-money]') && t.value.trim() !== '') t.value = D.fmtNum(D.parseNum(t.value));
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches('[data-money]') && D.parseNum(t.value) === 0) t.value = '';
    else if (t && t.matches && t.matches('[data-money],[data-select-all]')) setTimeout(() => t.select && t.select(), 0);
  });

  /* ==========================================================================
     Resorte (para soltar una hoja arrastrada conservando la velocidad)
     ========================================================================== */
  function spring(from, to, velocity, set, done, response = 0.34) {
    const w = (2 * Math.PI) / response, k = w * w, c = 2 * w; // amortiguado crítico
    let x = from, v = velocity, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) {
        v += (-k * (x - to) - c * v) * h;
        x += v * h;
      }
      set(x);
      if (Math.abs(x - to) < 0.5 && Math.abs(v) < 10) {
        set(to);
        done && done();
      } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const rubber = (over, dim) => (over * dim * 0.55) / (dim + 0.55 * Math.abs(over));

  /* ==========================================================================
     Hojas (sheets): inferior en teléfono, tarjeta centrada en pantallas grandes
     ========================================================================== */
  const stack = [];

  D.sheet = {
    stack,
    open(o = {}) {
      const dlg = document.createElement('dialog');
      dlg.className = 'sheet' + (o.className ? ' ' + o.className : '');
      dlg.dataset.size = o.size || 'auto';
      if (o.wide) dlg.dataset.wide = '1';
      dlg.setAttribute('aria-label', o.title || 'Ventana');
      const left = o.left === false ? '<span class="sheet__spacer"></span>' : `<button class="icon-btn glass" data-sheet="close" aria-label="Cerrar">${D.icon('x')}</button>`;
      const right = o.right
        ? `<button class="btn btn--sm ${o.right.cls || ''}" data-sheet="primary" ${o.right.disabled ? 'disabled' : ''}>${esc(o.right.label)}</button>`
        : '<span class="sheet__spacer"></span>';
      dlg.innerHTML = `<div class="sheet__scrim"></div>
        <div class="sheet__panel">
          <div class="sheet__head" data-drag>
            <span class="sheet__grab" aria-hidden="true"></span>
            <div class="sheet__bar">${left}<h2 class="sheet__title">${esc(o.title || '')}</h2>${right}</div>
          </div>
          <div class="sheet__body">${o.body || ''}</div>
          ${o.footer ? `<div class="sheet__foot">${o.footer}</div>` : ''}
        </div>`;

      const panel = $('.sheet__panel', dlg), scrim = $('.sheet__scrim', dlg), head = $('.sheet__head', dlg);
      const opener = document.activeElement;
      let finished = false;

      const ctrl = {
        el: dlg,
        panel,
        dirty: false,
        closed: false,
        get body() {
          return $('.sheet__body', dlg);
        },
        get foot() {
          return $('.sheet__foot', dlg);
        },
        $: (s) => $(s, dlg),
        $$: (s) => $$(s, dlg),
        setTitle: (t) => ($('.sheet__title', dlg).textContent = t),
        setBody: (h) => ($('.sheet__body', dlg).innerHTML = h),
        setFooter(h) {
          let f = $('.sheet__foot', dlg);
          if (!f) {
            f = document.createElement('div');
            f.className = 'sheet__foot';
            panel.appendChild(f);
          }
          f.innerHTML = h;
        },
        setPrimary(label, disabled) {
          const b = $('[data-sheet="primary"]', dlg);
          if (!b) return;
          if (label != null) b.textContent = label;
          if (disabled != null) b.disabled = disabled;
        },
        /* Cierra con animación (o pregunta antes si hay cambios sin guardar) */
        request(reason = 'close') {
          if (ctrl.closed) return;
          if (ctrl.dirty && reason !== 'force') {
            D.confirm({ title: '¿Descartar cambios?', message: 'Lo que no has guardado se perderá.', ok: 'Descartar', cancel: 'Seguir editando', danger: true }).then((ok) => ok && ctrl.close('force'));
          } else ctrl.close(reason);
        },
        close(reason = 'close', instant = false) {
          if (ctrl.closed) return;
          ctrl.closed = true;
          dlg.classList.remove('is-open');
          dlg.classList.add('is-closing');
          const finish = () => {
            if (finished) return;
            finished = true;
            try { dlg.close(); } catch (e) {}
            dlg.remove();
            const i = stack.indexOf(ctrl);
            if (i > -1) stack.splice(i, 1);
            const top = stack[stack.length - 1];
            if (top) top.el.classList.remove('is-behind');
            else document.documentElement.classList.remove('has-sheet');
            if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
            o.onClose && o.onClose(reason, ctrl);
          };
          if (instant || D.reduceMotion()) return finish();
          panel.addEventListener('transitionend', (e) => e.target === panel && e.propertyName !== 'opacity' && finish());
          setTimeout(finish, 560);
        },
      };

      dlg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sheet]');
        if (b && dlg.contains(b)) {
          if (b.dataset.sheet === 'close') ctrl.request('close');
          else if (b.dataset.sheet === 'primary') o.right && o.right.onClick && o.right.onClick(ctrl, b);
        }
        if (e.target === scrim && o.dismissible !== false) ctrl.request('backdrop');
      });
      dlg.addEventListener('cancel', (e) => {
        e.preventDefault();
        if (o.dismissible !== false) ctrl.request('esc');
      });
      dlg.addEventListener('input', () => o.trackDirty !== false && (ctrl.dirty = !!o.form));

      /* Arrastrar para cerrar (solo teléfono): 1:1 con el dedo, velocidad al soltar */
      head.addEventListener('pointerdown', (e) => {
        if (!D.isCompact() || e.target.closest('button') || o.dismissible === false) return;
        const startY = e.clientY;
        const h = panel.offsetHeight;
        let y = 0, samples = [{ t: e.timeStamp, y: e.clientY }];
        try { head.setPointerCapture(e.pointerId); } catch (err) {}
        panel.style.transition = 'none';
        scrim.style.transition = 'none';
        const move = (ev) => {
          const dy = ev.clientY - startY;
          y = dy > 0 ? dy : rubber(dy, h);
          panel.style.transform = `translateY(${y}px)`;
          scrim.style.opacity = String(1 - Math.min(1, Math.max(0, y) / h));
          samples.push({ t: ev.timeStamp, y: ev.clientY });
          if (samples.length > 6) samples.shift();
        };
        const up = (ev) => {
          try { head.releasePointerCapture(ev.pointerId); } catch (err) {}
          head.removeEventListener('pointermove', move);
          head.removeEventListener('pointerup', up);
          head.removeEventListener('pointercancel', up);
          // velocidad en los últimos 100 ms antes de soltar (si el dedo estaba quieto, es 0)
          samples.push({ t: ev.timeStamp, y: ev.clientY });
          const recent = samples.filter((s) => ev.timeStamp - s.t <= 100);
          const a = recent[0], b = recent[recent.length - 1];
          const v = recent.length > 1 && b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0; // px/s
          const projected = y + v * 0.499; // (v/1000)·d/(1−d), d = 0.998
          const dismiss = y > 0 && (projected > h * 0.5 || v > 900) && ev.type !== 'pointercancel';
          if (dismiss && !(ctrl.dirty)) {
            ctrl.closed = true;
            spring(y, h + 40, v, (val) => (panel.style.transform = `translateY(${val}px)`), () => {
              ctrl.closed = false;
              ctrl.close('drag', true);
            });
            scrim.style.transition = 'opacity 300ms var(--ease-out)';
            scrim.style.opacity = '0';
          } else {
            spring(y, 0, v, (val) => (panel.style.transform = `translateY(${val}px)`), () => {
              panel.style.transition = '';
              panel.style.transform = '';
            });
            scrim.style.transition = '';
            scrim.style.opacity = '';
            if (dismiss && ctrl.dirty) ctrl.request('drag');
          }
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        head.addEventListener('pointercancel', up);
      });

      const prev = stack[stack.length - 1];
      if (prev) prev.el.classList.add('is-behind');
      stack.push(ctrl);
      document.documentElement.classList.add('has-sheet');
      document.body.appendChild(dlg);
      dlg.showModal();
      if (o.focus !== false) {
        const first = $('[data-autofocus]', dlg);
        if (first) first.focus({ preventScroll: true });
        else {
          // el foco va al panel (sin anillo), no al primer botón: así «Listo» o la «X» no aparecen rodeados por un aro
          panel.setAttribute('tabindex', '-1');
          panel.focus({ preventScroll: true });
        }
      }
      // dos frames: el navegador debe pintar el estado inicial antes de animar
      requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
      o.onMount && o.onMount(ctrl);
      return ctrl;
    },
    closeAll() {
      stack.slice().forEach((s) => s.close('nav', true));
    },
    top: () => stack[stack.length - 1],
  };

  /* ==========================================================================
     Alerta / confirmación (estilo iOS)
     ========================================================================== */
  D.confirm = ({ title, message = '', ok = 'Aceptar', cancel = 'Cancelar', danger = false, single = false }) =>
    new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'alert';
      dlg.setAttribute('aria-label', title);
      dlg.innerHTML = `<div class="alert__scrim"></div><div class="alert__card" role="alertdialog">
        <div class="alert__mood">${D.mood(danger ? 'wow' : single ? 'think' : 'happy')}</div>
        <h2 class="alert__title">${esc(title)}</h2>${message ? `<p class="alert__msg">${esc(message)}</p>` : ''}
        <div class="alert__btns">${single ? '' : `<button class="btn btn--plain" data-v="0">${esc(cancel)}</button>`}<button class="btn ${danger ? 'btn--bad' : ''}" data-v="1" data-autofocus>${esc(ok)}</button></div></div>`;
      let result = false, closed = false;
      const done = (v) => {
        if (closed) return;
        closed = true;
        result = v;
        dlg.classList.remove('is-open');
        const fin = () => { try { dlg.close(); } catch (e) {} dlg.remove(); resolve(result); };
        D.reduceMotion() ? fin() : setTimeout(fin, 200);
      };
      dlg.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (b) done(b.dataset.v === '1');
        else if (!e.target.closest('.alert__card')) done(false);
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
      document.body.appendChild(dlg);
      dlg.showModal();
      requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
      $('[data-v="1"]', dlg).focus({ preventScroll: true });
    });
  D.alert = (title, message) => D.confirm({ title, message, single: true, ok: 'Entendido' });

  /* Botón ocupado: muestra un indicador y no deja tocarlo dos veces mientras dura la tarea (promesa) */
  D.busy = (el, task) => {
    if (!el) return Promise.resolve(task);
    el.classList.add('is-busy');
    el.setAttribute('aria-busy', 'true');
    const done = () => { el.classList.remove('is-busy'); el.removeAttribute('aria-busy'); };
    return Promise.resolve(task).then((v) => { done(); return v; }, (e) => { done(); throw e; });
  };

  /* ==========================================================================
     Avisos (toasts)
     ========================================================================== */
  let toastEl = null, toastTimer = 0;
  D.toast = (msg, o = {}) => {
    const host = $('#toasts');
    if (!host) return;
    const tone = o.tone || 'ok';
    const icon = o.icon || (tone === 'bad' ? 'alert' : tone === 'info' ? 'info' : 'checkCircle');
    // sin ícono propio, el aviso lleva la cara de la mascota según el tono
    const lead = o.icon ? D.icon(icon) : D.mood({ ok: 'happy', bad: 'sad', info: 'think' }[tone] || 'happy', { cls: 'toast__mood' });
    const old = toastEl;
    if (old) dismiss(old);
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    el.innerHTML = `${lead}<span class="toast__msg">${esc(msg)}</span>${o.action ? `<button class="toast__act" type="button">${esc(o.action.label)}</button>` : ''}`;
    if (o.action)
      $('.toast__act', el).addEventListener('click', () => {
        dismiss(el);
        o.action.fn && o.action.fn();
      });
    host.appendChild(el);
    try {
      host.hidePopover && host.hidePopover();
      host.showPopover && host.showPopover();
    } catch (e) {}
    toastEl = el;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dismiss(el), o.action ? 6000 : 3200);
    if (tone === 'ok') D.haptic(10);
  };
  function dismiss(el) {
    if (!el || el._gone) return;
    el._gone = true;
    el.classList.remove('is-in');
    if (toastEl === el) toastEl = null;
    setTimeout(() => {
      el.remove();
      const host = $('#toasts');
      if (host && !host.children.length) try { host.hidePopover && host.hidePopover(); } catch (e) {}
    }, D.reduceMotion() ? 0 : 320);
  }

  /* ==========================================================================
     Selector con búsqueda (cliente, proveedor, etc.)
     items: [{id, title, sub, end, lead}]
     ========================================================================== */
  D.pick = ({ title, items, selected, searchable = true, newLabel, onNew, empty = 'Sin resultados' }) =>
    new Promise((resolve) => {
      let chosen = null;
      const row = (it) => `<button type="button" class="row row--tap" data-pick="${esc(it.id)}" data-text="${esc((it.title + ' ' + (it.sub || '')).toLowerCase())}">
        ${it.lead || ''}
        <span class="row__main"><span class="row__title">${esc(it.title)}</span>${it.sub ? `<span class="row__sub">${esc(it.sub)}</span>` : ''}</span>
        ${it.id === selected ? `<span class="row__check">${D.icon('check')}</span>` : it.end ? `<span class="row__end">${it.end}</span>` : ''}
      </button>`;
      const body = `${searchable && items.length > 6 ? `<div class="sheet__search">${ui.search('pick.q', '', 'Buscar')}</div>` : ''}
        ${newLabel ? `<div class="list list--spaced"><button type="button" class="row row--tap row--action" data-pick-new>${`<span class="avatar avatar--tint">${D.icon('plus')}</span>`}<span class="row__main"><span class="row__title">${esc(newLabel)}</span></span></button></div>` : ''}
        <div class="list" id="pick-list">${items.map(row).join('')}</div>
        <p class="muted center pad" id="pick-empty" hidden>${esc(empty)}</p>`;
      const sh = D.sheet.open({
        title,
        body,
        size: items.length > 8 ? 'large' : 'auto',
        onClose: () => resolve(chosen),
      });
      const filter = (q) => {
        q = q.trim().toLowerCase();
        let n = 0;
        $$('[data-pick]', sh.el).forEach((b) => {
          const hit = !q || b.dataset.text.includes(q);
          b.hidden = !hit;
          if (hit) n++;
        });
        $('#pick-empty', sh.el).hidden = n > 0;
      };
      D.inp['pick.q'] = (el) => filter(el.value);
      sh.el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-pick]');
        if (b) {
          chosen = b.dataset.pick;
          sh.close('pick');
          return;
        }
        if (e.target.closest('[data-pick-new]') && onNew) {
          const created = await onNew();
          if (created) {
            chosen = created;
            sh.close('pick');
          }
        }
      });
    });

  /* Menú de acciones (action sheet) */
  D.menu = (title, actions) =>
    new Promise((resolve) => {
      const sh = D.sheet.open({
        title,
        left: false,
        right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
        body: `<div class="list">${actions
          .map((a, i) => `<button type="button" class="row row--tap ${a.tone === 'bad' ? 'row--bad' : ''}" data-i="${i}"><span class="row__icon">${D.icon(a.icon || 'chevR')}</span><span class="row__main"><span class="row__title">${esc(a.label)}</span>${a.sub ? `<span class="row__sub">${esc(a.sub)}</span>` : ''}</span></button>`)
          .join('')}</div>`,
        onClose: () => resolve(),
      });
      sh.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        const a = actions[+b.dataset.i];
        sh.close('menu');
        setTimeout(() => a.fn && a.fn(), D.reduceMotion() ? 0 : 120);
      });
    });
})();
