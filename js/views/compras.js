/* Dulza · Compras (insumos y materiales) */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const st = (D.ui.state.compras = { q: '', filter: 'todas', period: 'mes' });
  const FILTERS = [['todas', 'Todas'], ['abiertas', 'Por pagar'], ['pagadas', 'Pagadas']];

  function filtered() {
    const p = D.period(st.period);
    const q = st.q.trim().toLowerCase();
    return D.q.purchases().filter((x) => {
      if (!D.inPeriod(x.date, p)) return false;
      const s = D.purchase.status(x);
      if (st.filter === 'abiertas' && s === 'paid') return false;
      if (st.filter === 'pagadas' && s !== 'paid') return false;
      if (q && !(D.purchase.supplierName(x) + ' ' + x.items.map((i) => i.name).join(' ')).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function listHtml() {
    const list = filtered();
    if (!list.length) {
      const any = D.data.purchases.length;
      return D.ui.empty({ title: any ? 'Sin resultados' : 'Aún no hay compras', text: any ? 'Prueba con otro filtro o periodo.' : 'Registra lo que compras para tus postres y controla tus costos.', cta: any ? '' : 'Nueva compra', act: 'purchase.new', mood: any ? 'sleepy' : 'happy', art: any ? '' : 'frios' });
    }
    let html = '', day = '';
    list.forEach((p) => {
      if (p.date !== day) {
        if (day) html += '</div>';
        day = p.date;
        html += `<h2 class="list-head">${esc(D.dayHeading(day))}</h2><div class="list">`;
      }
      html += D.forms.purchaseRow(p);
    });
    return html + '</div>';
  }
  function summaryHtml() {
    const list = filtered();
    const bal = sumBy(list, D.purchase.balance);
    return `<div class="summary">
      <div class="summary__item"><small>Comprado</small><b>${D.moneyC(sumBy(list, D.purchase.total))}</b></div>
      <div class="summary__item"><small>Pagado</small><b>${D.moneyC(sumBy(list, D.purchase.paid))}</b></div>
      <div class="summary__item ${bal > 0 ? 'summary__item--bad' : ''}"><small>Por pagar</small><b>${D.moneyC(bal)}</b></div></div>`;
  }
  const refresh = () => {
    $('#p-list').innerHTML = listHtml();
    $('#p-summary').innerHTML = summaryHtml();
  };

  D.views.compras = {
    title: 'Compras',
    render() {
      return D.ui.page({
        title: 'Compras',
        cls: 'page--narrow',
        sub: D.plural(D.data.purchases.length, 'compra registrada', 'compras registradas'),
        actions: `<button class="icon-btn glass" data-act="purchase.new" aria-label="Nueva compra">${D.icon('plus')}</button>`,
        body: `<div class="toolbar" data-rise>
            <div class="toolbar__row">${D.ui.search('compras.q', st.q, 'Buscar proveedor o insumo')}
              <label class="select-pill"><span class="sr-only">Periodo</span><select data-change="compras.period">${D.PERIODS.map((p) => `<option value="${p[0]}" ${p[0] === st.period ? 'selected' : ''}>${p[1]}</option>`).join('')}</select>${D.icon('chevD')}</label></div>
            ${D.ui.seg('compras.filter', FILTERS, st.filter)}
          </div>
          <div id="p-summary" data-rise>${summaryHtml()}</div><div id="p-list" data-rise>${listHtml()}</div>`,
        fab: D.ui.fab('purchase.new', 'Nueva compra', 'cart'),
      });
    },
  };
  D.inp['compras.q'] = (el) => {
    st.q = el.value;
    refresh();
  };
  D.chg['compras.period'] = (el) => {
    st.period = el.value;
    refresh();
  };
  D.seg['compras.filter'] = (v) => {
    st.filter = v;
    refresh();
  };
})();
