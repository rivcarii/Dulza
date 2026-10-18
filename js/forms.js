/* Dulza · formularios de venta, compra y pagos */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const F = (D.forms = {});

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const moneyVal = (n) => (n ? D.fmtNum(n) : '');

  /* Mantiene el contenido de una hoja sincronizado con los datos mientras está abierta */
  F.live = (ctrl, render, exists) => {
    const off = D.store.on(() => {
      if (ctrl.closed) return off();
      if (exists && !exists()) return ctrl.close('gone', true);
      const body = ctrl.body;
      const top = body.scrollTop;
      ctrl.setBody(render());
      body.scrollTop = top;
    });
    return off;
  };

  /* Rejilla de plazos (Contado / 15 / 30 / Otro) */
  const termHtml = (st, kind) => {
    const preset = [0, 15, 30];
    const other = st.otherTerm || !preset.includes(st.term);
    const btn = (v, big, small) => `<button type="button" class="term-btn" data-do="term" data-v="${v}" aria-pressed="${v === 'x' ? other : !other && st.term === v}">${big}<small>${small}</small></button>`;
    const due = D.addDays(st.date, st.term);
    const n = D.diffDays(due, D.today());
    const hint =
      st.term === 0
        ? `${D.icon('checkCircle')}<span>${kind === 'sale' ? 'Se registra como pagada hoy.' : 'Se registra como pagada.'}</span>`
        : `${D.icon('calendar')}<span>${kind === 'sale' ? 'Vence' : 'Se paga'} el <b>${D.fmtDate(due)}</b> (${n === 0 ? 'hoy' : n > 0 ? `en ${n} días` : `hace ${-n} días`}).</span>`;
    return `<div class="term-grid">${btn(0, 'Contado', 'hoy')}${btn(15, '15', 'días')}${btn(30, '30', 'días')}${btn('x', 'Otro', 'plazo')}</div>
      ${other ? `<label class="field"><span>Días de plazo</span><input type="number" inputmode="numeric" name="term" min="1" max="365" value="${st.term || ''}" placeholder="45" data-select-all></label>` : ''}
      <div class="term-hint">${hint}</div>`;
  };

  const methodSelect = (v) => `<label class="field"><span>Método de pago</span><select name="method">${D.METHODS.map((m) => `<option ${m === v ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`;

  /* ==========================================================================
     Nueva venta / editar venta
     ========================================================================== */
  F.sale = (opts = {}) => {
    const S = D.data.settings;
    const editing = opts.id ? D.sale.byId(opts.id) : null;
    const st = editing
      ? { customerId: editing.customerId || '', date: editing.date, items: clone(editing.items), discount: editing.discount || 0, term: editing.term || 0, note: editing.note || '', method: 'Efectivo', initial: 0 }
      : { customerId: opts.customerId || '', date: D.today(), items: [], discount: 0, term: S.defaultTerm, note: '', method: 'Efectivo', initial: 0 };
    const sub = () => D.r2(sumBy(st.items, (i) => i.qty * i.price));
    const total = () => Math.max(0, D.r2(sub() - Math.min(st.discount || 0, sub())));
    const custName = () => {
      const c = D.customer.byId(st.customerId);
      return c ? c.name : '';
    };

    const cartHtml = () =>
      st.items.length
        ? `<div class="lines">${st.items
            .map(
              (it, i) => `<div class="line">
          <span class="avatar avatar--emoji">${D.glyph(it.emoji)}</span>
          <button type="button" class="grow" data-do="edit" data-i="${i}" style="text-align:left" aria-label="Editar ${esc(it.name)}"><span class="line__name" style="display:block">${esc(it.name)}</span><span class="line__sub">${D.money(it.price)} c/u · <b>${D.money(it.qty * it.price)}</b></span></button>
          <span class="stepper"><button type="button" data-do="dec" data-i="${i}" aria-label="Quitar uno">${D.icon(it.qty <= 1 ? 'trash' : 'minus')}</button><output>${it.qty}</output><button type="button" data-do="inc" data-i="${i}" aria-label="Agregar uno">${D.icon('plus')}</button></span></div>`
            )
            .join('')}</div>`
        : `<p class="muted center" style="padding:22px 16px">Aún no agregas postres</p>`;

    const payHtml = () =>
      termHtml(st, 'sale') +
      (editing
        ? `<p class="form-note" style="padding:0 16px 14px">Los abonos ya registrados se conservan. Gestiónalos desde el detalle de la venta.</p>`
        : `${methodSelect(st.method)}${st.term > 0 ? `<label class="field"><span>Abono inicial</span><input inputmode="decimal" data-money name="initial" placeholder="0" value="${moneyVal(st.initial)}" data-input="sale.initial"></label>` : ''}`);

    const body = () => `
      <div class="form-title">Cliente</div>
      <div class="fields">
        <button type="button" class="field field--link" data-do="customer"><span>Cliente</span><span class="field__val ${custName() ? '' : 'is-empty'}" id="f-cust">${custName() ? esc(custName()) : 'Elegir (opcional)'}</span>${D.icon('chevR')}</button>
        <label class="field"><span>Fecha</span><input type="date" name="date" value="${st.date}"></label>
      </div>
      <div class="form-title">Postres</div>
      <div class="list" id="f-cart">${cartHtml()}</div>
      <button type="button" class="btn btn--tint btn--block" style="margin-top:12px" data-do="add">${D.icon('plus')}Agregar postres</button>
      <div class="form-title">Descuento</div>
      <div class="fields"><label class="field"><span>Descuento</span><input inputmode="decimal" data-money name="discount" placeholder="0" value="${moneyVal(st.discount)}" data-input="sale.discount"></label></div>
      <div class="form-title">Forma de pago</div>
      <div class="fields" id="f-pay">${payHtml()}</div>
      <div class="form-title">Nota (opcional)</div>
      <div class="fields"><label class="field field--area"><span class="sr-only">Nota</span><textarea name="note" rows="2" placeholder="Ej.: entregar el viernes antes de las 3 pm">${esc(st.note)}</textarea></label></div>`;

    const footer = () => `<div class="total-bar"><small>Total a cobrar</small><b id="f-total">${D.money(total())}</b></div>
      <button type="button" class="btn" id="f-save" data-do="save" ${st.items.length ? '' : 'disabled'}>${editing ? 'Guardar cambios' : 'Guardar venta'}</button>`;

    const sh = D.sheet.open({ title: editing ? `Editar ${editing.number}` : 'Nueva venta', size: 'large', body: body(), footer: footer(), form: true });

    const refresh = (what = 'all') => {
      if (what === 'all' || what === 'cart') $('#f-cart', sh.el).innerHTML = cartHtml();
      if (what === 'all' || what === 'pay') $('#f-pay', sh.el).innerHTML = payHtml();
      $('#f-total', sh.el).textContent = D.money(total());
      $('#f-save', sh.el).disabled = !st.items.length;
      if (what === 'cust') $('#f-cust', sh.el).textContent = custName() || 'Elegir (opcional)';
      $('#f-cust', sh.el).classList.toggle('is-empty', !custName());
    };

    D.inp['sale.discount'] = (el) => {
      st.discount = D.parseNum(el.value);
      refresh('total');
      sh.dirty = true;
    };
    D.inp['sale.initial'] = (el) => (st.initial = D.parseNum(el.value));

    sh.el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.name === 'note') st.note = t.value;
      if (t.name === 'term') {
        st.term = Math.max(0, Math.round(+t.value || 0));
        $('.term-hint', sh.el).innerHTML = termHint();
      }
      sh.dirty = true;
    });
    const termHint = () => {
      const due = D.addDays(st.date, st.term);
      const n = D.diffDays(due, D.today());
      return st.term === 0 ? `${D.icon('checkCircle')}<span>Se registra como pagada hoy.</span>` : `${D.icon('calendar')}<span>Vence el <b>${D.fmtDate(due)}</b> (${n === 0 ? 'hoy' : n > 0 ? `en ${n} días` : `hace ${-n} días`}).</span>`;
    };
    sh.el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'date' && t.value) {
        st.date = t.value;
        refresh('pay');
      }
      if (t.name === 'method') st.method = t.value;
    });

    sh.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const i = +b.dataset.i;
      switch (b.dataset.do) {
        case 'customer': {
          const none = { id: '__none', title: 'Sin cliente', sub: 'Venta ocasional', lead: D.ui.avatar('?') };
          const id = await D.pick({
            title: 'Cliente',
            selected: st.customerId || '__none',
            newLabel: 'Nuevo cliente',
            onNew: () => F.customer(),
            items: [none, ...D.data.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
              const bal = D.customer.stats(c.id).balance;
              return { id: c.id, title: c.name, sub: c.phone || 'Sin teléfono', lead: D.ui.avatar(c.name), end: bal > 0 ? D.ui.chip('warn', 'Debe ' + D.money(bal)) : '' };
            })],
          });
          if (id != null) {
            st.customerId = id === '__none' ? '' : id;
            sh.dirty = true;
            refresh('cust');
          }
          break;
        }
        case 'add':
          F.productPicker(st.items, () => {
            sh.dirty = true;
            refresh('cart');
          });
          break;
        case 'inc':
          st.items[i].qty += 1;
          sh.dirty = true;
          refresh('cart');
          break;
        case 'dec':
          if (st.items[i].qty <= 1) st.items.splice(i, 1);
          else st.items[i].qty -= 1;
          sh.dirty = true;
          refresh('cart');
          break;
        case 'edit':
          F.itemEditor(st.items[i], () => {
            sh.dirty = true;
            refresh('cart');
          }, () => {
            st.items.splice(i, 1);
            refresh('cart');
          });
          break;
        case 'term': {
          if (b.dataset.v === 'x') {
            st.otherTerm = true;
            if ([0, 15, 30].includes(st.term)) st.term = 45;
          } else {
            st.otherTerm = false;
            st.term = +b.dataset.v;
          }
          sh.dirty = true;
          refresh('pay');
          break;
        }
        case 'save':
          save();
          break;
      }
    });

    function save() {
      const items = st.items.filter((i) => i.qty > 0);
      if (!items.length) return;
      const sale = editing || { id: D.uid(), seq: D.sale.nextSeq(), payments: [], at: Date.now() };
      if (!editing) sale.number = D.sale.number(sale.seq);
      Object.assign(sale, {
        date: st.date,
        customerId: st.customerId,
        items: items.map((i) => ({ ...i })),
        discount: Math.min(st.discount || 0, sub()),
        term: st.term,
        due: D.addDays(st.date, st.term),
        note: st.note.trim(),
      });
      if (!editing) {
        const tot = D.sale.total(sale);
        if (st.term === 0) sale.payments.push({ id: D.uid(), date: st.date, amount: tot, method: st.method, note: '', at: Date.now() });
        else if (st.initial > 0) sale.payments.push({ id: D.uid(), date: st.date, amount: Math.min(st.initial, tot), method: st.method, note: 'Abono inicial', at: Date.now() });
        D.data.sales.push(sale);
        S.nextInvoice = sale.seq + 1;
      }
      D.store.commit('sales', 'settings');
      sh.close('force');
      if (editing) D.toast('Venta actualizada');
      else D.sound && D.sound.sale();
      if (!editing) setTimeout(() => F.saleDone(sale.id), D.reduceMotion() ? 0 : 260);
    }
    return sh;
  };

  /* Confirmación tras registrar una venta */
  F.saleDone = (id) => {
    const sale = D.sale.byId(id);
    if (!sale) return;
    const c = D.sale.customer(sale);
    const bal = D.sale.balance(sale);
    const sh = D.sheet.open({
      title: 'Venta registrada',
      left: false,
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (s) => s.close() },
      body: `<div class="welcome" style="padding-top:2px">
        <div style="width:min(210px,100%)"><img class="empty__sticker mascot--alive" src="${D.gpt.url(D.gpt.stickers.helado)}" alt="" decoding="async"></div>
        <div class="detail-head__amount">${D.money(D.sale.total(sale))}</div>
        <p>${esc(sale.number)} · ${esc(D.sale.customerName(sale))}</p>
        ${D.ui.statusChip(D.sale.status(sale))}
        ${bal > 0 ? `<p class="muted" style="font-size:.9rem">Saldo ${D.money(bal)} · ${esc(D.wa.dueText(sale))}</p>` : ''}
      </div>`,
      footer: `<button class="btn btn--wa" data-done="wa">${D.icon('whatsapp')}Enviar por WhatsApp</button>
        <div class="sheet__foot--row" style="display:grid;grid-auto-flow:column;gap:10px"><button class="btn btn--tint" data-done="inv">${D.icon('file')}Ver factura</button><button class="btn btn--tint" data-done="new">${D.icon('plus')}Otra venta</button></div>`,
    });
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-done]');
      if (!b) return;
      const k = b.dataset.done;
      if (k === 'wa') D.wa.sendDoc(sale, c && c.phone, D.wa.invoiceText(sale));
      else if (k === 'inv') D.invoice.open(id);
      else if (k === 'new') {
        sh.close('nav', true);
        F.sale({});
      }
    });
  };

  /* ==========================================================================
     Selector de postres (rejilla) y editor de ítem
     ========================================================================== */
  F.productPicker = (items, onChange) => {
    const prods = D.data.products.filter((p) => p.active !== false);
    const qtyOf = (pid) => sumBy(items.filter((i) => i.pid === pid), (i) => i.qty);
    const card = (p) => `<div class="pick-card" data-pid="${p.id}" data-qty="${qtyOf(p.id)}" data-text="${esc((p.name + ' ' + (p.category || '')).toLowerCase())}">
        <span class="pick-card__emoji">${D.glyph(p.emoji)}</span><span class="pick-card__name">${esc(p.name)}</span><span class="pick-card__price">${D.money(p.price)}</span>
        <span class="pick-card__qty">${qtyOf(p.id)}</span>
        <button type="button" class="pick-card__hit" data-pk="add" aria-label="Agregar ${esc(p.name)}"></button>
        <button type="button" class="icon-btn icon-btn--sm pick-card__dec" data-pk="dec" aria-label="Quitar uno de ${esc(p.name)}" ${qtyOf(p.id) ? '' : 'hidden'}>${D.icon('minus')}</button>
      </div>`;
    const count = () => sumBy(items, (i) => i.qty);
    const body = () => `${prods.length > 8 ? `<div class="sheet__search">${D.ui.search('pk.q', '', 'Buscar postre')}</div>` : ''}
      ${prods.length ? `<div class="pick-grid" id="pk-grid">${prods.map(card).join('')}</div>` : D.ui.empty({ title: 'Aún no tienes postres', text: 'Crea tu catálogo para vender más rápido.', cta: 'Crear postre', act: 'pk.create', compact: true })}
      <div class="list" style="margin-top:14px"><button type="button" class="row row--tap row--noavatar row--action" data-pk="free"><span class="row__icon">${D.icon('plus')}</span><span class="row__main"><span class="row__title">Producto libre</span><span class="row__sub">Algo que no está en tu catálogo</span></span></button></div>`;
    const footer = () => `<button class="btn" data-pk="done">Listo${count() ? ` · ${D.plural(count(), 'postre', 'postres')}` : ''}</button>`;
    const sh = D.sheet.open({ title: 'Elegir postres', size: 'large', body: body(), footer: footer(), onClose: () => onChange() });
    D.inp['pk.q'] = (el) => {
      const q = el.value.trim().toLowerCase();
      $$('.pick-card', sh.el).forEach((c) => (c.hidden = !!q && !c.dataset.text.includes(q)));
    };
    D.act['pk.create'] = async () => {
      await F.product();
      sh.setBody(body());
    };
    const sync = (pid) => {
      const c = $(`.pick-card[data-pid="${pid}"]`, sh.el);
      const q = qtyOf(pid);
      c.dataset.qty = q;
      $('.pick-card__qty', c).textContent = q;
      $('.pick-card__dec', c).hidden = !q;
      sh.$('.btn[data-pk="done"]').textContent = `Listo${count() ? ` · ${D.plural(count(), 'postre', 'postres')}` : ''}`;
    };
    sh.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pk]');
      if (!b) return;
      const k = b.dataset.pk;
      if (k === 'done') return sh.close();
      if (k === 'free') {
        const it = { id: D.uid(), pid: '', name: '', emoji: D.DEFAULT_GLYPH, qty: 1, price: 0, cost: 0 };
        return F.itemEditor(it, () => {
          items.push(it);
          sh.$('.btn[data-pk="done"]').textContent = `Listo · ${D.plural(count(), 'postre', 'postres')}`;
          D.toast('Producto agregado');
        }, null, true);
      }
      const pid = b.closest('.pick-card').dataset.pid;
      const p = D.product.byId(pid);
      let line = items.find((i) => i.pid === pid);
      if (k === 'add') {
        if (line) line.qty += 1;
        else items.push({ id: D.uid(), pid, name: p.name, emoji: p.emoji, qty: 1, price: p.price, cost: p.cost || 0 });
        D.haptic(6);
      } else if (k === 'dec' && line) {
        line.qty -= 1;
        if (line.qty <= 0) items.splice(items.indexOf(line), 1);
      }
      sync(pid);
    });
  };

  F.itemEditor = (item, onSave, onRemove, isNew) => {
    const sh = D.sheet.open({
      title: isNew ? 'Producto libre' : 'Editar ítem',
      right: { label: isNew ? 'Agregar' : 'Listo', onClick: () => commit() },
      form: true,
      body: `<div class="fields">
        <label class="field"><span>Nombre</span><input name="name" value="${esc(item.name)}" placeholder="Ej.: Torta personalizada" autocomplete="off" ${isNew ? 'data-autofocus' : ''}></label>
        <label class="field"><span>Cantidad</span><input name="qty" type="number" inputmode="numeric" min="1" value="${item.qty}" data-select-all></label>
        <label class="field"><span>Precio unitario</span><input name="price" inputmode="decimal" data-money value="${moneyVal(item.price)}" placeholder="0"></label>
        ${isNew ? `<label class="field"><span>Costo (opcional)</span><input name="cost" inputmode="decimal" data-money value="${moneyVal(item.cost)}" placeholder="0"></label>` : ''}</div>
        ${onRemove ? `<div class="list" style="margin-top:16px"><button type="button" class="row row--tap row--noavatar row--bad" data-rm><span class="row__icon">${D.icon('trash')}</span><span class="row__main"><span class="row__title">Quitar de la venta</span></span></button></div>` : ''}`,
    });
    const upd = () => sh.setPrimary(null, !sh.$('[name=name]').value.trim() || !(D.parseNum(sh.$('[name=price]').value) >= 0));
    sh.el.addEventListener('input', upd);
    if (isNew) sh.setPrimary(null, true);
    function commit() {
      const v = D.ui.read(sh.body);
      if (!v.name) return;
      item.name = v.name;
      item.qty = Math.max(1, Math.round(v.qty) || 1);
      item.price = Math.max(0, v.price);
      if (isNew) item.cost = Math.max(0, v.cost || 0);
      sh.close('force');
      onSave();
    }
    sh.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-rm]')) {
        sh.close('force');
        onRemove();
      }
    });
  };

  /* ==========================================================================
     Nueva compra / editar compra
     ========================================================================== */
  F.purchase = (opts = {}) => {
    const editing = opts.id ? D.purchase.byId(opts.id) : null;
    const st = editing
      ? { supplierId: editing.supplierId || '', date: editing.date, items: clone(editing.items), term: editing.term || 0, note: editing.note || '', method: 'Efectivo', initial: 0 }
      : { supplierId: opts.supplierId || '', date: D.today(), items: [], term: 0, note: '', method: 'Efectivo', initial: 0 };
    const total = () => D.r2(sumBy(st.items, (i) => i.qty * i.cost));
    const supName = () => {
      const s = D.supplier.byId(st.supplierId);
      return s ? s.name : '';
    };
    const itemsHtml = () =>
      st.items.length
        ? `<div class="lines">${st.items
            .map(
              (it, i) => `<div class="line"><span class="avatar avatar--emoji">${D.icon('box')}</span>
          <button type="button" class="grow" style="text-align:left" data-do="edit" data-i="${i}"><span class="line__name" style="display:block">${esc(it.name)}</span><span class="line__sub">${D.fmtNum(it.qty, it.qty % 1 ? 2 : 0)} ${esc(it.unit || 'u')} × ${D.money(it.cost)}</span></button>
          <span class="line__total">${D.money(it.qty * it.cost)}</span></div>`
            )
            .join('')}</div>`
        : `<p class="muted center" style="padding:22px 16px">Aún no agregas insumos</p>`;
    const payHtml = () =>
      termHtml(st, 'purchase') +
      (editing ? `<p class="form-note" style="padding:0 16px 14px">Los pagos ya registrados se conservan. Gestiónalos desde el detalle de la compra.</p>` : `${methodSelect(st.method)}${st.term > 0 ? `<label class="field"><span>Pago inicial</span><input inputmode="decimal" data-money name="initial" placeholder="0" value="${moneyVal(st.initial)}" data-input="pur.initial"></label>` : ''}`);

    const body = () => `
      <div class="form-title">Proveedor</div>
      <div class="fields">
        <button type="button" class="field field--link" data-do="supplier"><span>Proveedor</span><span class="field__val ${supName() ? '' : 'is-empty'}" id="f-sup">${supName() ? esc(supName()) : 'Elegir (opcional)'}</span>${D.icon('chevR')}</button>
        <label class="field"><span>Fecha</span><input type="date" name="date" value="${st.date}"></label>
      </div>
      <div class="form-title">Insumos y materiales</div>
      <div class="list" id="f-items">${itemsHtml()}</div>
      <button type="button" class="btn btn--tint btn--block" style="margin-top:12px" data-do="add">${D.icon('plus')}Agregar insumo</button>
      <div class="form-title">Forma de pago</div>
      <div class="fields" id="f-pay">${payHtml()}</div>
      <div class="form-title">Nota (opcional)</div>
      <div class="fields"><label class="field field--area"><span class="sr-only">Nota</span><textarea name="note" rows="2" placeholder="Ej.: factura del proveedor #123">${esc(st.note)}</textarea></label></div>`;
    const footer = () => `<div class="total-bar"><small>Total de la compra</small><b id="f-total">${D.money(total())}</b></div>
      <button type="button" class="btn" id="f-save" data-do="save" ${st.items.length ? '' : 'disabled'}>${editing ? 'Guardar cambios' : 'Guardar compra'}</button>`;
    const sh = D.sheet.open({ title: editing ? 'Editar compra' : 'Nueva compra', size: 'large', body: body(), footer: footer(), form: true });

    const refresh = (what = 'all') => {
      if (what === 'all' || what === 'items') $('#f-items', sh.el).innerHTML = itemsHtml();
      if (what === 'all' || what === 'pay') $('#f-pay', sh.el).innerHTML = payHtml();
      $('#f-total', sh.el).textContent = D.money(total());
      $('#f-save', sh.el).disabled = !st.items.length;
      $('#f-sup', sh.el).textContent = supName() || 'Elegir (opcional)';
      $('#f-sup', sh.el).classList.toggle('is-empty', !supName());
    };
    D.inp['pur.initial'] = (el) => (st.initial = D.parseNum(el.value));
    sh.el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.name === 'note') st.note = t.value;
      if (t.name === 'term') {
        st.term = Math.max(0, Math.round(+t.value || 0));
        const due = D.addDays(st.date, st.term);
        $('.term-hint', sh.el).innerHTML = `${D.icon('calendar')}<span>Se paga el <b>${D.fmtDate(due)}</b>.</span>`;
      }
      sh.dirty = true;
    });
    sh.el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'date' && t.value) {
        st.date = t.value;
        refresh('pay');
      }
      if (t.name === 'method') st.method = t.value;
    });
    sh.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const i = +b.dataset.i;
      switch (b.dataset.do) {
        case 'supplier': {
          const id = await D.pick({
            title: 'Proveedor',
            selected: st.supplierId || '__none',
            newLabel: 'Nuevo proveedor',
            onNew: () => F.supplier(),
            items: [{ id: '__none', title: 'Sin proveedor', sub: 'Compra suelta', lead: D.ui.avatar('?') }, ...D.data.suppliers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, title: s.name, sub: s.notes || s.phone || '', lead: D.ui.avatar(s.name) }))],
          });
          if (id != null) {
            st.supplierId = id === '__none' ? '' : id;
            sh.dirty = true;
            refresh();
          }
          break;
        }
        case 'add': {
          const it = { id: D.uid(), name: '', qty: 1, unit: 'u', cost: 0 };
          F.purchaseItem(it, () => {
            st.items.push(it);
            sh.dirty = true;
            refresh('items');
          });
          break;
        }
        case 'edit':
          F.purchaseItem(st.items[i], () => {
            sh.dirty = true;
            refresh('items');
          }, () => {
            st.items.splice(i, 1);
            refresh('items');
          });
          break;
        case 'term':
          if (b.dataset.v === 'x') {
            st.otherTerm = true;
            if ([0, 15, 30].includes(st.term)) st.term = 45;
          } else {
            st.otherTerm = false;
            st.term = +b.dataset.v;
          }
          sh.dirty = true;
          refresh('pay');
          break;
        case 'save':
          save();
          break;
      }
    });
    function save() {
      if (!st.items.length) return;
      const p = editing || { id: D.uid(), payments: [], at: Date.now() };
      Object.assign(p, { date: st.date, supplierId: st.supplierId, items: st.items.map((i) => ({ ...i })), term: st.term, due: D.addDays(st.date, st.term), note: st.note.trim() });
      if (!editing) {
        const tot = D.purchase.total(p);
        if (st.term === 0) p.payments.push({ id: D.uid(), date: st.date, amount: tot, method: st.method, note: '', at: Date.now() });
        else if (st.initial > 0) p.payments.push({ id: D.uid(), date: st.date, amount: Math.min(st.initial, tot), method: st.method, note: 'Pago inicial', at: Date.now() });
        D.data.purchases.push(p);
      }
      D.store.commit('purchases');
      sh.close('force');
      D.toast(editing ? 'Compra actualizada' : 'Compra registrada');
    }
  };

  F.purchaseItem = (item, onSave, onRemove) => {
    const isNew = !item.name;
    const known = {};
    D.data.purchases
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((p) => p.items.forEach((i) => (known[i.name.toLowerCase()] = { name: i.name, unit: i.unit, cost: i.cost })));
    const sh = D.sheet.open({
      title: isNew ? 'Agregar insumo' : 'Editar insumo',
      right: { label: isNew ? 'Agregar' : 'Listo', onClick: () => commit() },
      form: true,
      body: `<div class="fields">
        <label class="field"><span>Nombre</span><input name="name" list="dl-items" value="${esc(item.name)}" placeholder="Ej.: Harina de trigo" autocomplete="off" autocapitalize="sentences" data-autofocus></label>
        <label class="field"><span>Cantidad</span><input name="qty" inputmode="decimal" data-money value="${D.fmtNum(item.qty, item.qty % 1 ? 2 : 0)}" data-select-all></label>
        <label class="field"><span>Unidad</span><select name="unit">${D.UNITS.map((u) => `<option ${u === (item.unit || 'u') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="field"><span>Costo por unidad</span><input name="cost" inputmode="decimal" data-money value="${moneyVal(item.cost)}" placeholder="0"></label>
      </div>
      <datalist id="dl-items">${Object.values(known).map((k) => `<option value="${esc(k.name)}"></option>`).join('')}</datalist>
      <p class="form-note" id="it-total"></p>
      ${onRemove ? `<div class="list" style="margin-top:16px"><button type="button" class="row row--tap row--noavatar row--bad" data-rm><span class="row__icon">${D.icon('trash')}</span><span class="row__main"><span class="row__title">Quitar de la compra</span></span></button></div>` : ''}`,
    });
    const upd = () => {
      const v = D.ui.read(sh.body);
      sh.setPrimary(null, !v.name || !(v.qty > 0));
      $('#it-total', sh.el).textContent = v.qty > 0 && v.cost > 0 ? `Subtotal: ${D.money(v.qty * v.cost)}` : '';
    };
    upd();
    sh.el.addEventListener('input', (e) => {
      if (e.target.name === 'name') {
        const k = known[e.target.value.trim().toLowerCase()];
        if (k) {
          sh.$('[name=unit]').value = k.unit || 'u';
          if (!D.parseNum(sh.$('[name=cost]').value)) sh.$('[name=cost]').value = D.fmtNum(k.cost);
        }
      }
      upd();
    });
    sh.el.addEventListener('change', upd);
    function commit() {
      const v = D.ui.read(sh.body);
      if (!v.name || !(v.qty > 0)) return;
      Object.assign(item, { name: v.name, qty: v.qty, unit: v.unit || 'u', cost: Math.max(0, v.cost) });
      sh.close('force');
      onSave();
    }
    sh.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-rm]')) {
        sh.close('force');
        onRemove();
      }
    });
  };

  /* ==========================================================================
     Registrar abono / pago
     ========================================================================== */
  F.payment = (kind, id) => {
    const doc = kind === 'sale' ? D.sale.byId(id) : D.purchase.byId(id);
    if (!doc) return;
    const bal = kind === 'sale' ? D.sale.balance(doc) : D.purchase.balance(doc);
    if (bal <= 0) return D.toast('Ya está pagada', { tone: 'info', icon: 'info' });
    const who = kind === 'sale' ? D.sale.customerName(doc) : D.purchase.supplierName(doc);
    const sh = D.sheet.open({
      title: kind === 'sale' ? 'Registrar abono' : 'Registrar pago',
      right: { label: 'Registrar', onClick: () => commit() },
      form: true,
      body: `<div class="detail-head" style="padding-bottom:10px"><p class="muted">${esc(who)} · ${esc(doc.number || D.fmtDate(doc.date))}</p><p class="muted" style="font-size:.85rem">Saldo pendiente</p><div class="detail-head__amount">${D.money(bal)}</div></div>
        <div class="chips-row" style="margin-bottom:12px;justify-content:center;flex-wrap:wrap"><button type="button" class="filter-chip" data-amt="${bal}">${kind === 'sale' ? 'Cobrar todo' : 'Pagar todo'}</button>${bal > 1 ? `<button type="button" class="filter-chip" data-amt="${D.r2(bal / 2)}">Mitad</button>` : ''}</div>
        <div class="fields">
          <label class="field field--big"><span>Monto</span><input name="amount" inputmode="decimal" data-money value="${D.fmtNum(bal)}" data-select-all data-autofocus></label>
          <label class="field"><span>Fecha</span><input type="date" name="date" value="${D.today()}"></label>
          ${methodSelect('Efectivo')}
          <label class="field"><span>Nota</span><input name="note" placeholder="Opcional" autocomplete="off"></label>
        </div>
        <p class="form-note" id="pay-warn" hidden style="color:var(--bad-ink)"></p>`,
    });
    const check = () => {
      const a = D.parseNum(sh.$('[name=amount]').value);
      const bad = !(a > 0) || a > bal + 0.005;
      sh.setPrimary(null, bad);
      const w = sh.$('#pay-warn');
      w.hidden = !(a > bal + 0.005);
      w.textContent = a > bal + 0.005 ? `El monto supera el saldo (${D.money(bal)}).` : '';
    };
    sh.el.addEventListener('input', check);
    sh.el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-amt]');
      if (c) {
        sh.$('[name=amount]').value = D.fmtNum(+c.dataset.amt);
        check();
      }
    });
    function commit() {
      const v = D.ui.read(sh.body);
      if (!(v.amount > 0) || v.amount > bal + 0.005) return;
      D.addPayment(kind, id, { amount: v.amount, date: v.date, method: v.method, note: v.note });
      sh.close('force');
      if (kind === 'sale') {
        D.sound && D.sound.coin(v.amount >= bal - 0.005);
        const c = D.sale.customer(doc);
        D.toast(`Abono de ${D.money(v.amount)} registrado`, { action: { label: 'Avisar', fn: () => D.wa.sendDoc(doc, c && c.phone, D.wa.paymentText(doc, v.amount)) } });
      } else D.toast(`Pago de ${D.money(v.amount)} registrado`);
    }
  };

  /* ==========================================================================
     Acciones globales
     ========================================================================== */
  D.act['sale.new'] = () => F.sale({});
  D.act['purchase.new'] = () => F.purchase({});
  D.act['sale.pay'] = (el) => F.payment('sale', el.dataset.id);
  D.act['purchase.pay'] = (el) => F.payment('purchase', el.dataset.id);
  D.act['sale.invoice'] = (el) => D.invoice.open(el.dataset.id);
  D.act['sale.wa'] = (el) => {
    const s = D.sale.byId(el.dataset.id);
    const c = s && D.sale.customer(s);
    s && D.wa.sendDoc(s, c && c.phone, D.wa.invoiceText(s));
  };
  D.act['sale.remind'] = (el) => {
    const s = D.sale.byId(el.dataset.id);
    if (!s) return;
    const c = D.sale.customer(s);
    D.wa.sendDoc(s, c && c.phone, D.wa.reminderText([s], D.sale.customerName(s)));
  };

  /* Eliminar con opción de deshacer */
  const removeWithUndo = (arr, item, key, label, after) => {
    const idx = arr.indexOf(item);
    arr.splice(idx, 1);
    D.store.commit(key);
    after && after();
    D.toast(label, { tone: 'info', icon: 'trash', action: { label: 'Deshacer', fn: () => { arr.splice(idx, 0, item); D.store.commit(key); } } });
  };
  D.act['sale.del'] = async (el) => {
    const s = D.sale.byId(el.dataset.id);
    if (!s) return;
    const ok = await D.confirm({ title: `¿Eliminar ${s.number}?`, message: 'Se quitará la venta y sus abonos. Podrás deshacerlo unos segundos.', ok: 'Eliminar', danger: true });
    if (ok) removeWithUndo(D.data.sales, s, 'sales', `Venta ${s.number} eliminada`);
  };
  D.act['purchase.del'] = async (el) => {
    const p = D.purchase.byId(el.dataset.id);
    if (!p) return;
    const ok = await D.confirm({ title: '¿Eliminar esta compra?', message: 'Se quitará la compra y sus pagos. Podrás deshacerlo unos segundos.', ok: 'Eliminar', danger: true });
    if (ok) removeWithUndo(D.data.purchases, p, 'purchases', 'Compra eliminada');
  };
  D.act['pay.del'] = async (el) => {
    const kind = el.dataset.kind;
    const doc = kind === 'sale' ? D.sale.byId(el.dataset.id) : D.purchase.byId(el.dataset.id);
    if (!doc) return;
    const pay = doc.payments.find((p) => p.id === el.dataset.pid);
    if (!pay) return;
    const ok = await D.confirm({ title: '¿Eliminar este pago?', message: `${D.money(pay.amount)} del ${D.fmtDate(pay.date)}. El saldo volverá a subir.`, ok: 'Eliminar', danger: true });
    if (ok) removeWithUndo(doc.payments, pay, kind === 'sale' ? 'sales' : 'purchases', 'Pago eliminado');
  };
  F.removeWithUndo = removeWithUndo;
})();
