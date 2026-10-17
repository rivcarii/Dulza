/* Dulza · Reportes */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const st = (D.ui.state.reportes = { period: 'mes' });

  const monthsSeries = () => {
    const t = D.today();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = D.addMonths(t, -i);
      const key = d.slice(0, 7);
      out.push({
        label: D.MONTHS[D.parseDate(d).getMonth()],
        title: `${D.MONTHS_L[D.parseDate(d).getMonth()]} ${d.slice(0, 4)}`,
        sales: sumBy(D.data.sales.filter((s) => s.date.slice(0, 7) === key), D.sale.total),
        buys: sumBy(D.data.purchases.filter((p) => p.date.slice(0, 7) === key), D.purchase.total),
      });
    }
    return out;
  };

  function aging() {
    const open = D.q.receivables();
    const b = [
      { k: 'Al día', t: 0, n: 0 },
      { k: 'Vencido 1–15 días', t: 0, n: 0 },
      { k: 'Vencido 16–30 días', t: 0, n: 0 },
      { k: 'Vencido más de 30 días', t: 0, n: 0 },
    ];
    open.forEach((s) => {
      const late = -D.diffDays(s.due || s.date, D.today());
      const i = late <= 0 ? 0 : late <= 15 ? 1 : late <= 30 ? 2 : 3;
      b[i].t += D.sale.balance(s);
      b[i].n++;
    });
    return b;
  }

  const num = (n) => String(D.r2(n)).replace('.', D.data.settings.numFmt === 'dot' ? ',' : '.');
  function exportCSV(kind) {
    let rows, name;
    if (kind === 'ventas') {
      name = 'ventas';
      rows = [['Número', 'Fecha', 'Cliente', 'Plazo (días)', 'Vence', 'Total', 'Abonado', 'Saldo', 'Estado', 'Detalle']].concat(
        D.q.sales().map((s) => [s.number, s.date, D.sale.customerName(s), s.term, s.due, num(D.sale.total(s)), num(D.sale.paid(s)), num(D.sale.balance(s)), D.STATUS[D.sale.status(s)].label, s.items.map((i) => `${i.qty}x ${i.name}`).join(' | ')])
      );
    } else if (kind === 'compras') {
      name = 'compras';
      rows = [['Fecha', 'Proveedor', 'Plazo (días)', 'Vence', 'Total', 'Pagado', 'Saldo', 'Estado', 'Insumos']].concat(
        D.q.purchases().map((p) => [p.date, D.purchase.supplierName(p), p.term, p.due, num(D.purchase.total(p)), num(D.purchase.paid(p)), num(D.purchase.balance(p)), D.STATUS[D.purchase.status(p)].label, p.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(' | ')])
      );
    } else {
      name = 'clientes';
      rows = [['Nombre', 'WhatsApp', 'Dirección', 'Compras', 'Comprado', 'Saldo']].concat(
        D.data.customers.map((c) => {
          const s = D.customer.stats(c.id);
          return [c.name, c.phone, c.address, s.count, num(s.total), num(s.balance)];
        })
      );
    }
    D.download(new Blob([D.csv(rows)], { type: 'text/csv;charset=utf-8' }), `dulza-${name}-${D.today()}.csv`);
    D.toast('Archivo descargado (se abre con Excel)', { icon: 'download' });
  }
  D.act['report.csv'] = (el) => exportCSV(el.dataset.kind);

  function body() {
    const p = D.period(st.period);
    const sales = D.data.sales.filter((s) => D.inPeriod(s.date, p));
    const buys = D.data.purchases.filter((x) => D.inPeriod(x.date, p));
    const revenue = sumBy(sales, D.sale.total);
    const cost = sumBy(sales, D.sale.cost);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const bought = sumBy(buys, D.purchase.total);
    const collected = sumBy(D.data.sales, (s) => sumBy((s.payments || []).filter((x) => D.inPeriod(x.date, p)), (x) => x.amount));
    const paidOut = sumBy(D.data.purchases, (x) => sumBy((x.payments || []).filter((y) => D.inPeriod(y.date, p)), (y) => y.amount));
    const flow = collected - paidOut;

    const byCust = {};
    sales.forEach((s) => {
      const k = D.sale.customerName(s);
      byCust[k] = (byCust[k] || 0) + D.sale.total(s);
    });
    const topC = Object.entries(byCust).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const byProd = {};
    sales.forEach((s) => s.items.forEach((i) => {
      const o = (byProd[i.name] = byProd[i.name] || { emoji: i.emoji, qty: 0, rev: 0 });
      o.qty += i.qty;
      o.rev += i.qty * i.price;
    }));
    const topP = Object.entries(byProd).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);

    const series = monthsSeries();
    const max = Math.max(...series.flatMap((s) => [s.sales, s.buys]), 1);
    const ag = aging();
    const agMax = Math.max(...ag.map((x) => x.t), 1);
    const kpi = (icon, label, value, note) => `<div class="kpi"><p class="kpi__label">${D.icon(icon)}${label}</p><p class="kpi__value">${value}</p>${note ? `<p class="kpi__note">${note}</p>` : ''}</div>`;

    return `
      <div class="kpis" data-rise>
        ${kpi('receipt', 'Ventas', D.moneyC(revenue), D.plural(sales.length, 'venta', 'ventas'))}
        ${kpi('trend', 'Ganancia bruta', D.moneyC(profit), revenue > 0 ? `${Math.round(margin)}% de margen` : 'Sin ventas')}
        ${kpi('cart', 'Compras', D.moneyC(bought), D.plural(buys.length, 'compra', 'compras'))}
        ${kpi('coin', 'Flujo de caja', `<span style="color:${flow < 0 ? 'var(--bad-ink)' : 'inherit'}">${D.moneyC(flow)}</span>`, `Cobrado ${D.money(collected)} · Pagado ${D.money(paidOut)}`)}
      </div>

      <section class="card" data-rise>
        <div class="card__head"><h2 class="card__title">Ventas vs. compras</h2><span class="muted" style="font-size:.85rem">Últimos 6 meses</span></div>
        <div class="bars bars--dual" role="group" aria-label="Ventas y compras por mes">${series.map((s) => `<div class="bar" role="img" aria-label="${esc(s.title)}: ventas ${D.money(s.sales)}, compras ${D.money(s.buys)}">
          <span class="bar__track"><span class="bar__fill" style="--h:${Math.max(3, (s.sales / max) * 100)}%"></span><span class="bar__fill" style="--h:${Math.max(3, (s.buys / max) * 100)}%"></span></span><span class="bar__label">${esc(s.label)}</span></div>`).join('')}</div>
        <div class="legend"><span><i></i>Ventas</span><span><i class="alt"></i>Compras</span></div>
      </section>

      <div class="rep-cols">
        <section class="card" data-rise>
          <div class="card__head"><h2 class="card__title">Mejores clientes</h2></div>
          ${topC.length ? topC.map(([n, v]) => `<div class="top-item">${D.ui.avatar(n)}<div><b style="font-weight:650">${esc(n)}</b><div class="meter"><i style="--w:${Math.round((v / topC[0][1]) * 100)}%"></i></div></div><b class="num">${D.money(v)}</b></div>`).join('') : '<p class="muted center" style="padding:14px 0">Sin ventas en este periodo.</p>'}
        </section>
        <section class="card" data-rise>
          <div class="card__head"><h2 class="card__title">Postres más vendidos</h2></div>
          ${topP.length ? topP.map(([n, o], i) => `<div class="top-item">${D.ui.emoji(o.emoji, '', i === 0)}<div><b style="font-weight:650">${esc(n)}</b><div class="meter"><i style="--w:${Math.round((o.rev / topP[0][1].rev) * 100)}%"></i></div></div><div style="text-align:right"><b class="num">${D.money(o.rev)}</b><div class="muted" style="font-size:.8rem">${o.qty} uds.</div></div></div>`).join('') : '<p class="muted center" style="padding:14px 0">Sin ventas en este periodo.</p>'}
        </section>
      </div>

      <section class="card" data-rise>
        <div class="card__head"><h2 class="card__title">Antigüedad de lo que te deben</h2></div>
        ${ag.map((x, i) => `<div class="top-item" style="grid-template-columns:1fr auto"><div><span style="font-weight:600">${x.k}</span><span class="muted" style="font-size:.82rem"> · ${D.plural(x.n, 'factura', 'facturas')}</span><div class="meter"><i style="--w:${Math.round((x.t / agMax) * 100)}%;${i ? `background:${['', 'var(--warn)', 'var(--bad)', 'var(--bad)'][i]}` : 'background:var(--ok)'}"></i></div></div><b class="num">${D.money(x.t)}</b></div>`).join('')}
      </section>

      <div class="form-title" data-rise>Exportar a Excel</div>
      <div class="list" data-rise>
        <button class="row row--tap row--noavatar" data-act="report.csv" data-kind="ventas"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Todas las ventas</span><span class="row__sub">Archivo CSV</span></span></button>
        <button class="row row--tap row--noavatar" data-act="report.csv" data-kind="compras"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Todas las compras</span><span class="row__sub">Archivo CSV</span></span></button>
        <button class="row row--tap row--noavatar" data-act="report.csv" data-kind="clientes"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Clientes y saldos</span><span class="row__sub">Archivo CSV</span></span></button>
      </div>`;
  }

  D.views.reportes = {
    title: 'Reportes',
    render() {
      return D.ui.page({
        title: 'Reportes',
        sub: 'Cómo va tu negocio',
        actions: `<label class="select-pill" style="height:44px"><span class="sr-only">Periodo</span><select data-change="reportes.period">${D.PERIODS.map((p) => `<option value="${p[0]}" ${p[0] === st.period ? 'selected' : ''}>${p[1]}</option>`).join('')}</select>${D.icon('chevD')}</label>`,
        body: `<div class="stack" id="rep-body">${body()}</div>`,
      });
    },
  };
  D.chg['reportes.period'] = (el) => {
    st.period = el.value;
    $('#rep-body').innerHTML = body();
  };
})();
