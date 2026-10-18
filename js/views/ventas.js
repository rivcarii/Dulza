/* Dulza · Ventas (historial) */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const st = (D.ui.state.ventas = { q: '', filter: 'todas', period: 'mes' });

  // «Por cobrar» y «Vencidas» son estados, no fechas: ignoran el periodo para que nunca se escondan deudas viejas
  const stateFilter = () => st.filter === 'abiertas' || st.filter === 'vencidas';
  const filters = () => {
    const all = D.q.sales();
    const n = (f) => all.filter((s) => f(D.sale.status(s))).length;
    const label = (t, c) => (c ? `${t} · ${c}` : t);
    return [['todas', 'Todas'], ['abiertas', label('Por cobrar', n((x) => x !== 'paid'))], ['vencidas', label('Vencidas', n((x) => x === 'overdue'))], ['pagadas', 'Pagadas']];
  };

  function filtered() {
    const p = D.period(st.period);
    const q = st.q.trim().toLowerCase();
    const list = D.q.sales().filter((s) => {
      if (!stateFilter() && !D.inPeriod(s.date, p)) return false;
      const status = D.sale.status(s);
      if (st.filter === 'abiertas' && status === 'paid') return false;
      if (st.filter === 'vencidas' && status !== 'overdue') return false;
      if (st.filter === 'pagadas' && status !== 'paid') return false;
      if (q && !(D.sale.customerName(s) + ' ' + s.number + ' ' + s.items.map((i) => i.name).join(' ')).toLowerCase().includes(q)) return false;
      return true;
    });
    // las vencidas, de la más atrasada a la menos atrasada
    return st.filter === 'vencidas' ? list.sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date)) : list;
  }

  function listHtml() {
    const list = filtered();
    if (!list.length) {
      const any = D.data.sales.length;
      return D.ui.empty({
        title: any ? 'Sin resultados' : 'Aún no hay ventas',
        text: any ? 'Prueba con otro filtro o periodo.' : 'Registra tu primera venta y aparecerá aquí.',
        cta: any ? '' : 'Nueva venta',
        act: 'sale.new',
        mood: any ? 'sleepy' : 'happy',
        art: any ? '' : 'pastel',
      });
    }
    let html = '';
    let day = '';
    const byDue = st.filter === 'vencidas';
    list.forEach((s, i) => {
      const key = byDue ? s.due || s.date : s.date;
      if (key !== day) {
        if (day) html += '</div>';
        day = key;
        const head = byDue ? `Venció ${D.relDay(day)} · ${D.fmtDate(day)}` : D.dayHeading(day);
        html += `<h2 class="list-head">${esc(head)}</h2><div class="list">`;
      }
      html += D.forms.saleRow(s);
    });
    return html + '</div>';
  }

  function summaryHtml() {
    const list = filtered();
    const total = sumBy(list, D.sale.total);
    const paid = sumBy(list, D.sale.paid);
    const bal = sumBy(list, D.sale.balance);
    return `<div class="summary">
      <div class="summary__item"><small>Vendido</small><b>${D.moneyC(total)}</b></div>
      <div class="summary__item"><small>Cobrado</small><b>${D.moneyC(paid)}</b></div>
      <div class="summary__item ${bal > 0 ? 'summary__item--bad' : ''}"><small>Por cobrar</small><b>${D.moneyC(bal)}</b></div></div>`;
  }

  const refresh = () => {
    $('#v-list').innerHTML = listHtml();
    $('#v-summary').innerHTML = summaryHtml();
    const sel = $('.select-pill');
    if (sel) sel.classList.toggle('is-off', stateFilter()); // el periodo no aplica a estos filtros
  };

  D.views.ventas = {
    title: 'Ventas',
    render() {
    // si este mes aún no hay ventas, se muestra todo el historial (hasta que la persona elija un periodo)
    if (!st.set) st.period = D.data.sales.some((s) => D.inPeriod(s.date, D.period('mes'))) ? 'mes' : 'todo';
      return D.ui.page({
        title: 'Ventas',
        cls: 'page--narrow',
        sub: D.plural(D.data.sales.length, 'venta registrada', 'ventas registradas'),
        actions: `<button class="icon-btn glass" data-act="sale.new" aria-label="Nueva venta">${D.icon('plus')}</button>`,
        body: `<div class="toolbar" data-rise>
            <div class="toolbar__row">${D.ui.search('ventas.q', st.q, 'Buscar cliente o factura')}
              <label class="select-pill ${stateFilter() ? 'is-off' : ''}"><span class="sr-only">Periodo</span><select data-change="ventas.period">${D.PERIODS.map((p) => `<option value="${p[0]}" ${p[0] === st.period ? 'selected' : ''}>${p[1]}</option>`).join('')}</select>${D.icon('chevD')}</label></div>
            ${D.ui.seg('ventas.filter', filters(), st.filter)}
          </div>
          <div id="v-summary" data-rise>${summaryHtml()}</div>
          <div id="v-list" data-rise>${listHtml()}</div>`,
        fab: D.ui.fab('sale.new', 'Nueva venta'),
      });
    },
  };
  D.inp['ventas.q'] = (el) => {
    st.q = el.value;
    refresh();
  };
  D.chg['ventas.period'] = (el) => {
    st.set = true;
    st.period = el.value;
    refresh();
  };
  D.seg['ventas.filter'] = (v) => {
    st.filter = v;
    refresh();
  };
})();
