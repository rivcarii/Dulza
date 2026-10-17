/* Dulza · Proveedores */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const st = (D.ui.state.proveedores = { q: '' });

  function listHtml() {
    const q = st.q.trim().toLowerCase();
    const list = D.data.suppliers.filter((s) => !q || (s.name + ' ' + (s.notes || '')).toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length)
      return D.data.suppliers.length
        ? D.ui.empty({ title: 'Sin resultados', text: 'Prueba con otra búsqueda.', mood: 'think', compact: true })
        : D.ui.empty({ title: 'Aún no tienes proveedores', text: 'Guarda dónde compras tus ingredientes y materiales para controlar tus gastos.', cta: 'Nuevo proveedor', act: 'supplier.new', art: 'frios' });
    return `<div class="list">${list
      .map((s) => {
        const x = D.supplier.stats(s.id);
        return `<button type="button" class="row row--tap" data-act="supplier.open" data-id="${s.id}">
          ${D.ui.avatar(s.name)}
          <span class="row__main"><span class="row__title">${esc(s.name)}</span><span class="row__sub">${esc(s.notes || (x.count ? D.plural(x.count, 'compra', 'compras') : 'Sin compras aún'))}</span></span>
          <span class="row__end">${x.balance > 0 ? `<span class="row__amount">${D.money(x.balance)}</span>${D.ui.chip('warn', 'Por pagar')}` : x.total > 0 ? `<span class="muted num" style="font-size:.85rem">${D.money(x.total)}</span>` : ''}</span>
          <span class="row__chev">${D.icon('chevR')}</span></button>`;
      })
      .join('')}</div>`;
  }

  D.views.proveedores = {
    title: 'Proveedores',
    render() {
      return D.ui.page({
        title: 'Proveedores',
        cls: 'page--narrow',
        sub: D.plural(D.data.suppliers.length, 'proveedor', 'proveedores'),
        actions: `<button class="icon-btn glass" data-act="supplier.new" aria-label="Nuevo proveedor">${D.icon('plus')}</button>`,
        body: `<div class="toolbar" data-rise>${D.ui.search('proveedores.q', st.q, 'Buscar proveedor')}</div><div id="sp-list" data-rise>${listHtml()}</div>`,
        fab: D.ui.fab('supplier.new', 'Nuevo proveedor', 'truck'),
      });
    },
  };
  D.inp['proveedores.q'] = (el) => {
    st.q = el.value;
    $('#sp-list').innerHTML = listHtml();
  };
})();
