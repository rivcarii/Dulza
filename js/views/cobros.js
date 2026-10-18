/* Dulza · Cobros (cuentas por cobrar y por pagar) */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const st = (D.ui.state.cobros = { tab: 'ventas', filter: 'todas' });

  const TABS = [['ventas', 'Por venta'], ['clientes', 'Por cliente'], ['pagar', 'Por pagar']];
  const FILTERS = [['todas', 'Todas'], ['vencidas', 'Vencidas'], ['semana', '7 días'], ['despues', 'Después']];

  const bucket = (doc) => {
    const n = D.diffDays(doc.due || doc.date, D.today());
    return n < 0 ? 'vencidas' : n <= 7 ? 'semana' : 'despues';
  };
  const passes = (doc) => st.filter === 'todas' || bucket(doc) === st.filter || (st.filter === 'semana' && bucket(doc) === 'vencidas' && false);

  function summary(docs, balFn) {
    const total = sumBy(docs, balFn);
    const over = sumBy(docs.filter((d) => bucket(d) === 'vencidas'), balFn);
    const week = sumBy(docs.filter((d) => bucket(d) === 'semana'), balFn);
    return `<div class="summary">
      <div class="summary__item"><small>${st.tab === 'pagar' ? 'Por pagar' : 'Por cobrar'}</small><b>${D.moneyC(total)}</b></div>
      <div class="summary__item ${over > 0 ? 'summary__item--bad' : ''}"><small>Vencido</small><b>${D.moneyC(over)}</b></div>
      <div class="summary__item"><small>Próx. 7 días</small><b>${D.moneyC(week)}</b></div></div>`;
  }

  const saleRow = (s) => {
    const bal = D.sale.balance(s);
    const over = D.sale.status(s) === 'overdue';
    const c = D.sale.customer(s);
    return `<div class="row row--tap" role="button" tabindex="0" data-act="sale.open" data-id="${s.id}">
      ${D.ui.avatar(D.sale.customerName(s))}
      <span class="row__main"><span class="row__title">${esc(D.sale.customerName(s))}</span><span class="row__sub">${esc(s.number)} · ${esc(D.ui.dueText(s, bal))}</span></span>
      <span class="row__end"><span class="row__amount">${D.money(bal)}</span>${over ? D.ui.chip('bad', 'Vencida') : D.sale.paid(s) > 0 ? D.ui.chip('warn', 'Abonada') : D.ui.chip('info', 'Pendiente')}</span>
      <span class="row-actions"><button class="icon-btn icon-btn--sm icon-btn--wa" data-act="sale.remind" data-id="${s.id}" aria-label="Recordar a ${esc(D.sale.customerName(s))} por WhatsApp" ${c && c.phone ? '' : 'title="Sin WhatsApp guardado"'}>${D.icon('whatsapp')}</button></span></div>`;
  };

  const customerRow = (c, open) => {
    const bal = sumBy(open, D.sale.balance);
    const over = open.filter((s) => D.sale.status(s) === 'overdue');
    const nearest = open.map((s) => s.due || s.date).sort()[0];
    return `<div class="row row--tap" role="button" tabindex="0" data-act="customer.open" data-id="${c.id}">
      ${D.ui.avatar(c.name)}
      <span class="row__main"><span class="row__title">${esc(c.name)}</span><span class="row__sub">${D.plural(open.length, 'factura abierta', 'facturas abiertas')} · ${over.length ? `${over.length} vencida${over.length > 1 ? 's' : ''}` : 'vence ' + D.relDay(nearest)}</span></span>
      <span class="row__end"><span class="row__amount">${D.money(bal)}</span>${over.length ? D.ui.chip('bad', 'Vencida') : ''}</span>
      <span class="row-actions"><button class="icon-btn icon-btn--sm icon-btn--wa" data-act="customer.remind" data-id="${c.id}" aria-label="Recordar a ${esc(c.name)} por WhatsApp">${D.icon('whatsapp')}</button></span></div>`;
  };

  const payRow = (p) => {
    const bal = D.purchase.balance(p);
    const over = D.purchase.status(p) === 'overdue';
    return `<div class="row row--tap" role="button" tabindex="0" data-act="purchase.open" data-id="${p.id}">
      ${D.ui.emoji('🛒')}
      <span class="row__main"><span class="row__title">${esc(D.purchase.supplierName(p))}</span><span class="row__sub">${esc(D.purchase.summary(p))} · ${esc(D.ui.dueText(p, bal))}</span></span>
      <span class="row__end"><span class="row__amount">${D.money(bal)}</span>${over ? D.ui.chip('bad', 'Vencida') : D.ui.chip('info', 'Por pagar')}</span>
      <span class="row-actions"><button class="icon-btn icon-btn--sm icon-btn--brand" data-act="purchase.pay" data-id="${p.id}" aria-label="Registrar pago">${D.icon('wallet')}</button></span></div>`;
  };

  function content() {
    if (st.tab === 'pagar') {
      const all = D.q.payables();
      const list = all.filter(passes);
      return {
        sum: summary(all, D.purchase.balance),
        list: list.length ? `<div class="list">${list.map(payRow).join('')}</div>` : D.ui.empty({ title: all.length ? 'Nada en este filtro' : 'No debes nada', text: all.length ? 'Cambia el filtro para ver más.' : 'Tus compras a plazo pendientes aparecerán aquí.', mood: 'sleepy', compact: true }),
      };
    }
    const all = D.q.receivables();
    if (st.tab === 'clientes') {
      const groups = {};
      all.filter(passes).forEach((s) => (groups[s.customerId || ''] = groups[s.customerId || ''] || []).push(s));
      const rows = Object.entries(groups)
        .map(([id, open]) => ({ c: D.customer.byId(id), open }))
        .filter((g) => g.c)
        .sort((a, b) => sumBy(b.open, D.sale.balance) - sumBy(a.open, D.sale.balance));
      return {
        sum: summary(all, D.sale.balance),
        list: rows.length ? `<div class="list">${rows.map((g) => customerRow(g.c, g.open)).join('')}</div>` : D.ui.empty({ title: all.length ? 'Nada en este filtro' : '¡Todo cobrado!', text: all.length ? 'Cambia el filtro para ver más.' : 'No tienes saldos pendientes de tus clientes.', compact: true }),
      };
    }
    const list = all.filter(passes);
    return {
      sum: summary(all, D.sale.balance),
      list: list.length ? `<div class="list">${list.map(saleRow).join('')}</div>` : D.ui.empty({ title: all.length ? 'Nada en este filtro' : '¡Todo cobrado!', text: all.length ? 'Cambia el filtro para ver más.' : 'Las ventas a plazo pendientes aparecerán aquí.', compact: true }),
    };
  }

  const refresh = () => {
    const c = content();
    $('#c-sum').innerHTML = c.sum;
    $('#c-list').innerHTML = c.list;
  };

  D.views.cobros = {
    title: 'Cobros',
    render() {
      const c = content();
      const over = D.q.overdueCount();
      return D.ui.page({
        title: 'Cobros',
        cls: 'page--narrow',
        sub: over ? `${D.plural(over, 'venta vencida', 'ventas vencidas')} por cobrar` : 'Todo al día',
        actions: `<button class="icon-btn glass" data-act="consulta.open" data-kind="cobros" aria-label="Consultar">${D.icon('sliders')}</button>`,
        body: `<div class="toolbar" data-rise>${D.ui.seg('cobros.tab', TABS, st.tab)}${D.ui.seg('cobros.filter', FILTERS, st.filter)}</div>
          <div id="c-sum" data-rise>${c.sum}</div><div id="c-list" data-rise>${c.list}</div>`,
        fab: D.ui.fab('sale.new', 'Nueva venta'),
      });
    },
  };
  D.seg['cobros.tab'] = (v) => {
    st.tab = v;
    refresh();
  };
  D.seg['cobros.filter'] = (v) => {
    st.filter = v;
    refresh();
  };
})();
