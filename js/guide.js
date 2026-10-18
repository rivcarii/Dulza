/* Dulza · Dulce, la asistente del sistema
   Un bot que vive en la app (sin internet y sin costo). Hace dos cosas:
   1) Guía: lista de primeros pasos que se marca sola y respuestas a preguntas frecuentes (palabras clave).
   2) Automatiza: registra ventas, compras y pagos conversando (elige cliente, postres, plazo…), genera el comprobante o recibo
      y lo envía por WhatsApp con un botón dentro del chat.
   La primera vez muestra la bienvenida con los primeros pasos; después cada conversación empieza limpia, con el menú. */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const KEY = 'dulza-guide';
  const money = (n) => D.money(n);

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

  /* ==========================================================================
     Primeros pasos: se marcan solos con lo que hay en los datos
     ========================================================================== */
  const STEPS = [
    { id: 'negocio', t: 'Cuéntame de tu negocio', h: 'Nombre, país y WhatsApp en Ajustes.', done: () => !!D.data.settings.onboarded, run: go('ajustes') },
    { id: 'postre', t: 'Agrega tu primer postre', h: 'Con su precio y su costo.', done: () => D.data.products.length > 0, run: () => D.act['product.new']() },
    { id: 'cliente', t: 'Guarda un cliente', h: 'Con su WhatsApp para enviarle la factura.', done: () => D.data.customers.length > 0, run: () => D.act['customer.new']() },
    { id: 'venta', t: 'Registra tu primera venta', h: 'Conmigo, aquí mismo en el chat.', done: () => D.data.sales.length > 0, run: () => ventaStart() },
    { id: 'factura', t: 'Envía una factura por WhatsApp', h: 'Al terminar una venta, toca «Enviar por WhatsApp».', done: () => flag('sent') || D.data.sales.some((s) => s.waSentAt), run: () => ventaStart() },
    { id: 'cobro', t: 'Registra un cobro', h: 'Conmigo: «Registrar pago».', done: () => D.data.sales.some((s) => s.term > 0 && (s.payments || []).some((p) => p.note !== 'Abono inicial')), run: () => pagoStart() },
    { id: 'clave', t: 'Cambia tu clave', h: 'Para que solo entres tú.', done: () => !D.auth.usingDefault(), run: () => D.act['auth.change']() },
    { id: 'respaldo', t: 'Guarda un respaldo', h: 'Un archivo con todos tus datos.', done: () => !!D.data.settings.lastBackup, run: () => D.act['data.export']() },
  ];
  const progress = () => {
    const done = STEPS.filter((s) => s.done());
    return { done: done.length, total: STEPS.length, next: STEPS.find((s) => !s.done()) || null };
  };

  /* ==========================================================================
     Preguntas frecuentes (palabras clave sin tildes). `w` = palabras muy generales: pesan poco
     ========================================================================== */
  const A = (label, fn) => ({ label, fn });
  const KB = [
    { k: ['vender', 'venta', 'facturar', 'nueva venta', 'registrar venta', 'como vendo'], t: '¿Cómo registro una venta?',
      a: ['Puedo hacerla contigo aquí mismo: eliges el cliente, los postres y el plazo, y yo genero el comprobante.', 'O toca <b>Nueva venta</b> (tecla <kbd>N</kbd> en el computador) para usar el formulario.'],
      b: [A('Registrar venta con Dulce', () => ventaStart()), A('Formulario', () => D.act['sale.new']())] },
    { k: ['cobrar', 'cobro', 'cobros', 'abono', 'pago', 'pagar', 'deuda', 'fiado', 'me deben', 'me debe', 'debe plata', 'plata', 'quien me debe'], t: '¿Cómo cobro?',
      a: ['Dime a quién le cobras y cuánto, y registro el pago y te doy el recibo para enviarlo por WhatsApp.', 'También puedes ir a <b>Cobros</b>: salen las pendientes, las vencidas primero.'],
      b: [A('Registrar pago con Dulce', () => pagoStart()), A('Ir a Cobros', go('cobros'))] },
    { k: ['guardar cliente', 'agregar cliente', 'nuevo cliente', 'crear cliente', 'contacto', 'telefono', 'numero de whatsapp'], w: ['cliente', 'clientes'], t: '¿Cómo guardo un cliente?',
      a: ['En <b>Clientes</b> (o el botón <b>Cliente</b> del Inicio) guarda su nombre y su WhatsApp.', 'Con el número guardado, la factura y los recordatorios van directo a su chat. También puedo crearlo mientras registramos una venta.'],
      b: [A('Nuevo cliente', () => D.act['customer.new']())] },
    { k: ['agregar postre', 'nuevo postre', 'crear postre', 'precio', 'costo', 'catalogo', 'menu', 'producto', 'productos'], w: ['postre', 'postres'], t: '¿Cómo agrego postres?',
      a: ['En <b>Postres</b> agrega cada uno con su precio y su <b>costo</b>: el costo sirve para calcular tu ganancia.', 'Puedes elegir un ícono de postre y desactivar los que no estés vendiendo.'],
      b: [A('Nuevo postre', () => D.act['product.new']())] },
    { k: ['whatsapp', 'enviar factura', 'mensaje', 'imagen', 'compartir', 'mandar factura', 'comprobante', 'recibo'], t: '¿Cómo envío la factura o el recibo por WhatsApp?',
      a: ['Al terminar una venta o un pago, yo te muestro el comprobante con el botón <b>Enviar por WhatsApp</b>.', 'En el <b>celular</b> se abre el menú de compartir con la imagen adjunta; en el <b>computador</b> se copia la imagen y se abre el chat (pégala con Ctrl+V).'],
      b: [A('Registrar una venta', () => ventaStart())] },
    { k: ['recordatorio', 'recordar', 'vencida', 'vencidas', 'atrasado', 'atrasada', 'moroso'], t: '¿Cómo recuerdo un cobro?',
      a: ['En <b>Cobros</b> abre una venta vencida y toca <b>Recordar</b>: sale un mensaje amable con el saldo y la fecha.', 'También puedes recordarle a un cliente desde su ficha.'],
      b: [A('Ver pendientes', () => pendientes()), A('Ir a Cobros', go('cobros'))] },
    { k: ['ganancia', 'ganancias', 'ganado', 'gane', 'utilidad', 'cuanto gano', 'reporte', 'reportes', 'vendido', 'cobrado', 'resumen', 'cifras'], t: '¿Dónde veo mis ganancias?',
      a: ['En <b>Inicio</b> están Ventas, Cobrado, Compras y Ganancia. Cambia el periodo con <b>Este mes / Mes pasado / Todo</b>.', 'En <b>Reportes</b> ves tus mejores clientes y postres, y la cartera vencida. La ganancia es lo vendido menos el costo de cada postre.'],
      b: [A('Ir a Reportes', go('reportes'))] },
    { k: ['compra', 'compras', 'insumos', 'proveedor', 'proveedores', 'gasto', 'gastos', 'comprar'], t: '¿Cómo registro mis compras?',
      a: ['Cuéntame qué compraste y a quién, y la registro. Así tu ganancia descuenta lo que gastas.', 'O usa <b>Compras</b> (<kbd>Shift</kbd>+<kbd>N</kbd> en el computador).'],
      b: [A('Registrar compra con Dulce', () => compraStart()), A('Formulario', () => D.act['purchase.new']())] },
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
    { k: ['hola', 'buenas', 'buenos dias', 'hey'], t: 'Saludo', a: ['¡Hola! 🧁 ¿Qué hacemos hoy?'], b: [] },
    { k: ['gracias', 'listo', 'ok', 'perfecto', 'genial'], t: 'Gracias', a: ['¡Con mucho gusto! Aquí estaré cuando me necesites 💖'] },
  ];

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  function find(q) {
    const n = ' ' + norm(q) + ' ';
    let best = null, score = 0;
    KB.forEach((e) => {
      let s = 0;
      e.k.forEach((k) => { if (n.includes(' ' + k + ' ') || (k.length > 4 && n.includes(k))) s += k.length > 5 ? 3 : 2; });
      (e.w || []).forEach((k) => { if (n.includes(' ' + k + ' ')) s += 1; });
      if (s > score) { score = s; best = e; }
    });
    return score >= 1 ? best : null;
  }
  /* Órdenes directas («registra una venta», «quiero cobrar»…): arrancan el flujo en vez de explicar */
  function intent(q) {
    const n = norm(q);
    if (/^(como|que|donde|cual|por que|puedo|se puede)\b/.test(n) || String(q).includes('?')) return null;
    if (/\b(venta|vender|vendi)\b/.test(n)) return ventaStart;
    if (/\b(compra|comprar|compre|insumo|insumos)\b/.test(n)) return compraStart;
    if (/\b(pago|abono|cobrar|cobro|pagaron|me pago|me pagaron|pague)\b/.test(n)) return pagoStart;
    if (/\b(pendiente|pendientes|deben|vencidas|vencido|vencidos)\b/.test(n)) return pendientes;
    return null;
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

  /* ==========================================================================
     Conversación
     ========================================================================== */
  let sh = null, lastDone = 0, H = [];
  const ava = () => `<span class="gmsg__av" aria-hidden="true">${D.mood('hello', { cls: 'gmsg__mood' })}</span>`;
  const bubble = (html, who = 'bot') => `<div class="gmsg gmsg--${who}">${who === 'bot' ? ava() : ''}<div class="gmsg__b">${html}</div></div>`;
  const btn = (label, fn, cls = '') => {
    H.push(fn);
    return `<button type="button" class="gbtn ${cls}" data-gh="${H.length - 1}">${esc(label)}</button>`;
  };
  const chips = (list) => `<div class="gchips">${list.map(([l, fn, c]) => btn(l, fn, 'gbtn--chip ' + (c || ''))).join('')}</div>`;
  const acts = (list) => `<div class="gacts">${list.map(([l, fn, c]) => btn(l, fn, c || '')).join('')}</div>`;

  function say(html, { delay = 0 } = {}) {
    if (!sh) return;
    const box = $('.guide__msgs', sh.el);
    const add = () => {
      if (!sh) return;
      const typing = $('.gmsg--typing', box);
      typing && typing.remove();
      box.insertAdjacentHTML('beforeend', html);
      const last = box.lastElementChild;
      if (last && !D.reduceMotion()) last.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      sh.body.scrollTo({ top: sh.body.scrollHeight, behavior: D.reduceMotion() ? 'auto' : 'smooth' });
    };
    if (!delay || D.reduceMotion()) return add();
    box.insertAdjacentHTML('beforeend', `<div class="gmsg gmsg--bot gmsg--typing">${ava()}<div class="gmsg__b"><i></i><i></i><i></i></div></div>`);
    sh.body.scrollTo({ top: sh.body.scrollHeight });
    setTimeout(add, delay);
  }
  const me = (t) => say(bubble(esc(t), 'me'));
  const lastEl = () => $('.guide__msgs', sh.el).lastElementChild;

  /* Texto libre dentro de una burbuja: una o varias casillas y un botón */
  function formBubble(intro, fields, label, onSubmit) {
    H.push(onSubmit);
    const idx = H.length - 1;
    const inputs = fields.map((f) => `<input class="gin" name="${f.n}" placeholder="${esc(f.p)}" ${f.m ? `inputmode="${f.m}"` : ''} autocomplete="off" aria-label="${esc(f.p)}">`).join('');
    return bubble(`<p>${intro}</p><form class="gform" data-gf="${idx}">${inputs}<button class="gbtn gbtn--main" type="submit">${esc(label)}</button></form>`);
  }

  /* ---------- Menú principal ---------- */
  function menu(intro) {
    return bubble(`<p>${intro || '¿Qué hacemos?'}</p>${chips([
      ['🧁 Registrar venta', () => ventaStart()],
      ['🛒 Registrar compra', () => compraStart()],
      ['💰 Registrar pago', () => pagoStart()],
      ['📋 Ver pendientes', () => pendientes()],
      ['✨ Primeros pasos', () => say(bubble(`<p><b>Primeros pasos</b></p>${checklist()}`), { delay: 250 })],
      ['❓ Preguntas', () => say(bubble(`<p>Escríbeme tu duda abajo o elige un tema:</p>${topics()}`), { delay: 250 })],
    ])}`);
  }
  const toMenu = () => say(menu(), { delay: 250 });
  const back = () => acts([['Volver al menú', toMenu, 'gbtn--ghost']]);

  function checklist() {
    const p = progress();
    const rows = STEPS.map((s) => {
      const ok = s.done();
      H.push(s.run);
      return `<button type="button" class="gstep ${ok ? 'is-done' : ''}" data-gh="${H.length - 1}" ${ok ? 'aria-label="' + esc(s.t) + ' (hecho)"' : ''}>
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
    const bs = (e.b || []).length ? acts(e.b.map((x) => [x.label, x.fn])) : '';
    return bubble(lines + bs);
  }
  function ask(text, entry) {
    me(text);
    const e = entry || find(text);
    if (e) say(answer(e), { delay: 420 });
    else say(bubble(`<p>Todavía no sé responder eso 🙈. Prueba con otras palabras, por ejemplo «cobrar», «factura» o «ganancia», o elige qué hacer:</p>${chips([['🧁 Registrar venta', () => ventaStart()], ['🛒 Registrar compra', () => compraStart()], ['💰 Registrar pago', () => pagoStart()], ['❓ Temas', () => say(bubble(`<p>Elige un tema:</p>${topics()}`))]])}`), { delay: 420 });
  }
  function next() {
    const p = progress();
    if (!p.next) return bubble(`<p>🎉 ¡Completaste todos los primeros pasos! Ya manejas Dulza como una experta.</p>`);
    return bubble(`<p>Tu siguiente paso: <b>${esc(p.next.t)}</b>. ${esc(p.next.h)}</p>${acts([['Hazlo conmigo', p.next.run, 'gbtn--main']])}`);
  }

  /* ---------- Clientes y proveedores en el chat ---------- */
  const recentCustomers = () => {
    const last = {};
    D.data.sales.forEach((s) => { if (s.customerId) last[s.customerId] = Math.max(last[s.customerId] || 0, s.at || 0); });
    return D.data.customers.slice().sort((a, b) => (last[b.id] || 0) - (last[a.id] || 0));
  };
  const short = (n) => (String(n).length > 18 ? String(n).slice(0, 17) + '…' : n);

  function pickCustomer(cb, { none = true } = {}) {
    const list = recentCustomers().slice(0, 8);
    const rows = list.map((c) => [short(c.name), () => { me(c.name); cb(c); }]);
    rows.push(['🔎 Otro cliente', () => {
      say(formBubble('Escribe parte del nombre:', [{ n: 'q', p: 'Nombre del cliente' }], 'Buscar', (f) => {
        const q = norm(f.get('q'));
        const found = D.data.customers.filter((c) => norm(c.name).includes(q)).slice(0, 8);
        if (!q || !found.length) return say(bubble(`<p>No encontré a nadie con «${esc(f.get('q'))}». ¿Lo creo como cliente nuevo?</p>${acts([['Crear cliente nuevo', () => newCustomer(cb)], ['Sin cliente', () => { me('Sin cliente'); cb(null); }]])}`), { delay: 250 });
        me(f.get('q'));
        say(bubble(`<p>Encontré esto:</p>${chips(found.map((c) => [short(c.name), () => { me(c.name); cb(c); }]))}`), { delay: 250 });
      }));
    }]);
    rows.push(['➕ Cliente nuevo', () => newCustomer(cb), 'gbtn--main']);
    if (none) rows.push(['Sin cliente', () => { me('Sin cliente'); cb(null); }]);
    return chips(rows);
  }
  function newCustomer(cb) {
    say(formBubble('Nombre y WhatsApp del cliente nuevo (el número es opcional):', [{ n: 'name', p: 'Nombre' }, { n: 'phone', p: 'WhatsApp', m: 'tel' }], 'Guardar cliente', (f) => {
      const name = String(f.get('name') || '').trim();
      if (!name) return;
      const c = { id: D.uid(), createdAt: Date.now(), name, phone: String(f.get('phone') || '').trim(), address: '', notes: '' };
      D.data.customers.push(c);
      D.store.commit('customers');
      me(`${name}${c.phone ? ' · ' + c.phone : ''}`);
      cb(c);
    }));
  }
  function pickSupplier(cb) {
    const rows = D.data.suppliers.slice(0, 8).map((s) => [short(s.name), () => { me(s.name); cb(s); }]);
    rows.push(['➕ Proveedor nuevo', () => {
      say(formBubble('Nombre y WhatsApp del proveedor (el número es opcional):', [{ n: 'name', p: 'Nombre' }, { n: 'phone', p: 'WhatsApp', m: 'tel' }], 'Guardar', (f) => {
        const name = String(f.get('name') || '').trim();
        if (!name) return;
        const s = { id: D.uid(), createdAt: Date.now(), name, phone: String(f.get('phone') || '').trim(), address: '', notes: '' };
        D.data.suppliers.push(s);
        D.store.commit('suppliers');
        me(name);
        cb(s);
      }));
    }, 'gbtn--main']);
    rows.push(['Sin proveedor', () => { me('Sin proveedor'); cb(null); }]);
    return chips(rows);
  }

  /* ---------- Comprobante dentro del chat ---------- */
  const line = (l, r, cls = '') => `<div class="grec__r ${cls}"><span>${l}</span><b>${r}</b></div>`;
  function saleReceipt(s) {
    const bal = D.sale.balance(s);
    const items = s.items.map((i) => line(`${i.qty}× ${esc(i.name)}`, money(i.qty * i.price))).join('');
    return `<div class="grec"><div class="grec__h">🧾 Comprobante ${esc(s.number)}</div><div class="grec__s">${esc(D.fmtDate(s.date))} · ${esc(D.sale.customerName(s))}</div>
      <div class="grec__rule"></div>${items}<div class="grec__rule"></div>
      ${line('Total', money(D.sale.total(s)), 'grec__t')}
      ${D.sale.paid(s) > 0 ? line('Abonado', money(D.sale.paid(s))) : ''}
      ${bal > 0 ? line('Saldo pendiente', money(bal), 'grec__bad') + (s.term ? line('Vence', esc(D.fmtDate(s.due))) : '') : line('Estado', '✅ Pagada', 'grec__ok')}</div>`;
  }
  /* Teléfono del cliente: si no lo tiene, lo pide en el chat y lo guarda antes de enviar */
  function withPhone(c, then) {
    if (c && c.phone) return then(c.phone);
    say(formBubble(`${c ? esc(c.name) : 'Este cliente'} no tiene WhatsApp guardado. Escríbelo y lo guardo (déjalo vacío para elegir el contacto en WhatsApp):`, [{ n: 'phone', p: 'WhatsApp', m: 'tel' }], 'Continuar', (f) => {
      const ph = String(f.get('phone') || '').trim();
      if (ph && c) { c.phone = ph; D.store.commit('customers'); }
      then(ph);
    }), { delay: 250 });
  }
  const methodChips = (cb) => chips(D.METHODS.map((m) => [m, () => { me(m); cb(m); }]));

  /* ==========================================================================
     Flujo: VENTA
     ========================================================================== */
  let V = null;
  const vp = (p) => D.product.priceFor(p, V ? V.term : 0); // precio de contado o a plazo según el plazo elegido
  function ventaStart() {
    V = { customer: null, qty: {}, term: D.data.settings.defaultTerm || 0, initial: 0, method: 'Efectivo' };
    if (!D.data.products.some((p) => p.active !== false)) return say(bubble(`<p>Primero necesitas al menos un postre en tu menú.</p>${acts([['Agregar postre', () => D.act['product.new'](), 'gbtn--main']])}`), { delay: 300 });
    say(bubble(`<p>¡Vamos con una venta! 🧁 ¿Para quién es?</p>${pickCustomer((c) => { V.customer = c; ventaTerm(); })}`), { delay: 350 });
  }
  /* El plazo se pregunta antes de los postres: cada postre tiene precio de contado y precio a plazo */
  function ventaTerm() {
    const hab = D.data.settings.defaultTerm || 0;
    const two = D.data.products.some((p) => D.product.hasTwo(p));
    const t = (n, l) => [l, () => { me(l); V.term = n; ventaItems(); }, n === hab ? 'gbtn--main' : ''];
    say(bubble(`<p>¿Cómo la cobras?${two ? ' Los postres tienen <b>precio de contado</b> y <b>precio a plazo</b>.' : ''}</p>${chips([t(0, 'De contado'), t(8, 'A 8 días'), t(15, 'A 15 días'), t(30, 'A 30 días')])}`), { delay: 300 });
  }
  function ventaItems() {
    const prods = D.data.products.filter((p) => p.active !== false);
    const rows = prods.map((p) => `<div class="gpick__row" data-pid="${p.id}"><span class="gpick__ic">${D.glyph(p.emoji)}</span><span class="gpick__n"><b>${esc(p.name)}</b><small>${money(vp(p))}${D.product.hasTwo(p) ? ` · ${V.term > 0 ? 'contado ' + money(p.price) : 'plazo ' + money(p.priceCredit)}` : ''}</small></span>
      <span class="gqty"><button type="button" data-d="-1" aria-label="Quitar uno de ${esc(p.name)}">−</button><output>${V.qty[p.id] || 0}</output><button type="button" data-d="1" aria-label="Agregar uno de ${esc(p.name)}">+</button></span></div>`).join('');
    say(bubble(`<p>¿Qué postres lleva${V.customer ? ' ' + esc(V.customer.name.split(' ')[0]) : ''}? Toca <b>+</b> para agregar:</p><div class="gpick">${rows}</div>
      <div class="gpick__tot"><span>Total</span><b data-tot>${money(0)}</b></div>${acts([['Listo', () => ventaItemsDone(), 'gbtn--main']])}`), { delay: 350 });
    setTimeout(() => {
      const box = lastEl();
      if (!box) return;
      const upd = () => {
        const tot = prods.reduce((a, p) => a + (V.qty[p.id] || 0) * vp(p), 0);
        $('[data-tot]', box).textContent = money(tot);
      };
      upd();
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-d]');
        if (!b || !V) return;
        const row = b.closest('[data-pid]');
        const pid = row.dataset.pid;
        V.qty[pid] = Math.max(0, (V.qty[pid] || 0) + +b.dataset.d);
        $('output', row).textContent = V.qty[pid];
        upd();
        D.haptic && D.haptic(6);
      });
    }, 420);
  }
  const ventaLines = () => D.data.products.filter((p) => V && V.qty[p.id] > 0);
  function ventaItemsDone() {
    if (!V) return;
    const sel = ventaLines();
    if (!sel.length) return say(bubble('<p>Aún no elegiste ningún postre. Toca <b>+</b> en los que lleva.</p>'));
    me(sel.map((p) => `${V.qty[p.id]}× ${p.name}`).join(', '));
    ventaPay();
  }
  function ventaPay() {
    const tot = ventaLines().reduce((a, p) => a + V.qty[p.id] * vp(p), 0);
    if (V.term === 0) return say(bubble(`<p>¿Con qué método pagó?</p>${methodChips((m) => { V.method = m; V.initial = tot; ventaSummary(); })}`), { delay: 300 });
    say(bubble(`<p>¿Dejó un abono inicial?</p>${chips([
      ['Sin abono', () => { me('Sin abono'); V.initial = 0; ventaSummary(); }],
      [`Mitad · ${money(Math.round(tot / 2))}`, () => { me('Mitad'); V.initial = Math.round(tot / 2); ventaMethod(); }],
      ['Otro valor', () => say(formBubble('¿De cuánto fue el abono?', [{ n: 'v', p: 'Valor', m: 'decimal' }], 'Aceptar', (f) => {
        const v = Math.min(D.parseNum(f.get('v')), tot);
        if (!(v > 0)) return;
        me(money(v));
        V.initial = v;
        ventaMethod();
      }))],
    ])}`), { delay: 300 });
  }
  function ventaMethod() { say(bubble(`<p>¿Con qué método pagó el abono?</p>${methodChips((m) => { V.method = m; ventaSummary(); })}`), { delay: 250 }); }
  function ventaSummary() {
    const sel = ventaLines();
    const tot = sel.reduce((a, p) => a + V.qty[p.id] * vp(p), 0);
    const rows = sel.map((p) => line(`${V.qty[p.id]}× ${esc(p.name)}`, money(V.qty[p.id] * vp(p)))).join('');
    say(bubble(`<p><b>Resumen de la venta</b></p><div class="grec">${line('Cliente', esc(V.customer ? V.customer.name : 'Cliente ocasional'))}<div class="grec__rule"></div>${rows}<div class="grec__rule"></div>
      ${line('Total', money(tot), 'grec__t')}${line('Plazo', V.term ? V.term + ' días' : 'Contado')}${V.initial > 0 ? line(V.term ? 'Abono' : 'Pago', `${money(V.initial)} · ${esc(V.method)}`) : ''}</div>
      ${acts([['✅ Registrar venta', () => ventaSave(), 'gbtn--main'], ['Cambiar postres', () => ventaItems()], ['Cancelar', () => { me('Cancelar'); say(menu('Listo, no registré nada.'), { delay: 250 }); }, 'gbtn--ghost']])}`), { delay: 350 });
  }
  function ventaSave() {
    if (!V) return;
    const sel = ventaLines();
    if (!sel.length) return;
    const date = D.today();
    const seq = D.sale.nextSeq();
    const sale = { id: D.uid(), seq, number: D.sale.number(seq), payments: [], at: Date.now(), date, customerId: V.customer ? V.customer.id : '',
      items: sel.map((p) => ({ id: D.uid(), pid: p.id, name: p.name, emoji: p.emoji, price: vp(p), auto: true, cost: p.cost || 0, qty: V.qty[p.id] })), discount: 0, term: V.term, due: D.addDays(date, V.term), note: '' };
    const tot = D.sale.total(sale);
    if (V.initial > 0) sale.payments.push({ id: D.uid(), date, amount: Math.min(V.initial, tot), method: V.method, note: V.term ? 'Abono inicial' : '', at: Date.now() });
    D.data.sales.push(sale);
    D.data.settings.nextInvoice = seq + 1;
    D.store.commit('sales', 'settings');
    D.sound && D.sound.sale();
    const c = V.customer;
    V = null;
    me('Registrar venta');
    say(bubble(`<p>¡Listo! Registré la venta <b>${esc(sale.number)}</b> 🎉</p>${saleReceipt(sale)}${acts([
      ['📲 Enviar por WhatsApp', () => withPhone(c, (ph) => D.wa.sendDoc(sale, ph, D.wa.invoiceText(sale), 'factura')), 'gbtn--wa'],
      ['Ver factura', () => D.invoice.open(sale.id)],
      ['Otra venta', () => ventaStart()],
      ['Menú', toMenu, 'gbtn--ghost'],
    ])}`), { delay: 500 });
  }

  /* ==========================================================================
     Flujo: COMPRA
     ========================================================================== */
  let P = null;
  function compraStart() {
    P = { supplier: null, items: [], term: 0, method: 'Efectivo' };
    say(bubble(`<p>Vamos a registrar una compra 🛒 ¿A quién le compraste?</p>${pickSupplier((s) => { P.supplier = s; compraItems(); })}`), { delay: 350 });
  }
  const known = () => {
    const k = {};
    D.data.purchases.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((p) => p.items.forEach((i) => (k[i.name.toLowerCase()] = { name: i.name, unit: i.unit, cost: i.cost })));
    return k;
  };
  function compraItems() {
    const k = known();
    const dl = `dl-g-${Date.now()}`;
    const renderItems = (box) => {
      const el = $('[data-items]', box);
      el.innerHTML = P.items.map((i) => line(`${i.qty} ${esc(i.unit)} · ${esc(i.name)}`, money(i.qty * i.cost))).join('') + (P.items.length ? line('Total', money(D.purchase.total({ items: P.items })), 'grec__t') : '');
    };
    H.push((f, box) => {
      if (!P) return;
      const name = String(f.get('name') || '').trim();
      const qty = D.parseNum(f.get('qty'));
      let cost = D.parseNum(f.get('cost'));
      if (!name || !(qty > 0)) return;
      const kn = k[name.toLowerCase()];
      if (!(cost > 0) && kn) cost = kn.cost;
      P.items.push({ name, qty, unit: (kn && kn.unit) || 'u', cost: Math.max(0, cost) });
      renderItems(box);
      f.target && f.target.reset && f.target.reset();
    });
    const idx = H.length - 1;
    const body = `<p>Anota los insumos: nombre, cantidad y costo por unidad.</p><div class="gitems" data-items></div>
      <form class="gform gform--col" data-gf="${idx}"><input class="gin" name="name" list="${dl}" placeholder="Insumo (ej.: Harina)" autocomplete="off" aria-label="Insumo"><div class="gform__row"><input class="gin" name="qty" inputmode="decimal" placeholder="Cantidad" aria-label="Cantidad"><input class="gin" name="cost" inputmode="decimal" placeholder="Costo c/u" aria-label="Costo por unidad"></div>
      <button class="gbtn gbtn--main" type="submit">Agregar insumo</button></form><datalist id="${dl}">${Object.values(k).map((x) => `<option value="${esc(x.name)}"></option>`).join('')}</datalist>
      ${acts([['Listo, ya no hay más', () => compraItemsDone()]])}`;
    say(bubble(body), { delay: 350 });
  }
  function compraItemsDone() {
    if (!P) return;
    if (!P.items.length) return say(bubble('<p>Agrega al menos un insumo con su cantidad.</p>'));
    me(P.items.map((i) => `${i.qty} ${i.name}`).join(', '));
    const t = (n, l) => [l, () => { me(l); P.term = n; if (n === 0) compraMethod(); else compraSummary(); }];
    say(bubble(`<p>¿Cómo la pagaste?</p>${chips([t(0, 'De contado'), t(15, 'A 15 días'), t(30, 'A 30 días')])}`), { delay: 300 });
  }
  function compraMethod() { say(bubble(`<p>¿Con qué método pagaste?</p>${methodChips((m) => { P.method = m; compraSummary(); })}`), { delay: 250 }); }
  function compraSummary() {
    const tot = D.purchase.total({ items: P.items });
    const rows = P.items.map((i) => line(`${i.qty} ${esc(i.unit)} · ${esc(i.name)}`, money(i.qty * i.cost))).join('');
    say(bubble(`<p><b>Resumen de la compra</b></p><div class="grec">${line('Proveedor', esc(P.supplier ? P.supplier.name : 'Sin proveedor'))}<div class="grec__rule"></div>${rows}<div class="grec__rule"></div>
      ${line('Total', money(tot), 'grec__t')}${line('Pago', P.term ? `A ${P.term} días` : `Contado · ${esc(P.method)}`)}</div>
      ${acts([['✅ Registrar compra', () => compraSave(), 'gbtn--main'], ['Cancelar', () => { me('Cancelar'); say(menu('Listo, no registré nada.'), { delay: 250 }); }, 'gbtn--ghost']])}`), { delay: 350 });
  }
  function compraSave() {
    if (!P) return;
    const date = D.today();
    const p = { id: D.uid(), payments: [], at: Date.now(), date, supplierId: P.supplier ? P.supplier.id : '', items: P.items.map((i) => ({ ...i })), term: P.term, due: D.addDays(date, P.term), note: '' };
    if (P.term === 0) p.payments.push({ id: D.uid(), date, amount: D.purchase.total(p), method: P.method, note: '', at: Date.now() });
    D.data.purchases.push(p);
    D.store.commit('purchases');
    const sup = P.supplier;
    P = null;
    me('Registrar compra');
    const tot = D.purchase.total(p);
    const rows = p.items.map((i) => line(`${i.qty} ${esc(i.unit)} · ${esc(i.name)}`, money(i.qty * i.cost))).join('');
    const receipt = `<div class="grec"><div class="grec__h">🧾 Compra del ${esc(D.fmtDate(p.date))}</div><div class="grec__s">${esc(D.purchase.supplierName(p))}</div><div class="grec__rule"></div>${rows}<div class="grec__rule"></div>${line('Total', money(tot), 'grec__t')}${D.purchase.balance(p) > 0 ? line('Por pagar', money(D.purchase.balance(p)), 'grec__bad') + line('Vence', esc(D.fmtDate(p.due))) : line('Estado', '✅ Pagada', 'grec__ok')}</div>`;
    const text = `Hola ${sup ? sup.name : ''} 👋 Te confirmo mi pedido:\n\n${p.items.map((i) => `• ${i.qty} ${i.unit} · ${i.name}`).join('\n')}\n\n*Total: ${money(tot)}*${p.term ? `\nPago a ${p.term} días (${D.fmtDate(p.due)})` : '\nPagado ✅'}\n— ${D.data.settings.name}`;
    say(bubble(`<p>¡Listo! Registré la compra 🛒</p>${receipt}${acts([
      sup ? ['📲 Enviar al proveedor', () => D.wa.send(sup.phone, text), 'gbtn--wa'] : null,
      ['Otra compra', () => compraStart()],
      ['Menú', toMenu, 'gbtn--ghost'],
    ].filter(Boolean))}`), { delay: 500 });
  }

  /* ==========================================================================
     Flujo: PAGO (cobro a un cliente o pago a un proveedor)
     ========================================================================== */
  function pagoStart() {
    say(bubble(`<p>¿Qué pago registramos?</p>${chips([
      ['💰 Me pagó un cliente', () => { me('Me pagó un cliente'); cobroPick(); }, 'gbtn--main'],
      ['📤 Yo le pagué a un proveedor', () => { me('Le pagué a un proveedor'); pagoProv(); }],
    ])}`), { delay: 300 });
  }
  const openSales = () => D.data.sales.filter((s) => D.sale.balance(s) > 0);
  function cobroPick() {
    const open = openSales();
    if (!open.length) return say(bubble(`<p>¡No hay ventas por cobrar! 🎉 Todo está al día.</p>${back()}`), { delay: 300 });
    const by = {};
    open.forEach((s) => { const k = s.customerId || ''; by[k] = by[k] || { c: D.sale.customer(s), bal: 0, list: [] }; by[k].bal += D.sale.balance(s); by[k].list.push(s); });
    const groups = Object.values(by).sort((a, b) => b.bal - a.bal).slice(0, 8);
    say(bubble(`<p>¿Quién te pagó?</p>${chips(groups.map((g) => [`${short(g.c ? g.c.name : 'Ocasional')} · ${money(g.bal)}`, () => { me(g.c ? g.c.name : 'Cliente ocasional'); cobroSale(g.list); }]))}`), { delay: 300 });
  }
  function cobroSale(list) {
    list = list.slice().sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date));
    if (list.length === 1) return cobroAmount(list[0]);
    say(bubble(`<p>Tiene varias ventas pendientes. ¿Cuál paga?</p>${chips(list.slice(0, 8).map((s) => [`${s.number} · ${money(D.sale.balance(s))}`, () => { me(s.number); cobroAmount(s); }]))}`), { delay: 300 });
  }
  function amountChips(bal, cb) {
    const rows = [[`Todo · ${money(bal)}`, () => { me('Todo'); cb(bal); }, 'gbtn--main']];
    if (bal > 2000) rows.push([`Mitad · ${money(Math.round(bal / 2))}`, () => { me('Mitad'); cb(Math.round(bal / 2)); }]);
    rows.push(['Otro valor', () => say(formBubble('¿De cuánto fue el pago?', [{ n: 'v', p: 'Valor', m: 'decimal' }], 'Aceptar', (f) => {
      const v = D.parseNum(f.get('v'));
      if (!(v > 0) || v > bal + 0.005) return say(bubble(`<p>Escribe un valor entre 1 y ${money(bal)}.</p>`));
      me(money(v));
      cb(v);
    }))]);
    return chips(rows);
  }
  function cobroAmount(s) {
    const bal = D.sale.balance(s);
    say(bubble(`<p>La venta <b>${esc(s.number)}</b> de ${esc(D.sale.customerName(s))} debe <b>${money(bal)}</b>. ¿Cuánto pagó?</p>${amountChips(bal, (amt) => cobroMethod(s, amt))}`), { delay: 300 });
  }
  function cobroMethod(s, amt) { say(bubble(`<p>¿Con qué método?</p>${methodChips((m) => cobroSave(s, amt, m))}`), { delay: 250 }); }
  function cobroSave(s, amt, method) {
    const before = D.sale.balance(s);
    D.addPayment('sale', s.id, { amount: amt, method, date: D.today() });
    const settled = amt >= before - 0.005;
    D.sound && D.sound.coin(settled);
    const bal = D.sale.balance(s);
    const c = D.sale.customer(s);
    const receipt = `<div class="grec"><div class="grec__h">🧾 Recibo de pago</div><div class="grec__s">${esc(D.fmtDate(D.today()))} · ${esc(D.sale.customerName(s))}</div><div class="grec__rule"></div>
      ${line('Factura', esc(s.number))}${line('Pagó', money(amt), 'grec__t')}${line('Método', esc(method))}<div class="grec__rule"></div>
      ${bal > 0 ? line('Saldo pendiente', money(bal), 'grec__bad') : line('Estado', '✅ Pagada', 'grec__ok')}</div>`;
    say(bubble(`<p>${settled ? '¡Venta pagada por completo! 🎉' : '¡Pago registrado! 💰'}</p>${receipt}${acts([
      ['📲 Enviar recibo por WhatsApp', () => withPhone(c, (ph) => D.wa.sendDoc(s, ph, D.wa.paymentText(s, amt), 'pago')), 'gbtn--wa'],
      ['Ver factura', () => D.invoice.open(s.id)],
      ['Otro pago', () => pagoStart()],
      ['Menú', toMenu, 'gbtn--ghost'],
    ])}`), { delay: 500 });
  }
  function pagoProv() {
    const open = D.data.purchases.filter((p) => D.purchase.balance(p) > 0);
    if (!open.length) return say(bubble(`<p>No tienes compras por pagar. 👌</p>${back()}`), { delay: 300 });
    say(bubble(`<p>¿Cuál compra pagaste?</p>${chips(open.slice(0, 8).map((p) => [`${short(D.purchase.supplierName(p))} · ${money(D.purchase.balance(p))}`, () => { me(D.purchase.supplierName(p)); pagoProvAmount(p); }]))}`), { delay: 300 });
  }
  function pagoProvAmount(p) {
    const bal = D.purchase.balance(p);
    say(bubble(`<p>Debes <b>${money(bal)}</b> a ${esc(D.purchase.supplierName(p))}. ¿Cuánto pagaste?</p>${amountChips(bal, (amt) => pagoProvMethod(p, amt))}`), { delay: 300 });
  }
  function pagoProvMethod(p, amt) {
    say(bubble(`<p>¿Con qué método?</p>${methodChips((m) => {
      D.addPayment('purchase', p.id, { amount: amt, method: m, date: D.today() });
      const left = D.purchase.balance(p);
      const sup = D.purchase.supplier(p);
      const text = `Hola ${sup ? sup.name : ''} 👋 Te acabo de pagar *${money(amt)}* (${m}). ${left > 0 ? `Queda un saldo de ${money(left)}.` : 'Con esto la cuenta queda al día ✅.'} Gracias. — ${D.data.settings.name}`;
      say(bubble(`<p>Pago registrado 📤</p><div class="grec"><div class="grec__h">🧾 Pago a proveedor</div><div class="grec__s">${esc(D.purchase.supplierName(p))}</div><div class="grec__rule"></div>${line('Pagaste', money(amt), 'grec__t')}${line('Método', esc(m))}${left > 0 ? line('Saldo', money(left), 'grec__bad') : line('Estado', '✅ Pagada', 'grec__ok')}</div>${acts([
        sup ? ['📲 Avisar al proveedor', () => D.wa.send(sup.phone, text), 'gbtn--wa'] : null,
        ['Menú', toMenu, 'gbtn--ghost'],
      ].filter(Boolean))}`), { delay: 500 });
    })}`), { delay: 250 });
  }

  /* ---------- Pendientes ---------- */
  function pendientes() {
    const open = openSales().sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date));
    if (!open.length) return say(bubble(`<p>¡No tienes cobros pendientes! 🎉</p>${back()}`), { delay: 300 });
    const over = open.filter((s) => D.sale.status(s) === 'overdue');
    const rows = open.slice(0, 6).map((s) => line(`${esc(D.sale.customerName(s))} · ${esc(s.number)}`, money(D.sale.balance(s)), D.sale.status(s) === 'overdue' ? 'grec__bad' : '')).join('');
    say(bubble(`<p>Te deben <b>${money(open.reduce((a, s) => a + D.sale.balance(s), 0))}</b> en ${D.plural(open.length, 'venta', 'ventas')}${over.length ? `, ${over.length} vencida${over.length > 1 ? 's' : ''}` : ''}:</p><div class="grec">${rows}${open.length > 6 ? `<div class="grec__s">…y ${open.length - 6} más</div>` : ''}</div>${acts([
      ['Registrar un pago', () => pagoStart(), 'gbtn--main'], ['Ir a Cobros', go('cobros')], ['Menú', toMenu, 'gbtn--ghost']])}`), { delay: 350 });
  }

  /* ==========================================================================
     Apertura: bienvenida la primera vez; después, siempre una conversación limpia con el menú
     ========================================================================== */
  function welcome() {
    const S = D.data.settings;
    const first = (S.owner || '').split(' ')[0];
    const route = D.router.route;
    let h = bubble(`<p>¡Hola${first ? ', ' + esc(first) : ''}! Soy <b>Dulce</b> 🧁, tu asistente en Dulza. Te guío y también hago el trabajo por ti: registro <b>ventas, compras y pagos</b> conversando, genero el comprobante y lo envío por WhatsApp.</p>${CONTEXT[route] ? `<p class="gnote">${esc(CONTEXT[route])}</p>` : ''}`);
    h += bubble(`<p><b>Primeros pasos</b></p>${checklist()}`);
    if (progress().next) h += next();
    h += menu('O dime qué hacemos ahora:');
    return h;
  }
  function fresh() {
    const S = D.data.settings;
    const first = (S.owner || '').split(' ')[0];
    const over = D.q.overdueCount ? D.q.overdueCount() : 0;
    return bubble(`<p>¡Hola${first ? ', ' + esc(first) : ''}! 🧁 ¿Qué hacemos?</p>${over ? `<p class="gnote">Tienes ${D.plural(over, 'cobro vencido', 'cobros vencidos')}.</p>` : ''}`) + menu('Elige una opción o escríbeme lo que necesitas:');
  }

  /* Cuando se completa un paso mientras el chat está abierto, lo celebra */
  D.store.on(() => {
    if (!sh || sh.closed) return;
    const n = progress().done;
    if (n > lastDone) {
      lastDone = n;
      const p = progress();
      setTimeout(() => say(bubble(`<p>✅ ¡Muy bien! Llevas <b>${p.done} de ${p.total}</b> primeros pasos.</p>`)), 900);
    }
  });

  function open(topic) {
    if (sh && !sh.closed) return;
    H = [];
    V = P = null; // cada conversación empieza de cero
    lastDone = progress().done;
    const first = !flag('seen');
    mark('seen');
    sh = D.sheet.open({
      title: 'Dulce',
      size: 'large',
      left: false,
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
      trackDirty: false,
      body: `<div class="guide__top"><span class="guide__who">${ava()}<span><b>Dulce</b><small>Tu asistente de Dulza</small></span></span><button type="button" class="gbtn gbtn--ghost guide__new" data-gnew>↺ Nuevo chat</button></div><div class="guide__msgs" aria-live="polite">${first ? welcome() : fresh()}</div>`,
      footer: `<form class="guide__form" autocomplete="off"><input class="guide__in" name="q" placeholder="Escribe: «vender», «cobrar», «comprar»…" enterkeyhint="send" autocomplete="off" aria-label="Escribe lo que necesitas"><button class="btn btn--sm" type="submit">Enviar</button></form>`,
      onClose: () => { sh = null; V = P = null; },
    });
    sh.body.style.paddingTop = '0'; // el encabezado fijo del chat llega hasta el borde: nada se asoma por encima al desplazar
    sh.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-gnew]')) {
        // nuevo chat: se borra la conversación y vuelve el menú
        H = [];
        V = P = null;
        $('.guide__msgs', sh.el).innerHTML = fresh();
        sh.body.scrollTo({ top: 0 });
        return;
      }
      const b = e.target.closest('[data-gh]');
      if (!b) return;
      const fn = H[+b.dataset.gh];
      fn && fn(null, lastEl());
    });
    sh.el.addEventListener('submit', (e) => {
      e.preventDefault();
      const gf = e.target.closest('[data-gf]');
      if (gf) {
        const fn = H[+gf.dataset.gf];
        const fd = new FormData(gf);
        fd.target = gf;
        fn && fn(fd, gf.closest('.gmsg__b'));
        return;
      }
      const inp = $('.guide__in', sh.el);
      const q = inp.value.trim();
      if (!q) return;
      inp.value = '';
      const act = intent(q);
      if (act) { me(q); act(); } else ask(q);
    });
    if (topic) {
      const map = { venta: ventaStart, compra: compraStart, pago: pagoStart };
      setTimeout(() => (map[topic] ? map[topic]() : (() => { const e = KB.find((x) => x.k.includes(topic)); e && ask(e.t, e); })()), 600);
    }
  }

  /* ==========================================================================
     Botón flotante con la carita de Dulce, tarjeta del Inicio y oferta inicial
     ========================================================================== */
  function mount() {
    if ($('.bot-fab')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bot-fab';
    b.setAttribute('data-act', 'guide.open');
    b.setAttribute('aria-label', 'Abrir a Dulce, tu asistente');
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
    let seen = false;
    try { seen = sessionStorage.getItem('dulza-bot-tip') === '1'; sessionStorage.setItem('dulza-bot-tip', '1'); } catch (e) {}
    if (!seen) {
      const tip = $('.bot-fab__tip', b);
      setTimeout(() => { tip.hidden = false; tip.classList.add('is-in'); }, 1600);
      setTimeout(() => { tip.classList.remove('is-in'); setTimeout(() => (tip.hidden = true), 260); }, 8000);
    }
  }

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
  D.act['guide.hide'] = () => { mark('hide'); D.toast('Puedes volver a abrir a Dulce con su botón', { icon: 'sparkle' }); D.router.render({ force: true }); };

  D.guide = { open, card, progress, STEPS, KB, find, intent, mount, _norm: norm };

  D.guide.offer = () => {
    if (flag('seen') || flag('offered') || D.data.sales.length || !D.data.settings.onboarded) return;
    mark('offered');
    setTimeout(() => D.toast('¿Quieres que te guíe? Soy Dulce 🧁', { icon: 'sparkle', action: { label: 'Sí, guíame', fn: () => open() } }), 1800);
  };
})();
