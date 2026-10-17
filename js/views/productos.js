/* Dulza · Postres (catálogo de productos) */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const st = (D.ui.state.productos = { q: '', cat: '' });

  function gridHtml() {
    const q = st.q.trim().toLowerCase();
    const list = D.data.products.filter((p) => (!st.cat || p.category === st.cat) && (!q || (p.name + ' ' + (p.category || '')).toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length)
      return D.data.products.length
        ? D.ui.empty({ title: 'Sin resultados', text: 'Prueba con otra búsqueda o categoría.', mood: 'think', compact: true })
        : D.ui.empty({ title: 'Aún no tienes postres', text: 'Crea tu catálogo con precios y costos para vender en segundos y conocer tu ganancia.', cta: 'Nuevo postre', act: 'product.new', art: 'flan' });
    return `<div class="grid-cards">${list
      .map((p) => {
        const m = D.product.margin(p);
        return `<button type="button" class="prod ${p.active === false ? 'prod--off' : ''}" data-act="product.open" data-id="${p.id}">
          <span class="prod__top"><span class="prod__emoji" aria-hidden="true">${D.glyph(p.emoji)}</span>${p.active === false ? D.ui.chip('neutral', 'Pausado') : p.cost > 0 ? D.ui.chip(m >= 50 ? 'ok' : m >= 30 ? 'warn' : 'bad', Math.round(m) + '% ganancia') : ''}</span>
          <span class="prod__name">${esc(p.name)}</span>
          <span class="prod__cat">${esc(p.category || 'Sin categoría')}</span>
          <span class="prod__price">${D.money(p.price)}</span></button>`;
      })
      .join('')}</div>`;
  }
  const cats = () => Array.from(new Set(D.data.products.map((p) => p.category).filter(Boolean))).sort();

  D.views.productos = {
    title: 'Postres',
    render() {
      const c = cats();
      return D.ui.page({
        title: 'Postres',
        sub: D.plural(D.data.products.length, 'postre en tu catálogo', 'postres en tu catálogo'),
        actions: `<button class="icon-btn glass" data-act="product.new" aria-label="Nuevo postre">${D.icon('plus')}</button>`,
        body: `<div class="toolbar" data-rise>${D.ui.search('productos.q', st.q, 'Buscar postre')}
            ${c.length ? `<div class="chips-row" id="pr-cats">${[['', 'Todos'], ...c.map((x) => [x, x])].map(([v, l]) => `<button type="button" class="filter-chip" data-cat="${esc(v)}" aria-pressed="${v === st.cat}">${esc(l)}</button>`).join('')}</div>` : ''}</div>
          <div id="pr-grid" data-rise>${gridHtml()}</div>`,
        fab: D.ui.fab('product.new', 'Nuevo postre', 'cupcake'),
      });
    },
  };
  D.inp['productos.q'] = (el) => {
    st.q = el.value;
    $('#pr-grid').innerHTML = gridHtml();
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    st.cat = b.dataset.cat;
    D.$$('#pr-cats .filter-chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#pr-grid').innerHTML = gridHtml();
  });
})();
