/* Dulza · Inicio (resumen del negocio) */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const sumBy = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const st = (D.ui.state.inicio = { range: '7d' });

  /* Serie de ventas por día o por mes */
  function series(range) {
    const t = D.today();
    const out = [];
    if (range === '6m') {
      for (let i = 5; i >= 0; i--) {
        const d = D.addMonths(t, -i);
        const key = d.slice(0, 7);
        const total = sumBy(D.data.sales.filter((s) => s.date.slice(0, 7) === key), D.sale.total);
        out.push({ label: D.MONTHS[D.parseDate(d).getMonth()], title: `${D.MONTHS_L[D.parseDate(d).getMonth()]} ${d.slice(0, 4)}`, v: total });
      }
      return out;
    }
    const n = range === '30d' ? 30 : 7;
    for (let i = n - 1; i >= 0; i--) {
      const d = D.addDays(t, -i);
      const total = sumBy(D.data.sales.filter((s) => s.date === d), D.sale.total);
      const date = D.parseDate(d);
      out.push({
        label: n === 7 ? D.DAYS_S[date.getDay()] : (i % 5 === 0 || i === n - 1 ? String(date.getDate()) : ''),
        title: D.fmtDateLong(d),
        v: total,
      });
    }
    return out;
  }

  function barsHtml(data, selected) {
    const max = Math.max(...data.map((d) => d.v), 1);
    return `<div class="bars ${data.length > 12 ? 'bars--dense' : ''}" role="group" aria-label="Ventas por periodo">${data
      .map(
        (d, i) => `<button type="button" class="bar" data-bar="${i}" aria-pressed="${i === selected}" aria-label="${esc(d.title)}: ${D.money(d.v)}">
        <span class="bar__track"><span class="bar__fill" style="--h:${Math.max(4, (d.v / max) * 100)}%"></span></span><span class="bar__label">${esc(d.label)}</span></button>`
      )
      .join('')}</div>`;
  }

  function readout(d, data) {
    const total = sumBy(data, (x) => x.v);
    return `<b>${D.money(d.v)}</b><span>${esc(d.title)}<br>Total del periodo ${D.money(total)}</span>`;
  }

  /* Eventos recientes: ventas, abonos y compras */
  function activity() {
    const ev = [];
    D.data.sales.forEach((s) => {
      ev.push({ kind: 'sale', at: s.at || 0, date: s.date, id: s.id, title: D.sale.customerName(s), sub: `Venta ${s.number}`, amount: D.sale.total(s) });
      (s.payments || []).forEach((p) => p.note !== 'Abono inicial' && s.term > 0 && ev.push({ kind: 'pay', at: p.at || 0, date: p.date, id: s.id, title: D.sale.customerName(s), sub: `Abono · ${p.method}`, amount: p.amount }));
    });
    D.data.purchases.forEach((p) => ev.push({ kind: 'buy', at: p.at || 0, date: p.date, id: p.id, title: D.purchase.supplierName(p), sub: `Compra · ${D.purchase.summary(p)}`, amount: -D.purchase.total(p) }));
    return ev.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 6);
  }

  D.views.inicio = {
    title: 'Inicio',
    render() {
      const S = D.data.settings;
      const t = D.today();
      const m0 = D.monthStart(t);
      const prev = D.addMonths(t, -1);
      const sales = D.data.sales;
      const monthSales = sales.filter((s) => s.date >= m0 && s.date <= t);
      const prevSales = sales.filter((s) => s.date >= D.monthStart(prev) && s.date <= D.monthEnd(prev));
      const vMonth = sumBy(monthSales, D.sale.total);
      const vPrev = sumBy(prevSales, D.sale.total);
      const profit = sumBy(monthSales, D.sale.profit);
      const collected = sumBy(sales, (s) => sumBy((s.payments || []).filter((p) => p.date >= m0 && p.date <= t), (p) => p.amount));
      const bought = sumBy(D.data.purchases.filter((p) => p.date >= m0 && p.date <= t), D.purchase.total);
      const recv = D.q.receivables();
      const recvTotal = sumBy(recv, D.sale.balance);
      const over = recv.filter((s) => D.sale.status(s) === 'overdue');
      const overTotal = sumBy(over, D.sale.balance);
      const delta = vPrev > 0 ? ((vMonth - vPrev) / vPrev) * 100 : null;
      const empty = !sales.length && !D.data.purchases.length;

      const data = series(st.range);
      const sel = data.length - 1;

      const top = {};
      monthSales.forEach((s) => s.items.forEach((i) => {
        const k = i.name;
        top[k] = top[k] || { name: k, emoji: i.emoji, qty: 0, rev: 0 };
        top[k].qty += i.qty;
        top[k].rev += i.qty * i.price;
      }));
      const topList = Object.values(top).sort((a, b) => b.rev - a.rev).slice(0, 5);
      const topMax = Math.max(...topList.map((x) => x.rev), 1);

      const due = recv.slice(0, 5);
      const act = activity();
      const first = (S.owner || '').split(' ')[0];

      const hero = `
        <section class="hero" data-rise>
          <p class="hero__label">Por cobrar</p>
          <p class="hero__value" data-count="${recvTotal}" data-count-key="recv">${D.moneyC(recvTotal)}</p>
          <div class="hero__meta">
            ${over.length ? `<span class="pill">${D.icon('bell')}${D.money(overTotal)} vencido</span>` : `<span class="pill">${D.icon('checkCircle')}Todo al día</span>`}
            <span class="pill">${D.plural(recv.length, 'venta pendiente', 'ventas pendientes')}</span>
          </div>
          <div class="hero__foot">
            <div class="hero__actions">
              <button class="btn btn--glass btn--sm" data-go="cobros">${D.icon('wallet')}Ver cobros</button>
              <button class="btn btn--glass btn--sm" data-act="sale.new">${D.icon('plus')}Nueva venta</button>
            </div>
            <div class="hero__art" aria-hidden="true">${D.art.mascot({ mood: over.length ? 'think' : recv.length ? 'happy' : 'joy' })}</div>
          </div>
        </section>`;

      const kpi = (icon, label, value, note) => `<div class="kpi" data-rise><p class="kpi__label">${D.icon(icon)}${label}</p><p class="kpi__value">${value}</p><p class="kpi__note">${note}</p></div>`;
      const deltaChip =
        delta === null
          ? '<span class="delta delta--flat">Primer mes</span>'
          : `<span class="delta ${delta > 0.5 ? 'delta--up' : delta < -0.5 ? 'delta--down' : 'delta--flat'}">${delta > 0.5 ? '▲' : delta < -0.5 ? '▼' : '='} ${Math.abs(delta) > 999 ? '999+' : Math.abs(Math.round(delta))}%</span> vs. mes pasado`;
      const kpis = `<div class="kpis">
          ${kpi('receipt', 'Ventas', D.moneyC(vMonth), deltaChip)}
          ${kpi('coin', 'Cobrado', D.moneyC(collected), 'Dinero recibido este mes')}
          ${kpi('cart', 'Compras', D.moneyC(bought), bought > 0 ? 'Insumos este mes' : 'Sin compras aún')}
          ${kpi('trend', 'Ganancia', D.moneyC(profit), 'Estimada: ventas − costos')}
        </div>`;

      const quick = `<div class="quick" data-rise>
          <button class="quick__btn" data-act="sale.new"><span class="quick__ic">${D.icon('receipt')}</span>Nueva venta</button>
          <button class="quick__btn" data-act="purchase.new"><span class="quick__ic">${D.icon('cart')}</span>Nueva compra</button>
          <button class="quick__btn" data-go="cobros"><span class="quick__ic">${D.icon('wallet')}</span>Cobrar</button>
          <button class="quick__btn" data-act="customer.new"><span class="quick__ic">${D.icon('userPlus')}</span>Cliente</button>
        </div>`;

      const chart = `<section class="card c-chart" data-rise>
          <div class="chart__head">
            <div class="card__head" style="margin:0"><h2 class="card__title">Ventas</h2></div>
            ${D.ui.seg('inicio.range', [['7d', '7 días'], ['30d', '30 días'], ['6m', '6 meses']], st.range)}
            <div class="chart__readout" id="chart-readout" aria-live="polite">${readout(data[sel], data)}</div>
          </div>
          <div id="chart-bars">${barsHtml(data, sel)}</div>
        </section>`;

      const dueCard = `<section class="card card--flush c-due" data-rise>
          <div class="card__head"><h2 class="card__title">Próximos cobros</h2><button class="card__link" data-go="cobros">Ver todos${D.icon('chevR', 'i--inline')}</button></div>
          ${due.length ? due.map((s) => `<div class="row row--tap" data-act="sale.open" data-id="${s.id}" role="button" tabindex="0">
              ${D.ui.avatar(D.sale.customerName(s))}
              <span class="row__main"><span class="row__title">${esc(D.sale.customerName(s))}</span><span class="row__sub">${esc(s.number)} · ${esc(D.ui.dueText(s, D.sale.balance(s)))}</span></span>
              <span class="row__end"><span class="row__amount">${D.money(D.sale.balance(s))}</span>${D.sale.status(s) === 'overdue' ? D.ui.chip('bad', 'Vencida') : ''}</span>
            </div>`).join('') : `<div class="empty empty--compact"><p class="muted">No tienes cobros pendientes 🎉</p></div>`}
        </section>`;

      const topCard = `<section class="card c-top" data-rise>
          <div class="card__head"><h2 class="card__title">Lo más vendido</h2><span class="muted" style="font-size:.85rem">Este mes</span></div>
          ${topList.length ? topList.map((x, i) => `<div class="top-item">${D.ui.emoji(x.emoji, '', i === 0)}<div><b style="font-weight:650">${esc(x.name)}</b><div class="meter"><i style="--w:${Math.round((x.rev / topMax) * 100)}%"></i></div></div><div style="text-align:right"><b class="num">${D.money(x.rev)}</b><div class="muted" style="font-size:.8rem">${x.qty} uds.</div></div></div>`).join('') : '<p class="muted center" style="padding:16px 0">Aún no hay ventas este mes.</p>'}
        </section>`;

      const actCard = `<section class="card card--flush c-act activity" data-rise>
          <div class="card__head"><h2 class="card__title">Actividad reciente</h2></div>
          ${act.length ? act.map((e) => `<button type="button" class="row row--tap" data-act="${e.kind === 'buy' ? 'purchase.open' : 'sale.open'}" data-id="${e.id}">
              <span class="act__ic act__ic--${e.kind}">${D.icon(e.kind === 'sale' ? 'receipt' : e.kind === 'pay' ? 'check' : 'cart')}</span>
              <span class="row__main"><span class="row__title">${esc(e.title)}</span><span class="row__sub">${esc(e.sub)} · ${D.relDay(e.date) === 'hoy' || D.relDay(e.date) === 'ayer' ? D.relDay(e.date) : D.fmtDate(e.date)}</span></span>
              <span class="row__amount" style="${e.amount < 0 ? '' : e.kind === 'pay' ? 'color:var(--ok-ink)' : ''}">${e.amount < 0 ? '−' : e.kind === 'pay' ? '+' : ''}${D.money(Math.abs(e.amount))}</span></button>`).join('') : '<div class="empty empty--compact"><p class="muted">Aquí verás tus movimientos.</p></div>'}
        </section>`;

      const emptyHero = `<section class="card" data-rise>${D.ui.empty({ title: '¡Empecemos a vender!', text: 'Registra tu primera venta o carga datos de ejemplo para explorar la app.', cta: 'Nueva venta', act: 'sale.new', art: 'pastel' })}
          <div class="center" style="padding-bottom:18px"><button class="btn btn--tint" data-act="demo.load">${D.icon('sparkle')}Cargar datos de ejemplo</button></div></section>`;

      return D.ui.page({
        title: `${D.greeting()}${first ? ', ' + esc(first) : ''}`,
        kicker: D.fmtDateLong(t),
        sub: '',
        left: `<span class="navbar__brand">${D.art.logo({ size: 34 })}</span>`,
        actions: `<button class="icon-btn glass" data-go="ajustes" aria-label="Ajustes">${D.icon('sliders')}</button>`,
        body: empty ? `<div class="dash">${emptyHero}</div>` : `<div class="dash">${hero}${kpis}${quick}${chart}${dueCard}${topCard}${actCard}</div>`,
      });
    },

    mount(root) {
      const first = $('.page__title', root);
      if (first) first.classList.add('page__title--greet');
      root.__series = series(st.range);
    },
  };

  /* Gráfico interactivo: tocar una barra muestra su valor */
  document.addEventListener('click', (e) => {
    const bar = e.target.closest('[data-bar]');
    if (!bar) return;
    const data = series(st.range);
    const i = +bar.dataset.bar;
    $$('.bar', bar.parentElement).forEach((b) => b.setAttribute('aria-pressed', b === bar));
    $('#chart-readout').innerHTML = readout(data[i], data);
    D.haptic(5);
  });
  D.seg['inicio.range'] = (v) => {
    st.range = v;
    const data = series(v);
    $('#chart-bars').innerHTML = barsHtml(data, data.length - 1);
    $('#chart-readout').innerHTML = readout(data[data.length - 1], data);
    if (!D.reduceMotion())
      $$('#chart-bars .bar').forEach((b, i) =>
        b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: Math.min(i, 14) * 14, easing: 'cubic-bezier(0.23,1,0.32,1)', fill: 'backwards' })
      );
  };

  D.act['demo.load'] = () => {
    D.demo.load();
    D.toast('Datos de ejemplo cargados', { icon: 'sparkle' });
  };
})();
