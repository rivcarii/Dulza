/* Dulza · módulo de consulta
   Una hoja con filtros combinables (cliente o proveedor, estado, fechas, valores, texto…) que muestra al instante cuántos
   registros hay, los totales y la lista, y permite descargar el resultado en CSV. Está en Ventas, Cobros y Compras. */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const F = D.forms;
  const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const STATUS = { paid: 'Pagada', pending: 'Por cobrar', partial: 'Abonada', overdue: 'Vencida' };
  const MAX_ROWS = 40;

  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const select = (name, label, opts) => `<label class="field"><span>${label}</span><select name="${name}">${opts.map(([v, l]) => opt(v, l)).join('')}</select></label>`;
  const date = (name, label) => `<label class="field"><span>${label}</span><input type="date" name="${name}"></label>`;
  const text = (name, label, ph, mode) => `<label class="field"><span>${label}</span><input name="${name}" ${mode ? `inputmode="${mode}"` : ''} placeholder="${ph}" autocomplete="off"></label>`;
  const stat = (label, val, bad) => `<div class="summary__item ${bad ? 'summary__item--bad' : ''}"><small>${label}</small><b>${val}</b></div>`;
  const inRange = (v, from, to) => !((from && v < from) || (to && v > to));
  const inAmount = (n, min, max) => !((min && n < D.parseNum(min)) || (max && n > D.parseNum(max)));
  const bucket = (doc) => {
    const n = D.diffDays(doc.due || doc.date, D.today());
    return n < 0 ? 'vencidas' : n <= 7 ? 'semana' : 'despues';
  };
  const byDate = (a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0);

  /* ---------- Una configuración por pantalla ---------- */
  const KINDS = {
    ventas: {
      title: 'Consultar ventas',
      fields: () => `<div class="fields">
          ${select('cliente', 'Cliente', [['', 'Todos'], ...D.data.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => [c.id, c.name])])}
          ${select('postre', 'Postre', [['', 'Todos'], ...D.data.products.map((p) => [p.name, p.name])])}
          ${select('estado', 'Estado', [['', 'Todos'], ['abiertas', 'Con saldo pendiente'], ['overdue', 'Vencidas'], ['partial', 'Abonadas'], ['paid', 'Pagadas']])}
        </div>
        <div class="fields fields--2" style="margin-top:12px">${date('desde', 'Desde')}${date('hasta', 'Hasta')}</div>
        <div class="fields fields--2" style="margin-top:12px">${text('min', 'Total mínimo', '0', 'decimal')}${text('max', 'Total máximo', 'Sin tope', 'decimal')}</div>
        <div class="fields" style="margin-top:12px">${text('q', 'Buscar texto', 'Factura, nota o postre')}</div>`,
      run(v) {
        const q = norm(v.q);
        const docs = D.data.sales.filter((s) => {
          const st = D.sale.status(s);
          if (v.cliente && s.customerId !== v.cliente) return false;
          if (v.postre && !s.items.some((i) => i.name === v.postre)) return false;
          if (v.estado === 'abiertas' ? st === 'paid' : v.estado && st !== v.estado) return false;
          if (!inRange(s.date, v.desde, v.hasta) || !inAmount(D.sale.total(s), v.min, v.max)) return false;
          if (q && !norm(`${D.sale.customerName(s)} ${s.number} ${s.note || ''} ${s.items.map((i) => i.name).join(' ')}`).includes(q)) return false;
          return true;
        }).sort(byDate);
        const bal = sum(docs, D.sale.balance);
        return {
          docs,
          stats: stat('Vendido', D.moneyC(sum(docs, D.sale.total))) + stat('Cobrado', D.moneyC(sum(docs, D.sale.paid))) + stat('Por cobrar', D.moneyC(bal), bal > 0),
          row: (s) => F.saleRow(s),
          csv: [['Factura', 'Fecha', 'Cliente', 'Postres', 'Total', 'Pagado', 'Saldo', 'Estado', 'Vence'], ...docs.map((s) => [s.number, s.date, D.sale.customerName(s), s.items.map((i) => `${i.qty}x ${i.name}`).join(' | '), D.sale.total(s), D.sale.paid(s), D.sale.balance(s), STATUS[D.sale.status(s)], s.term ? s.due : ''])],
          file: 'consulta-ventas',
        };
      },
    },

    cobros: {
      title: 'Consultar cobros',
      fields: () => `<div class="fields">
          ${select('tipo', 'Qué consultar', [['cobrar', 'Lo que me deben (clientes)'], ['pagar', 'Lo que debo (proveedores)']])}
          <label class="field" data-party><span>Cliente</span><select name="parte"></select></label>
          ${select('estado', 'Vencimiento', [['', 'Todos'], ['vencidas', 'Vencidos'], ['semana', 'En los próximos 7 días'], ['despues', 'Más adelante']])}
        </div>
        <div class="fields fields--2" style="margin-top:12px">${date('desde', 'Vence desde')}${date('hasta', 'Vence hasta')}</div>
        <div class="fields fields--2" style="margin-top:12px">${text('min', 'Saldo mínimo', '0', 'decimal')}${text('max', 'Saldo máximo', 'Sin tope', 'decimal')}</div>`,
      run(v) {
        const pagar = v.tipo === 'pagar';
        const all = pagar ? D.data.purchases : D.data.sales;
        const balFn = pagar ? D.purchase.balance : D.sale.balance;
        const docs = all.filter((d) => {
          if (!(balFn(d) > 0)) return false;
          if (v.parte && (pagar ? d.supplierId : d.customerId) !== v.parte) return false;
          if (v.estado && bucket(d) !== v.estado) return false;
          return inRange(d.due || d.date, v.desde, v.hasta) && inAmount(balFn(d), v.min, v.max);
        }).sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date));
        const over = sum(docs.filter((d) => bucket(d) === 'vencidas'), balFn);
        const name = (d) => (pagar ? D.purchase.supplierName(d) : D.sale.customerName(d));
        return {
          docs,
          stats: stat(pagar ? 'Por pagar' : 'Por cobrar', D.moneyC(sum(docs, balFn))) + stat('Vencido', D.moneyC(over), over > 0) + stat('Registros', String(docs.length)),
          row: (d) => (pagar ? F.purchaseRow(d) : F.saleRow(d)),
          csv: [[pagar ? 'Proveedor' : 'Cliente', pagar ? 'Compra' : 'Factura', 'Fecha', 'Vence', 'Total', 'Pagado', 'Saldo', 'Estado'], ...docs.map((d) => [name(d), pagar ? D.purchase.summary(d) : d.number, d.date, d.due || '', pagar ? D.purchase.total(d) : D.sale.total(d), pagar ? D.purchase.paid(d) : D.sale.paid(d), balFn(d), bucket(d) === 'vencidas' ? 'Vencida' : 'Al día'])],
          file: pagar ? 'consulta-por-pagar' : 'consulta-por-cobrar',
          afterRender(root) {
            const sel = $('[name=parte]', root);
            const want = pagar ? 'prov' : 'cli';
            if (sel.dataset.kind === want) return;
            sel.dataset.kind = want;
            const list = pagar ? D.data.suppliers : D.data.customers;
            sel.innerHTML = opt('', 'Todos') + list.slice().sort((a, b) => a.name.localeCompare(b.name)).map((x) => opt(x.id, x.name)).join('');
            sel.previousElementSibling && (sel.previousElementSibling.textContent = pagar ? 'Proveedor' : 'Cliente');
          },
        };
      },
    },

    compras: {
      title: 'Consultar compras',
      fields: () => `<div class="fields">
          ${select('proveedor', 'Proveedor', [['', 'Todos'], ['-', 'Sin proveedor'], ...D.data.suppliers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => [s.id, s.name])])}
          ${select('estado', 'Estado', [['', 'Todas'], ['abiertas', 'Por pagar'], ['overdue', 'Vencidas'], ['paid', 'Pagadas']])}
        </div>
        <div class="fields fields--2" style="margin-top:12px">${date('desde', 'Desde')}${date('hasta', 'Hasta')}</div>
        <div class="fields fields--2" style="margin-top:12px">${text('min', 'Total mínimo', '0', 'decimal')}${text('max', 'Total máximo', 'Sin tope', 'decimal')}</div>
        <div class="fields" style="margin-top:12px">${text('q', 'Buscar insumo', 'Harina, leche…')}</div>`,
      run(v) {
        const q = norm(v.q);
        const docs = D.data.purchases.filter((p) => {
          const st = D.purchase.status(p);
          if (v.proveedor === '-' ? p.supplierId : v.proveedor && p.supplierId !== v.proveedor) return false;
          if (v.estado === 'abiertas' ? st === 'paid' : v.estado && st !== v.estado) return false;
          if (!inRange(p.date, v.desde, v.hasta) || !inAmount(D.purchase.total(p), v.min, v.max)) return false;
          if (q && !norm(`${D.purchase.supplierName(p)} ${p.note || ''} ${p.items.map((i) => i.name).join(' ')}`).includes(q)) return false;
          return true;
        }).sort(byDate);
        const bal = sum(docs, D.purchase.balance);
        return {
          docs,
          stats: stat('Comprado', D.moneyC(sum(docs, D.purchase.total))) + stat('Pagado', D.moneyC(sum(docs, D.purchase.paid))) + stat('Por pagar', D.moneyC(bal), bal > 0),
          row: (p) => F.purchaseRow(p),
          csv: [['Fecha', 'Proveedor', 'Insumos', 'Total', 'Pagado', 'Saldo', 'Vence'], ...docs.map((p) => [p.date, D.purchase.supplierName(p), p.items.map((i) => `${i.qty} ${i.unit || ''} ${i.name}`).join(' | '), D.purchase.total(p), D.purchase.paid(p), D.purchase.balance(p), p.term ? p.due : ''])],
          file: 'consulta-compras',
        };
      },
    },
  };

  function open(kind) {
    const cfg = KINDS[kind];
    if (!cfg) return;
    const sh = D.sheet.open({
      title: cfg.title,
      size: 'large',
      trackDirty: false,
      body: `<form class="consulta" autocomplete="off" novalidate>${cfg.fields()}<div class="summary" data-stats></div><p class="consulta__n" data-count aria-live="polite"></p><div data-rows></div></form>`,
      footer: `<div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:10px"><button type="button" class="btn btn--tint" data-cs="csv">${D.icon('download')}Descargar CSV</button><button type="button" class="btn btn--plain" data-cs="clear">Limpiar</button></div>`,
    });
    const form = $('form.consulta', sh.el);
    let last = null;
    const values = () => Object.fromEntries(new FormData(form));
    const render = () => {
      last = cfg.run(values());
      if (last.afterRender) {
        last.afterRender(form); // Cobros: cambia la lista de Cliente / Proveedor según el tipo
        last = cfg.run(values());
      }
      $('[data-stats]', form).innerHTML = last.stats;
      $('[data-count]', form).textContent = `${D.plural(last.docs.length, 'resultado', 'resultados')}`;
      const rows = last.docs.slice(0, MAX_ROWS).map(last.row).join('');
      $('[data-rows]', form).innerHTML = last.docs.length
        ? `<div class="list">${rows}</div>${last.docs.length > MAX_ROWS ? `<p class="consulta__more">Se muestran ${MAX_ROWS} de ${last.docs.length}. Descarga el CSV para verlos todos.</p>` : ''}`
        : D.ui.empty({ title: 'Sin resultados', text: 'Prueba quitando algún filtro.', mood: 'sleepy' });
    };
    // el selector de «Cliente / Proveedor» de Cobros depende del tipo: se arma antes del primer cálculo
    if (kind === 'cobros') { const l = KINDS.cobros.run(values()); l.afterRender(form); }
    render();
    form.addEventListener('input', render);
    form.addEventListener('change', (e) => {
      if (kind === 'cobros' && e.target.name === 'tipo') { const s = $('[name=parte]', form); s.dataset.kind = ''; }
      render();
    });
    form.addEventListener('submit', (e) => e.preventDefault());
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cs]');
      if (!b) return;
      if (b.dataset.cs === 'clear') {
        form.reset();
        if (kind === 'cobros') { const s = $('[name=parte]', form); s.dataset.kind = ''; }
        render();
        D.haptic && D.haptic(8);
      } else if (last) {
        D.download(new Blob([D.csv(last.csv)], { type: 'text/csv;charset=utf-8' }), `${last.file}-${D.today()}.csv`);
        D.toast('Consulta descargada', { icon: 'download' });
      }
    });
  }

  D.act['consulta.open'] = (el) => open(el.dataset.kind);
  D.consulta = { open };
})();
