/* Dulza · Dulce, la guía del sistema
   Un bot que vive en la app (sin internet y sin costo): acompaña a la persona nueva con una lista de primeros pasos que se
   marca sola según lo que ya hizo, abre los formularios por ella («Hazlo conmigo») y responde preguntas frecuentes
   con palabras clave. No usa servicios externos ni envía datos a ningún lado. */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const KEY = 'dulza-guide';

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const flag = (k) => !!read()[k];
  const mark = (k, v = true) => { const s = read(); if (!!s[k] === v) return; s[k] = v; write(s); };
  const go = (id) => () => { D.sheet.closeAll(); D.router.go(id); };

  /* Marca «ya envié una factura» cuando se usa el botón de WhatsApp (el envío vive en otro módulo) */
  if (D.wa && D.wa.sendDoc) {
    const orig = D.wa.sendDoc;
    D.wa.sendDoc = function () { mark('sent'); return orig.apply(this, arguments); };
  }

  /* ---------- Primeros pasos: se marcan solos con lo que hay en los datos ---------- */
  const STEPS = [
    { id: 'negocio', t: 'Cuéntame de tu negocio', h: 'Nombre, país y WhatsApp en Ajustes.', done: () => !!D.data.settings.onboarded, run: go('ajustes') },
    { id: 'postre', t: 'Agrega tu primer postre', h: 'Con su precio y su costo.', done: () => D.data.products.length > 0, run: () => D.act['product.new']() },
    { id: 'cliente', t: 'Guarda un cliente', h: 'Con su WhatsApp para enviarle la factura.', done: () => D.data.customers.length > 0, run: () => D.act['customer.new']() },
    { id: 'venta', t: 'Registra tu primera venta', h: 'Elige los postres y el plazo.', done: () => D.data.sales.length > 0, run: () => D.act['sale.new']() },
    { id: 'factura', t: 'Envía una factura por WhatsApp', h: 'Desde la venta, toca «Enviar por WhatsApp».', done: () => flag('sent') || D.data.sales.some((s) => s.waSentAt), run: go('ventas') },
    { id: 'cobro', t: 'Registra un cobro', h: 'En Cobros, toca una venta y «Registrar pago».', done: () => D.data.sales.some((s) => s.term > 0 && (s.payments || []).some((p) => p.note !== 'Abono inicial')), run: go('cobros') },
    { id: 'clave', t: 'Cambia tu clave', h: 'Para que solo entres tú.', done: () => !D.auth.usingDefault(), run: () => D.act['auth.change']() },
    { id: 'respaldo', t: 'Guarda un respaldo', h: 'Un archivo con todos tus datos.', done: () => !!D.data.settings.lastBackup, run: () => D.act['data.export']() },
  ];
  const progress = () => {
    const done = STEPS.filter((s) => s.done());
    return { done: done.length, total: STEPS.length, next: STEPS.find((s) => !s.done()) || null };
  };

  /* ---------- Preguntas frecuentes (palabras clave sin tildes) ---------- */
  const A = (label, fn) => ({ label, fn });
  const KB = [
    { k: ['vender', 'venta', 'facturar', 'nueva venta', 'registrar venta', 'como vendo'], t: '¿Cómo registro una venta?',
      a: ['1. Toca <b>Nueva venta</b> (o la tecla <kbd>N</kbd> en el computador).', '2. Elige el cliente (opcional) y toca <b>Agregar postres</b>.', '3. Escoge el plazo: contado, 8, 15 o 30 días.', '4. Guarda. Te ofrezco enviar la factura por WhatsApp.'],
      b: [A('Nueva venta', () => D.act['sale.new']())] },
    { k: ['cobrar', 'cobro', 'cobros', 'abono', 'pago', 'pagar', 'deuda', 'fiado', 'me deben', 'me debe', 'debe plata', 'plata', 'quien me debe'], t: '¿Cómo cobro?',
      a: ['En <b>Cobros</b> salen las ventas pendientes, las vencidas primero.', 'Toca una venta y luego <b>Registrar pago</b>: completo o un abono. Al cobrar suena una moneda 🪙.'],
      b: [A('Ir a Cobros', go('cobros'))] },
    { k: ['guardar cliente', 'agregar cliente', 'nuevo cliente', 'crear cliente', 'contacto', 'telefono', 'numero de whatsapp'], w: ['cliente', 'clientes'], t: '¿Cómo guardo un cliente?',
      a: ['En <b>Clientes</b> (o el botón <b>Cliente</b> del Inicio) guarda su nombre y su WhatsApp.', 'Con el número guardado, la factura y los recordatorios van directo a su chat.'],
      b: [A('Nuevo cliente', () => D.act['customer.new']())] },
    { k: ['agregar postre', 'nuevo postre', 'crear postre', 'precio', 'costo', 'catalogo', 'menu', 'producto', 'productos'], w: ['postre', 'postres'], t: '¿Cómo agrego postres?',
      a: ['En <b>Postres</b> agrega cada uno con su precio y su <b>costo</b>: el costo sirve para calcular tu ganancia.', 'Puedes elegir un ícono de postre y desactivar los que no estés vendiendo.'],
      b: [A('Nuevo postre', () => D.act['product.new']())] },
    { k: ['whatsapp', 'enviar factura', 'mensaje', 'imagen', 'compartir', 'mandar factura'], t: '¿Cómo envío la factura por WhatsApp?',
      a: ['Desde la venta toca <b>Enviar por WhatsApp</b>.', 'En el <b>celular</b> se abre el menú de compartir con la factura adjunta: eliges WhatsApp y al cliente. En el <b>computador</b> se copia la imagen y se abre el chat: pégala con Ctrl+V.', 'El texto del mensaje se cambia en Ajustes → Mensajes de WhatsApp.'],
      b: [A('Ir a Ventas', go('ventas'))] },
    { k: ['recordatorio', 'recordar', 'vencida', 'vencidas', 'atrasado', 'atrasada', 'moroso'], t: '¿Cómo recuerdo un cobro?',
      a: ['En <b>Cobros</b> abre una venta vencida y toca <b>Recordar</b>: sale un mensaje amable con el saldo y la fecha.', 'También puedes recordarle a un cliente desde su ficha.'],
      b: [A('Ir a Cobros', go('cobros'))] },
    { k: ['ganancia', 'ganancias', 'ganado', 'gane', 'utilidad', 'cuanto gano', 'reporte', 'reportes', 'vendido', 'cobrado', 'resumen', 'cifras'], t: '¿Dónde veo mis ganancias?',
      a: ['En <b>Inicio</b> están Ventas, Cobrado, Compras y Ganancia. Cambia el periodo con <b>Este mes / Mes pasado / Todo</b>.', 'En <b>Reportes</b> ves tus mejores clientes y postres, y la cartera vencida. La ganancia es lo vendido menos el costo de cada postre.'],
      b: [A('Ir a Reportes', go('reportes'))] },
    { k: ['compra', 'compras', 'insumos', 'proveedor', 'proveedores', 'gasto', 'gastos'], t: '¿Cómo registro mis compras?',
      a: ['Anota tus insumos en <b>Compras</b> (<kbd>Shift</kbd>+<kbd>N</kbd> en el computador) y tus proveedores en <b>Proveedores</b>.', 'Así tu ganancia descuenta lo que gastas.'],
      b: [A('Nueva compra', () => D.act['purchase.new']())] },
    { k: ['respaldo', 'copia', 'backup', 'perder datos', 'guardar datos', 'mis datos'], t: '¿Cómo cuido mis datos?',
      a: ['Tus datos viven en este dispositivo y, si conectas la nube, también en la nube compartida.', '<b>Ajustes → Respaldo → Guardar respaldo</b> descarga un archivo con todo. Hazlo de vez en cuando.'],
      b: [A('Guardar respaldo', () => D.act['data.export']())] },
    { k: ['nube', 'compartir datos', 'socia', 'otra persona', 'sincronizar', 'dos celulares', 'dispositivo', 'varios dispositivos'], t: '¿Cómo comparto los datos con otra persona?',
      a: ['En <b>Ajustes → Datos compartidos</b> conecta tu cuenta: las dos personas ven los mismos clientes, postres y ventas.', 'Funciona sin internet y se sincroniza al volver la conexión. Cada persona usa su propio prefijo de factura.'],
      b: [A(D.cloud && D.cloud.linked() ? 'Ir a Ajustes' : 'Conectar con la nube', () => (D.cloud && D.cloud.linked() ? go('ajustes')() : D.act['cloud.login']()))] },
    { k: ['clave', 'contrasena', 'usuario', 'password', 'bloquear', 'seguridad', 'entrar', 'no puedo entrar'], t: '¿Cómo cambio mi clave o usuario?',
      a: ['En <b>Ajustes → Seguridad</b> cambias el usuario y la clave (mínimo 8 caracteres, con letras y números).', 'La app se bloquea sola tras 10 minutos sin usarla.'],
      b: [A('Cambiar clave', () => D.act['auth.change']()), A('Cambiar usuario', () => D.act['auth.user']())] },
    { k: ['instalar', 'icono', 'pantalla de inicio', 'instalarla'], t: '¿Cómo instalo la app?',
      a: ['Instálala para abrirla como una app, a pantalla completa y sin internet.'],
      b: [A('Instalar app', () => D.act['app.install']())] },
    { k: ['actualizar', 'actualizacion', 'version', 'nueva version'], t: '¿Cómo actualizo la app?',
      a: ['La app busca sola versiones nuevas y te avisa con una ventana. También puedes buscarla tú.'],
      b: [A('Buscar actualización', () => D.act['app.update']())] },
    { k: ['sonido', 'sonidos', 'audio', 'moneda', 'silencio', 'ruido'], t: '¿Cómo apago los sonidos?',
      a: ['En <b>Ajustes → Sonido</b> enciendes o apagas los sonidos de dinero al vender y cobrar.'],
      b: [A('Ir a Ajustes', go('ajustes'))] },
    { k: ['borrar', 'eliminar', 'editar', 'corregir', 'error', 'equivoque', 'me equivoque', 'cambiar venta'], t: '¿Cómo corrijo o borro algo?',
      a: ['Toca la venta, el cliente o el postre y usa <b>Editar</b>, o el ícono de borrar.', 'Al borrar aparece <b>Deshacer</b> unos segundos, por si te equivocaste.'] },
    { k: ['plazo', 'quincena', 'quincenal', 'mensual', 'dias', 'vence', 'vencimiento'], t: '¿Cómo funcionan los plazos?',
      a: ['Cada venta lleva un plazo: contado, 8, 15 o 30 días. Pasada la fecha queda <b>vencida</b>.', 'Tu plazo habitual se cambia en <b>Ajustes → Facturación</b>.'],
      b: [A('Ir a Ajustes', go('ajustes'))] },
    { k: ['numero de factura', 'prefijo', 'consecutivo', 'codigo', 'letra', 'v-', 'r-', 'd-'], t: '¿Qué significan las letras de la factura?',
      a: ['La letra es el <b>prefijo</b> de quien la creó (<b>R-</b>, <b>D-</b>…): así dos personas no repiten números.', 'Las ventas importadas de la hoja llevan <b>V-</b>. El prefijo se cambia en Ajustes → Facturación.'] },
    { k: ['hola', 'buenas', 'buenos dias', 'hey'], t: 'Saludo', a: ['¡Hola! 🧁 ¿En qué te ayudo?'] },
    { k: ['gracias', 'listo', 'ok', 'perfecto', 'genial'], t: 'Gracias', a: ['¡Con mucho gusto! Aquí estaré cuando me necesites 💖'] },
  ];

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  function find(q) {
    const n = ' ' + norm(q) + ' ';
    let best = null, score = 0;
    KB.forEach((e) => {
      let s = 0;
      e.k.forEach((k) => { if (n.includes(' ' + k + ' ') || (k.length > 4 && n.includes(k))) s += k.length > 5 ? 3 : 2; });
      (e.w || []).forEach((k) => { if (n.includes(' ' + k + ' ')) s += 1; }); // palabras muy generales: pesan poco
      if (s > score) { score = s; best = e; }
    });
    return score >= 1 ? best : null;
  }

  /* Sugerencia según la pantalla donde está la persona */
  const CONTEXT = {
    inicio: 'Aquí ves cuánto vendes, cobras y ganas. Cambia el periodo con «Este mes / Mes pasado / Todo».',
    ventas: 'Aquí están tus ventas. Toca una para ver la factura y enviarla por WhatsApp.',
    cobros: 'Aquí están las ventas por cobrar, las vencidas primero. Toca una para cobrar o recordar.',
    compras: 'Aquí registras lo que gastas en insumos.',
    clientes: 'Aquí guardas a tus clientes con su WhatsApp.',
    productos: 'Aquí está tu menú de postres, con precio y costo.',
    reportes: 'Aquí ves tus mejores clientes y postres, y la cartera vencida.',
    ajustes: 'Aquí personalizas tu negocio, la seguridad y los mensajes de WhatsApp.',
  };

  /* ---------- Conversación ---------- */
  let sh = null, lastDone = 0;
  const ava = () => `<span class="gmsg__av" aria-hidden="true">${D.mood('hello', { cls: 'gmsg__mood' })}</span>`;
  const bubble = (html, who = 'bot') => `<div class="gmsg gmsg--${who}">${who === 'bot' ? ava() : ''}<div class="gmsg__b">${html}</div></div>`;
  let handlers = [];
  const btn = (label, fn, cls = '') => {
    handlers.push(fn);
    return `<button type="button" class="gbtn ${cls}" data-gh="${handlers.length - 1}">${esc(label)}</button>`;
  };
  const chips = (list) => `<div class="gchips">${list.map(([l, fn]) => btn(l, fn, 'gbtn--chip')).join('')}</div>`;

  function say(html, { delay = 0 } = {}) {
    if (!sh) return;
    const box = $('.guide__msgs', sh.el);
    const add = () => {
      if (!sh) return;
      const typing = $('.gmsg--typing', box);
      typing && typing.remove();
      box.insertAdjacentHTML('beforeend', html);
      const last = box.lastElementChild;
      if (last && !D.reduceMotion()) last.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      const body = sh.body;
      body.scrollTo({ top: body.scrollHeight, behavior: D.reduceMotion() ? 'auto' : 'smooth' });
    };
    if (!delay || D.reduceMotion()) return add();
    box.insertAdjacentHTML('beforeend', `<div class="gmsg gmsg--bot gmsg--typing">${ava()}<div class="gmsg__b"><i></i><i></i><i></i></div></div>`);
    sh.body.scrollTo({ top: sh.body.scrollHeight });
    setTimeout(add, delay);
  }

  function checklist() {
    const p = progress();
    const rows = STEPS.map((s) => {
      const ok = s.done();
      handlers.push(s.run);
      return `<button type="button" class="gstep ${ok ? 'is-done' : ''}" data-gh="${handlers.length - 1}" ${ok ? 'aria-label="' + esc(s.t) + ' (hecho)"' : ''}>
        <span class="gstep__ic">${D.icon(ok ? 'checkCircle' : 'plus')}</span>
        <span class="gstep__tx"><b>${esc(s.t)}</b><small>${esc(s.h)}</small></span></button>`;
    }).join('');
    return `<div class="gbar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${(p.done / p.total) * 100}%"></i></div>
      <p class="gnote">${p.done} de ${p.total} pasos</p><div class="gsteps">${rows}</div>`;
  }

  function topics() {
    return chips([
      ['¿Cómo vendo?', () => ask(KB[0].t, KB[0])],
      ['¿Cómo cobro?', () => ask(KB[1].t, KB[1])],
      ['Enviar factura', () => ask(KB[4].t, KB[4])],
      ['Mis ganancias', () => ask(KB[6].t, KB[6])],
      ['Cuidar mis datos', () => ask(KB[8].t, KB[8])],
    ]);
  }

  function answer(e) {
    const lines = e.a.map((l) => `<p>${l}</p>`).join('');
    const bs = (e.b || []).length ? `<div class="gacts">${e.b.map((x) => btn(x.label, x.fn)).join('')}</div>` : '';
    return bubble(lines + bs);
  }
  function ask(text, entry) {
    say(bubble(esc(text), 'me'));
    const e = entry || find(text);
    if (e) say(answer(e), { delay: 420 });
    else say(bubble(`<p>Todavía no sé responder eso 🙈. Prueba con otras palabras, por ejemplo «cobrar», «factura» o «ganancia», o elige un tema:</p>${topics()}`), { delay: 420 });
  }

  function next() {
    const p = progress();
    if (!p.next) return bubble(`<p>🎉 ¡Completaste todos los primeros pasos! Ya manejas Dulza como una experta.</p>`);
    return bubble(`<p>Tu siguiente paso: <b>${esc(p.next.t)}</b>. ${esc(p.next.h)}</p><div class="gacts">${btn('Hazlo conmigo', p.next.run, 'gbtn--main')}</div>`);
  }

  function greet() {
    handlers = [];
    const S = D.data.settings;
    const first = (S.owner || '').split(' ')[0];
    const route = D.router.route;
    const p = progress();
    let h = bubble(`<p>¡Hola${first ? ', ' + esc(first) : ''}! Soy <b>Dulce</b> 🧁, tu guía en Dulza. Te acompaño paso a paso y respondo tus dudas.</p>${CONTEXT[route] ? `<p class="gnote">${esc(CONTEXT[route])}</p>` : ''}`);
    h += bubble(`<p><b>Primeros pasos</b></p>${checklist()}`);
    h += p.next ? next() : '';
    h += bubble(`<p>O pregúntame lo que quieras (escribe abajo) o elige un tema:</p>${topics()}`);
    return h;
  }

  /* Cuando se completa un paso mientras la guía está abierta, lo celebra y propone el siguiente */
  D.store.on(() => {
    if (!sh || sh.closed) return;
    const n = progress().done;
    if (n > lastDone) {
      lastDone = n;
      D.sound && D.haptic && D.haptic(12);
      const p = progress();
      say(bubble(`<p>✅ ¡Muy bien! Llevas <b>${p.done} de ${p.total}</b> pasos.</p>`), { delay: 500 });
      setTimeout(() => say(next()), 1100);
    }
  });

  function open(topic) {
    if (sh && !sh.closed) return;
    handlers = [];
    lastDone = progress().done;
    mark('seen');
    sh = D.sheet.open({
      title: 'Dulce · tu guía',
      size: 'large',
      left: false,
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
      trackDirty: false,
      body: `<div class="guide__msgs" aria-live="polite">${greet()}</div>`,
      footer: `<form class="guide__form" autocomplete="off"><input class="guide__in" name="q" placeholder="Escribe tu pregunta…" enterkeyhint="send" autocomplete="off" aria-label="Escribe tu pregunta"><button class="btn btn--sm" type="submit">Enviar</button></form>`,
      onClose: () => { sh = null; },
    });
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gh]');
      if (!b) return;
      const fn = handlers[+b.dataset.gh];
      fn && fn();
    });
    sh.el.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = $('.guide__in', sh.el);
      const q = inp.value.trim();
      if (!q) return;
      inp.value = '';
      ask(q);
    });
    if (topic) { const e = KB.find((x) => x.k.includes(topic)); e && setTimeout(() => ask(e.t, e), 500); }
  }

  /* Tarjeta del Inicio: aparece mientras falten pasos y se puede ocultar */
  function card() {
    const p = progress();
    if (!p.next || flag('hide')) return '';
    return `<section class="card c-guide" data-rise>
      <div class="c-guide__art" aria-hidden="true">${D.mood('hello', { cls: 'c-guide__mood' })}</div>
      <div class="c-guide__tx"><h2 class="card__title">Primeros pasos con Dulce</h2>
        <p class="muted">${p.done} de ${p.total} · Siguiente: ${esc(p.next.t)}</p>
        <div class="gbar"><i style="width:${(p.done / p.total) * 100}%"></i></div></div>
      <div class="c-guide__btns"><button class="btn btn--sm" data-act="guide.open">Continuar</button><button class="btn btn--sm btn--plain" data-act="guide.hide">Ocultar</button></div>
    </section>`;
  }

  D.act['guide.open'] = () => open();
  D.act['guide.hide'] = () => { mark('hide'); D.toast('Puedes volver a abrir a Dulce desde «Ayuda»', { icon: 'sparkle' }); D.router.render({ force: true }); };

  /* Botón flotante con la carita de Dulce: siempre a la vista, abajo a la izquierda (el «+» de venta queda a la derecha) */
  function mount() {
    if ($('.bot-fab')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bot-fab';
    b.setAttribute('data-act', 'guide.open');
    b.setAttribute('aria-label', 'Abrir a Dulce, tu guía');
    b.innerHTML = `<span class="bot-fab__face">${D.mood('hello', { cls: 'bot-fab__mood' })}</span><span class="bot-fab__badge" hidden></span><span class="bot-fab__tip" role="status" hidden>¿Necesitas ayuda? Soy <b>Dulce</b> 🧁</span>`;
    document.body.appendChild(b);
    const badge = $('.bot-fab__badge', b);
    const sync = () => {
      const p = progress();
      const left = p.total - p.done;
      badge.hidden = !left || flag('hide');
      badge.textContent = left > 9 ? '9+' : String(left);
      badge.setAttribute('aria-label', `${left} pasos pendientes`);
    };
    sync();
    D.store.on(sync);
    // un globito de saludo, una vez por sesión
    let seen = false;
    try { seen = sessionStorage.getItem('dulza-bot-tip') === '1'; sessionStorage.setItem('dulza-bot-tip', '1'); } catch (e) {}
    if (!seen) {
      const tip = $('.bot-fab__tip', b);
      setTimeout(() => { tip.hidden = false; tip.classList.add('is-in'); }, 1600);
      setTimeout(() => { tip.classList.remove('is-in'); setTimeout(() => (tip.hidden = true), 260); }, 8000);
    }
  }

  D.guide = { open, card, progress, STEPS, KB, find, mount, _norm: norm };

  /* Una sola vez, si la persona es nueva (aún sin ventas): ofrece la guía con un aviso */
  D.guide.offer = () => {
    if (flag('seen') || flag('offered') || D.data.sales.length || !D.data.settings.onboarded) return;
    mark('offered');
    setTimeout(() => D.toast('¿Quieres que te guíe? Soy Dulce 🧁', { icon: 'sparkle', action: { label: 'Sí, guíame', fn: () => open() } }), 1800);
  };
})();
