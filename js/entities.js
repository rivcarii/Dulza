/* Dulza · clientes, postres, proveedores y hojas de detalle */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const F = D.forms;

  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const telHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
  const tile = (icon, label, attrs, cls = '') => `<button type="button" class="act-tile ${cls}" ${attrs}>${D.icon(icon)}<span>${esc(label)}</span></button>`;
  const tileLink = (icon, label, href, cls = '') => `<a class="act-tile ${cls}" href="${href}">${D.icon(icon)}<span>${esc(label)}</span></a>`;
  const actionRow = (icon, label, attrs, tone = '') => `<button type="button" class="row row--tap row--noavatar ${tone === 'bad' ? 'row--bad' : ''}" ${attrs}><span class="row__icon">${D.icon(icon)}</span><span class="row__main"><span class="row__title">${esc(label)}</span></span></button>`;

  /* Filas de pagos con opción de eliminar */
  const paymentRows = (doc, kind, id) =>
    (doc.payments || []).length
      ? `<div class="form-title">${kind === 'sale' ? 'Abonos recibidos' : 'Pagos realizados'}</div><div class="list timeline">${doc.payments
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(
            (p) => `<div class="row row--noavatar"><span class="act__ic act__ic--pay">${D.icon('check')}</span><span class="row__main"><span class="row__title">${D.money(p.amount)}</span><span class="row__sub">${D.fmtDate(p.date)} · ${esc(p.method)}${p.note ? ' · ' + esc(p.note) : ''}</span></span><button class="icon-btn icon-btn--sm" data-act="pay.del" data-kind="${kind}" data-id="${id}" data-pid="${p.id}" aria-label="Eliminar pago de ${D.money(p.amount)}">${D.icon('trash')}</button></div>`
          )
          .join('')}</div>`
      : '';

  /* ==========================================================================
     Detalle de venta
     ========================================================================== */
  F.saleDetail = (id) => {
    const render = () => {
      const s = D.sale.byId(id);
      if (!s) return '';
      const c = D.sale.customer(s);
      const st = D.sale.status(s);
      const bal = D.sale.balance(s);
      const total = D.sale.total(s);
      return `
      <div class="detail-head">
        ${D.mood(D.SALE_MOOD[st], { cls: 'mood--lg' })}
        ${c ? `<button class="card__link" data-act="customer.open" data-id="${c.id}" style="font-size:1.05rem">${esc(c.name)}${D.icon('chevR', 'i--inline')}</button>` : '<p class="muted" style="font-weight:600">Cliente ocasional</p>'}
        <div class="detail-head__amount">${D.money(total)}</div>
        <div class="row-flex" style="gap:8px;flex-wrap:wrap;justify-content:center">${D.ui.statusChip(st)}${D.ui.chip('neutral', s.term === 0 ? 'Contado' : `A ${s.term} días`, 'calendar')}</div>
        <p class="muted" style="font-size:.9rem">${esc(s.number)} · ${D.fmtDate(s.date)}${bal > 0 && s.due ? ` · ${esc(D.ui.dueText(s, bal))}` : ''}</p>
      </div>
      <div class="detail-actions">
        ${tile('file', 'Factura', `data-act="sale.invoice" data-id="${id}"`)}
        ${tile('whatsapp', 'WhatsApp', `data-act="sale.wa" data-id="${id}"`, 'act-tile--wa')}
        ${bal > 0 ? tile('wallet', 'Abonar', `data-act="sale.pay" data-id="${id}"`) : ''}
        ${bal > 0 ? tile('clock', 'Recordar', `data-act="sale.remind" data-id="${id}"`) : ''}
      </div>
      <div class="form-title">Postres</div>
      <div class="list">${s.items
        .map((i) => `<div class="row row--noavatar"><span class="avatar avatar--emoji">${D.glyph(i.emoji)}</span><span class="row__main"><span class="row__title">${esc(i.name)}</span><span class="row__sub">${i.qty} × ${D.money(i.price)}</span></span><span class="row__amount">${D.money(i.qty * i.price)}</span></div>`)
        .join('')}</div>
      <div class="card" style="margin-top:14px;padding:12px 18px">
        <div class="kv"><span>Subtotal</span><b>${D.money(D.sale.subtotal(s))}</b></div>
        ${s.discount > 0 ? `<div class="kv"><span>Descuento</span><b>− ${D.money(s.discount)}</b></div>` : ''}
        <div class="kv"><span>Abonado</span><b>${D.money(D.sale.paid(s))}</b></div>
        <div class="kv kv--total ${bal > 0 && st === 'overdue' ? 'kv--due' : ''}"><span>${bal > 0 ? 'Saldo pendiente' : 'Total'}</span><b>${D.money(bal > 0 ? bal : total)}</b></div>
      </div>
      ${paymentRows(s, 'sale', id)}
      ${s.note ? `<div class="form-title">Nota</div><div class="card"><p class="selectable">${esc(s.note)}</p></div>` : ''}
      <div class="list" style="margin-top:18px">
        ${actionRow('edit', 'Editar venta', `data-act="sale.edit" data-id="${id}"`)}
        ${actionRow('trash', 'Eliminar venta', `data-act="sale.del" data-id="${id}"`, 'bad')}
      </div>`;
    };
    const s = D.sale.byId(id);
    if (!s) return;
    const sh = D.sheet.open({ title: s.number, size: 'large', body: render() });
    F.live(sh, render, () => !!D.sale.byId(id));
    return sh;
  };
  D.act['sale.open'] = (el) => F.saleDetail(el.dataset.id);
  D.act['sale.edit'] = (el) => F.sale({ id: el.dataset.id });

  /* ==========================================================================
     Detalle de compra
     ========================================================================== */
  F.purchaseDetail = (id) => {
    const render = () => {
      const p = D.purchase.byId(id);
      if (!p) return '';
      const st = D.purchase.status(p);
      const bal = D.purchase.balance(p);
      const total = D.purchase.total(p);
      return `
      <div class="detail-head">
        <span class="avatar avatar--lg avatar--emoji">🛒</span>
        <p style="font-weight:650;font-size:1.05rem">${esc(D.purchase.supplierName(p))}</p>
        <div class="detail-head__amount">${D.money(total)}</div>
        <div class="row-flex" style="gap:8px;flex-wrap:wrap;justify-content:center">${D.ui.statusChip(st)}${D.ui.chip('neutral', p.term === 0 ? 'Contado' : `A ${p.term} días`, 'calendar')}</div>
        <p class="muted" style="font-size:.9rem">${D.fmtDate(p.date)}${bal > 0 && p.due ? ` · ${esc(D.ui.dueText(p, bal))}` : ''}</p>
      </div>
      <div class="detail-actions">
        ${bal > 0 ? tile('wallet', 'Registrar pago', `data-act="purchase.pay" data-id="${id}"`) : ''}
        ${tile('edit', 'Editar', `data-act="purchase.edit" data-id="${id}"`)}
      </div>
      <div class="form-title">Insumos</div>
      <div class="list">${p.items
        .map((i) => `<div class="row row--noavatar"><span class="avatar avatar--emoji">${D.icon('box')}</span><span class="row__main"><span class="row__title">${esc(i.name)}</span><span class="row__sub">${D.fmtNum(i.qty, i.qty % 1 ? 2 : 0)} ${esc(i.unit || 'u')} × ${D.money(i.cost)}</span></span><span class="row__amount">${D.money(i.qty * i.cost)}</span></div>`)
        .join('')}</div>
      <div class="card" style="margin-top:14px;padding:12px 18px">
        <div class="kv"><span>Total</span><b>${D.money(total)}</b></div>
        <div class="kv"><span>Pagado</span><b>${D.money(D.purchase.paid(p))}</b></div>
        <div class="kv kv--total ${bal > 0 && st === 'overdue' ? 'kv--due' : ''}"><span>${bal > 0 ? 'Por pagar' : 'Pagada'}</span><b>${D.money(bal)}</b></div>
      </div>
      ${paymentRows(p, 'purchase', id)}
      ${p.note ? `<div class="form-title">Nota</div><div class="card"><p class="selectable">${esc(p.note)}</p></div>` : ''}
      <div class="list" style="margin-top:18px">${actionRow('trash', 'Eliminar compra', `data-act="purchase.del" data-id="${id}"`, 'bad')}</div>`;
    };
    if (!D.purchase.byId(id)) return;
    const sh = D.sheet.open({ title: 'Compra', size: 'large', body: render() });
    F.live(sh, render, () => !!D.purchase.byId(id));
    return sh;
  };
  D.act['purchase.open'] = (el) => F.purchaseDetail(el.dataset.id);
  D.act['purchase.edit'] = (el) => F.purchase({ id: el.dataset.id });

  /* ==========================================================================
     Clientes
     ========================================================================== */
  F.customer = (opts = {}) =>
    new Promise((resolve) => {
      const c = opts.id ? D.customer.byId(opts.id) : null;
      let saved = null;
      const sh = D.sheet.open({
        title: c ? 'Editar cliente' : 'Nuevo cliente',
        right: { label: 'Guardar', disabled: !c, onClick: () => commit() },
        form: true,
        body: `<div class="fields">
          <label class="field"><span>Nombre</span><input name="name" value="${esc(c ? c.name : '')}" placeholder="Nombre del cliente" autocomplete="off" autocapitalize="words" data-autofocus></label>
          <label class="field"><span>WhatsApp</span><input name="phone" type="tel" inputmode="tel" value="${esc(c ? c.phone : '')}" placeholder="${D.data.settings.dial ? '300 123 4567' : '+57 300 123 4567'}" autocomplete="off"></label>
          <label class="field"><span>Dirección</span><input name="address" value="${esc(c ? c.address : '')}" placeholder="Opcional" autocomplete="off" autocapitalize="sentences"></label>
        </div>
        <div class="form-title">Notas</div>
        <div class="fields"><label class="field field--area"><span class="sr-only">Notas</span><textarea name="notes" rows="3" placeholder="Gustos, alergias, días de entrega…">${esc(c ? c.notes : '')}</textarea></label></div>
        <p class="form-note">Con el número de WhatsApp podrás enviarle facturas y recordatorios con un toque.</p>`,
        onClose: () => resolve(saved),
      });
      sh.el.addEventListener('input', () => sh.setPrimary(null, !$('[name=name]', sh.el).value.trim()));
      function commit() {
        const v = D.ui.read(sh.body);
        if (!v.name) return;
        const rec = c || { id: D.uid(), createdAt: Date.now() };
        Object.assign(rec, { name: v.name, phone: v.phone, address: v.address, notes: v.notes });
        if (!c) D.data.customers.push(rec);
        D.store.commit('customers');
        saved = rec.id;
        sh.close('force');
        D.toast(c ? 'Cliente actualizado' : 'Cliente guardado');
      }
    });

  F.customerDetail = (id) => {
    const render = () => {
      const c = D.customer.byId(id);
      if (!c) return '';
      const st = D.customer.stats(id);
      const list = D.customer.sales(id).sort((a, b) => b.date.localeCompare(a.date));
      return `
      <div class="detail-head">
        ${D.ui.avatar(c.name, 'avatar--lg')}
        <p style="font-weight:700;font-size:1.3rem;letter-spacing:-.02em">${esc(c.name)}</p>
        ${c.phone ? `<p class="muted selectable">${esc(c.phone)}</p>` : '<p class="muted">Sin WhatsApp guardado</p>'}
        ${c.address ? `<p class="muted selectable" style="font-size:.9rem">${esc(c.address)}</p>` : ''}
      </div>
      <div class="detail-actions">
        ${c.phone ? tile('whatsapp', 'WhatsApp', `data-act="customer.wa" data-id="${id}"`, 'act-tile--wa') : ''}
        ${c.phone ? tileLink('phone', 'Llamar', telHref(c.phone)) : ''}
        ${tile('plus', 'Nueva venta', `data-act="customer.sale" data-id="${id}"`)}
        ${st.balance > 0 ? tile('clock', 'Recordar pago', `data-act="customer.remind" data-id="${id}"`) : ''}
      </div>
      <div class="summary" style="margin-top:16px">
        <div class="summary__item"><small>Comprado</small><b>${D.moneyC(st.total)}</b></div>
        <div class="summary__item ${st.balance > 0 ? 'summary__item--bad' : ''}"><small>Debe</small><b>${D.moneyC(st.balance)}</b></div>
        <div class="summary__item"><small>Compras</small><b>${st.count}</b></div>
      </div>
      ${c.notes ? `<div class="form-title">Notas</div><div class="card"><p class="selectable">${esc(c.notes)}</p></div>` : ''}
      <div class="form-title">Historial de ventas</div>
      ${list.length ? `<div class="list">${list.map(F.saleRow).join('')}</div>` : '<div class="card"><p class="muted center">Todavía no le has vendido.</p></div>'}
      <div class="list" style="margin-top:18px">
        ${actionRow('edit', 'Editar cliente', `data-act="customer.edit" data-id="${id}"`)}
        ${actionRow('trash', 'Eliminar cliente', `data-act="customer.del" data-id="${id}"`, 'bad')}
      </div>`;
    };
    if (!D.customer.byId(id)) return;
    const sh = D.sheet.open({ title: 'Cliente', size: 'large', body: render() });
    F.live(sh, render, () => !!D.customer.byId(id));
    return sh;
  };

  /* Fila reutilizable de venta (listas) */
  F.saleRow = (s, opts = {}) => {
    const st = D.sale.status(s);
    const bal = D.sale.balance(s);
    const units = D.sale.units(s);
    const name = D.sale.customerName(s);
    const sub = opts.byCustomer
      ? `${s.number} · ${D.fmtDate(s.date)}`
      : `${s.number} · ${D.plural(units, 'postre', 'postres')}${bal > 0 && s.due ? ' · ' + D.ui.dueText(s, bal) : ''}`;
    return `<button type="button" class="row row--tap" data-act="sale.open" data-id="${s.id}">
      <span class="avwrap">${opts.byCustomer ? D.ui.emoji(s.items[0] && s.items[0].emoji) : D.ui.avatar(name)}${D.mood(D.SALE_MOOD[st], { cls: 'mood-badge' })}</span>
      <span class="row__main"><span class="row__title">${esc(opts.byCustomer ? D.plural(units, 'postre', 'postres') : name)}</span><span class="row__sub">${esc(sub)}</span></span>
      <span class="row__end"><span class="row__amount">${D.money(D.sale.total(s))}</span>${D.ui.statusChip(st)}</span></button>`;
  };
  F.purchaseRow = (p) => {
    const st = D.purchase.status(p);
    const bal = D.purchase.balance(p);
    return `<button type="button" class="row row--tap" data-act="purchase.open" data-id="${p.id}">
      ${D.ui.emoji('🛒')}
      <span class="row__main"><span class="row__title">${esc(D.purchase.supplierName(p))}</span><span class="row__sub">${esc(D.purchase.summary(p))}${bal > 0 && p.due ? ' · ' + D.ui.dueText(p, bal) : ''}</span></span>
      <span class="row__end"><span class="row__amount">${D.money(D.purchase.total(p))}</span>${D.ui.statusChip(st)}</span></button>`;
  };

  D.act['customer.new'] = () => F.customer();
  D.act['customer.open'] = (el) => F.customerDetail(el.dataset.id);
  D.act['customer.edit'] = (el) => F.customer({ id: el.dataset.id });
  D.act['customer.sale'] = (el) => F.sale({ customerId: el.dataset.id });
  D.act['customer.wa'] = (el) => {
    const c = D.customer.byId(el.dataset.id);
    c && D.wa.send(c.phone, `Hola ${c.name} 🧁`);
  };
  D.act['customer.remind'] = (el) => {
    const c = D.customer.byId(el.dataset.id);
    if (!c) return;
    const open = D.customer.sales(c.id).filter((s) => D.sale.balance(s) > 0).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
    if (!open.length) return D.toast('No tiene saldos pendientes', { tone: 'info', icon: 'info' });
    // con una sola factura abierta se copia también su imagen; con varias va solo el texto con la lista
    if (open.length === 1) D.wa.sendDoc(open[0], c.phone, D.wa.reminderText(open, c.name));
    else D.wa.send(c.phone, D.wa.reminderText(open, c.name));
  };
  D.act['customer.del'] = async (el) => {
    const c = D.customer.byId(el.dataset.id);
    if (!c) return;
    const n = D.customer.sales(c.id).length;
    if (n) return D.alert('No se puede eliminar', `${c.name} tiene ${D.plural(n, 'venta registrada', 'ventas registradas')}. Puedes editar sus datos, pero conserva su historial.`);
    if (await D.confirm({ title: `¿Eliminar a ${c.name}?`, ok: 'Eliminar', danger: true })) F.removeWithUndo(D.data.customers, c, 'customers', 'Cliente eliminado');
  };

  /* ==========================================================================
     Proveedores
     ========================================================================== */
  F.supplier = (opts = {}) =>
    new Promise((resolve) => {
      const s = opts.id ? D.supplier.byId(opts.id) : null;
      let saved = null;
      const sh = D.sheet.open({
        title: s ? 'Editar proveedor' : 'Nuevo proveedor',
        right: { label: 'Guardar', disabled: !s, onClick: () => commit() },
        form: true,
        body: `<div class="fields">
          <label class="field"><span>Nombre</span><input name="name" value="${esc(s ? s.name : '')}" placeholder="Nombre o negocio" autocomplete="off" autocapitalize="words" data-autofocus></label>
          <label class="field"><span>WhatsApp</span><input name="phone" type="tel" inputmode="tel" value="${esc(s ? s.phone : '')}" placeholder="Opcional" autocomplete="off"></label>
          <label class="field"><span>Productos</span><input name="notes" value="${esc(s ? s.notes : '')}" placeholder="Ej.: harinas y azúcar" autocomplete="off"></label>
        </div>`,
        onClose: () => resolve(saved),
      });
      sh.el.addEventListener('input', () => sh.setPrimary(null, !$('[name=name]', sh.el).value.trim()));
      function commit() {
        const v = D.ui.read(sh.body);
        if (!v.name) return;
        const rec = s || { id: D.uid(), createdAt: Date.now() };
        Object.assign(rec, { name: v.name, phone: v.phone, notes: v.notes });
        if (!s) D.data.suppliers.push(rec);
        D.store.commit('suppliers');
        saved = rec.id;
        sh.close('force');
        D.toast(s ? 'Proveedor actualizado' : 'Proveedor guardado');
      }
    });

  F.supplierDetail = (id) => {
    const render = () => {
      const s = D.supplier.byId(id);
      if (!s) return '';
      const st = D.supplier.stats(id);
      const list = D.data.purchases.filter((p) => p.supplierId === id).sort((a, b) => b.date.localeCompare(a.date));
      return `
      <div class="detail-head">
        ${D.ui.avatar(s.name, 'avatar--lg')}
        <p style="font-weight:700;font-size:1.3rem;letter-spacing:-.02em">${esc(s.name)}</p>
        ${s.phone ? `<p class="muted selectable">${esc(s.phone)}</p>` : ''}
        ${s.notes ? `<p class="muted" style="font-size:.9rem">${esc(s.notes)}</p>` : ''}
      </div>
      <div class="detail-actions">
        ${s.phone ? tile('whatsapp', 'WhatsApp', `data-act="supplier.wa" data-id="${id}"`, 'act-tile--wa') : ''}
        ${s.phone ? tileLink('phone', 'Llamar', telHref(s.phone)) : ''}
        ${tile('plus', 'Nueva compra', `data-act="supplier.buy" data-id="${id}"`)}
      </div>
      <div class="summary" style="margin-top:16px">
        <div class="summary__item"><small>Comprado</small><b>${D.moneyC(st.total)}</b></div>
        <div class="summary__item ${st.balance > 0 ? 'summary__item--bad' : ''}"><small>Por pagar</small><b>${D.moneyC(st.balance)}</b></div>
        <div class="summary__item"><small>Compras</small><b>${st.count}</b></div>
      </div>
      <div class="form-title">Historial de compras</div>
      ${list.length ? `<div class="list">${list.map(F.purchaseRow).join('')}</div>` : '<div class="card"><p class="muted center">Todavía no le has comprado.</p></div>'}
      <div class="list" style="margin-top:18px">
        ${actionRow('edit', 'Editar proveedor', `data-act="supplier.edit" data-id="${id}"`)}
        ${actionRow('trash', 'Eliminar proveedor', `data-act="supplier.del" data-id="${id}"`, 'bad')}
      </div>`;
    };
    if (!D.supplier.byId(id)) return;
    const sh = D.sheet.open({ title: 'Proveedor', size: 'large', body: render() });
    F.live(sh, render, () => !!D.supplier.byId(id));
    return sh;
  };
  D.act['supplier.new'] = () => F.supplier();
  D.act['supplier.open'] = (el) => F.supplierDetail(el.dataset.id);
  D.act['supplier.edit'] = (el) => F.supplier({ id: el.dataset.id });
  D.act['supplier.buy'] = (el) => F.purchase({ supplierId: el.dataset.id });
  D.act['supplier.wa'] = (el) => {
    const s = D.supplier.byId(el.dataset.id);
    s && D.wa.send(s.phone, `Hola ${s.name} 👋`);
  };
  D.act['supplier.del'] = async (el) => {
    const s = D.supplier.byId(el.dataset.id);
    if (!s) return;
    const n = D.data.purchases.filter((p) => p.supplierId === s.id).length;
    if (n) return D.alert('No se puede eliminar', `${s.name} tiene ${D.plural(n, 'compra registrada', 'compras registradas')}. Puedes editar sus datos, pero conserva su historial.`);
    if (await D.confirm({ title: `¿Eliminar a ${s.name}?`, ok: 'Eliminar', danger: true })) F.removeWithUndo(D.data.suppliers, s, 'suppliers', 'Proveedor eliminado');
  };

  /* ==========================================================================
     Postres (catálogo)
     ========================================================================== */
  F.product = (opts = {}) =>
    new Promise((resolve) => {
      const p = opts.id ? D.product.byId(opts.id) : null;
      const st = { emoji: p ? p.emoji || D.DEFAULT_GLYPH : D.DEFAULT_GLYPH, active: p ? p.active !== false : true };
      let saved = null;
      const cats = Array.from(new Set(D.data.products.map((x) => x.category).filter(Boolean)));
      const sh = D.sheet.open({
        title: p ? 'Editar postre' : 'Nuevo postre',
        right: { label: 'Guardar', disabled: !p, onClick: () => commit() },
        form: true,
        size: 'large',
        body: `<div class="detail-head" style="padding-bottom:4px"><span class="avatar avatar--lg avatar--emoji" id="pf-emoji">${D.glyph(st.emoji)}</span></div>
          <div class="card" style="padding:12px"><div class="chips-row glyph-grid" id="pf-emojis">${D.POSTRES.map((label, i) => {
            const e = 'p:' + String(i + 1).padStart(2, '0');
            return `<button type="button" class="icon-btn" style="font-size:1.9rem" data-emoji="${e}" aria-label="${esc(label)}" title="${esc(label)}" aria-pressed="${e === st.emoji}">${D.glyph(e)}</button>`;
          }).join('')}</div>
            <div class="chips-row glyph-grid glyph-grid--emoji">${D.EMOJIS.map((e) => `<button type="button" class="icon-btn" style="font-size:1.5rem" data-emoji="${e}" aria-label="Ícono ${e}" aria-pressed="${e === st.emoji}">${e}</button>`).join('')}</div></div>
          <div class="form-title">Datos</div>
          <div class="fields">
            <label class="field"><span>Nombre</span><input name="name" value="${esc(p ? p.name : '')}" placeholder="Ej.: Cheesecake de fresa" autocomplete="off" autocapitalize="sentences" data-autofocus></label>
            <label class="field"><span>Categoría</span><input name="category" list="dl-cats" value="${esc(p ? p.category : '')}" placeholder="Ej.: Porciones" autocomplete="off"></label>
            <datalist id="dl-cats">${cats.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
          </div>
          <div class="form-title">Precios</div>
          <div class="fields">
            <label class="field"><span>Precio de venta</span><input name="price" inputmode="decimal" data-money value="${p && p.price ? D.fmtNum(p.price) : ''}" placeholder="0"></label>
            <label class="field"><span>Costo de producirlo</span><input name="cost" inputmode="decimal" data-money value="${p && p.cost ? D.fmtNum(p.cost) : ''}" placeholder="0"></label>
          </div>
          <p class="form-note" id="pf-margin"></p>
          <div class="form-title">Disponibilidad</div>
          <div class="fields"><label class="field"><span>Disponible para vender</span><span class="field__sw"><span class="switch"><input type="checkbox" name="active" ${st.active ? 'checked' : ''}><i></i></span></span></label></div>
          ${p ? `<div class="list" style="margin-top:18px">${actionRow('trash', 'Eliminar postre', 'data-pf="del"', 'bad')}</div>` : ''}`,
        onClose: () => resolve(saved),
      });
      const margin = () => {
        const v = D.ui.read(sh.body);
        const el = $('#pf-margin', sh.el);
        if (v.price > 0) {
          const g = v.price - (v.cost || 0);
          el.textContent = v.cost > 0 ? `Ganas ${D.money(g)} por unidad (${Math.round((g / v.price) * 100)}% del precio).` : 'Agrega el costo para ver cuánto ganas por unidad.';
        } else el.textContent = '';
      };
      margin();
      sh.el.addEventListener('input', () => {
        margin();
        sh.setPrimary(null, !$('[name=name]', sh.el).value.trim());
      });
      sh.el.addEventListener('click', async (e) => {
        const em = e.target.closest('[data-emoji]');
        if (em) {
          st.emoji = em.dataset.emoji;
          $('#pf-emoji', sh.el).innerHTML = D.glyph(st.emoji);
          $$('[data-emoji]', sh.el).forEach((b) => b.setAttribute('aria-pressed', b === em));
          sh.dirty = true;
          sh.setPrimary(null, !$('[name=name]', sh.el).value.trim());
        }
        if (e.target.closest('[data-pf="del"]')) {
          if (await D.confirm({ title: `¿Eliminar ${p.name}?`, message: 'Las ventas anteriores conservarán su nombre y precio.', ok: 'Eliminar', danger: true })) {
            sh.close('force');
            F.removeWithUndo(D.data.products, p, 'products', 'Postre eliminado');
          }
        }
      });
      function commit() {
        const v = D.ui.read(sh.body);
        if (!v.name) return;
        const rec = p || { id: D.uid() };
        Object.assign(rec, { name: v.name, emoji: st.emoji, category: v.category, price: Math.max(0, v.price), cost: Math.max(0, v.cost), active: v.active });
        if (!p) D.data.products.push(rec);
        D.store.commit('products');
        saved = rec.id;
        sh.close('force');
        D.toast(p ? 'Postre actualizado' : 'Postre guardado');
      }
    });
  D.act['product.new'] = () => F.product();
  D.act['product.open'] = (el) => F.product({ id: el.dataset.id });
})();
