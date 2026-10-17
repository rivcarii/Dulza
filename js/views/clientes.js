/* Dulza · Clientes */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const st = (D.ui.state.clientes = { q: '', sort: 'az' });

  function listHtml() {
    const q = st.q.trim().toLowerCase();
    let list = D.data.customers.map((c) => ({ c, s: D.customer.stats(c.id) })).filter((x) => !q || (x.c.name + ' ' + (x.c.phone || '')).toLowerCase().includes(q));
    if (st.sort === 'az') list.sort((a, b) => a.c.name.localeCompare(b.c.name));
    else if (st.sort === 'deben') list = list.filter((x) => x.s.balance > 0).sort((a, b) => b.s.balance - a.s.balance);
    else list.sort((a, b) => (b.s.last || '').localeCompare(a.s.last || ''));
    if (!list.length)
      return D.data.customers.length
        ? D.ui.empty({ title: st.sort === 'deben' && !q ? 'Nadie te debe' : 'Sin resultados', text: st.sort === 'deben' && !q ? '¡Excelente! Todos tus clientes están al día.' : 'Prueba con otra búsqueda.', mood: 'sleepy', compact: true })
        : D.ui.empty({ title: 'Aún no tienes clientes', text: 'Guarda sus datos para vender más rápido y enviarles facturas por WhatsApp.', cta: 'Nuevo cliente', act: 'customer.new', art: 'helado' });
    return `<div class="list">${list
      .map(({ c, s }) => `<button type="button" class="row row--tap" data-act="customer.open" data-id="${c.id}">
        ${D.ui.avatar(c.name)}
        <span class="row__main"><span class="row__title">${esc(c.name)}</span><span class="row__sub">${s.count ? `${D.plural(s.count, 'compra', 'compras')} · última ${D.relDay(s.last)}` : esc(c.phone || 'Sin compras aún')}</span></span>
        <span class="row__end">${s.balance > 0 ? `<span class="row__amount">${D.money(s.balance)}</span>${s.overdue ? D.ui.chip('bad', 'Vencida') : D.ui.chip('warn', 'Debe')}` : s.total > 0 ? `<span class="muted num" style="font-size:.85rem">${D.money(s.total)}</span>` : ''}</span>
        <span class="row__chev">${D.icon('chevR')}</span></button>`)
      .join('')}</div>`;
  }

  D.views.clientes = {
    title: 'Clientes',
    render() {
      const owing = D.data.customers.filter((c) => D.customer.stats(c.id).balance > 0).length;
      return D.ui.page({
        title: 'Clientes',
        cls: 'page--narrow',
        sub: D.plural(D.data.customers.length, 'cliente', 'clientes') + (owing ? ` · ${owing} con saldo` : ''),
        actions: `<button class="icon-btn glass" data-act="customer.new" aria-label="Nuevo cliente">${D.icon('userPlus')}</button>`,
        body: `<div class="toolbar" data-rise>${D.ui.search('clientes.q', st.q, 'Buscar cliente')}${D.ui.seg('clientes.sort', [['az', 'A–Z'], ['deben', 'Con saldo'], ['recientes', 'Recientes']], st.sort)}</div>
          <div id="cl-list" data-rise>${listHtml()}</div>`,
        fab: D.ui.fab('customer.new', 'Nuevo cliente', 'userPlus'),
      });
    },
  };
  D.inp['clientes.q'] = (el) => {
    st.q = el.value;
    $('#cl-list').innerHTML = listHtml();
  };
  D.seg['clientes.sort'] = (v) => {
    st.sort = v;
    $('#cl-list').innerHTML = listHtml();
  };
})();
