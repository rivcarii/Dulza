/* Dulza · almacenamiento local (IndexedDB con respaldo en localStorage) + cálculos de negocio */
(function () {
  'use strict';
  const D = window.D;

  /* ---------- Valores por defecto ---------- */
  D.PALETTES = [
    { id: 'fresa', name: 'Fresa', brand: '#d9366f', accent: '#f59e5b' },
    { id: 'durazno', name: 'Durazno', brand: '#d4552a', accent: '#f7b267' },
    { id: 'lavanda', name: 'Lavanda', brand: '#7d4fd6', accent: '#f08fb4' },
    { id: 'menta', name: 'Menta', brand: '#0f8a73', accent: '#f4c95d' },
    { id: 'cacao', name: 'Cacao', brand: '#8a4b2d', accent: '#e9a23b' },
    { id: 'mora', name: 'Mora', brand: '#a3246f', accent: '#6c63ff' },
  ];

  D.COUNTRIES = [
    { n: 'Colombia', d: '57', c: '$', dec: 0, f: 'dot' },
    { n: 'México', d: '52', c: '$', dec: 2, f: 'comma' },
    { n: 'Perú', d: '51', c: 'S/', dec: 2, f: 'comma' },
    { n: 'Argentina', d: '54', c: '$', dec: 0, f: 'dot' },
    { n: 'Chile', d: '56', c: '$', dec: 0, f: 'dot' },
    { n: 'Ecuador', d: '593', c: '$', dec: 2, f: 'comma' },
    { n: 'Venezuela', d: '58', c: '$', dec: 2, f: 'dot' },
    { n: 'Bolivia', d: '591', c: 'Bs', dec: 2, f: 'dot' },
    { n: 'Paraguay', d: '595', c: '₲', dec: 0, f: 'dot' },
    { n: 'Uruguay', d: '598', c: '$', dec: 0, f: 'dot' },
    { n: 'Panamá', d: '507', c: 'B/.', dec: 2, f: 'comma' },
    { n: 'Costa Rica', d: '506', c: '₡', dec: 0, f: 'dot' },
    { n: 'Guatemala', d: '502', c: 'Q', dec: 2, f: 'comma' },
    { n: 'Honduras', d: '504', c: 'L', dec: 2, f: 'comma' },
    { n: 'El Salvador', d: '503', c: '$', dec: 2, f: 'comma' },
    { n: 'Nicaragua', d: '505', c: 'C$', dec: 2, f: 'comma' },
    { n: 'Rep. Dominicana', d: '1', c: 'RD$', dec: 2, f: 'comma' },
    { n: 'Puerto Rico', d: '1', c: '$', dec: 2, f: 'comma' },
    { n: 'España', d: '34', c: '€', dec: 2, f: 'dot' },
    { n: 'Estados Unidos', d: '1', c: '$', dec: 2, f: 'comma' },
  ];

  // Mensajes de WhatsApp: *negrita*, viñetas y una línea por dato para que se lean de un vistazo.
  // {detalle} = una viñeta por postre, {resumen} = total, abonos y saldo, {vence} = fecha límite con aviso si ya venció.
  D.WA_INVOICE =
    '🧁 *{negocio}*\nFactura *{numero}* · {fecha}\n\nHola {cliente} 👋 Este es el detalle de tu pedido:\n\n{detalle}\n\n{resumen}\n{vence}\n\n¡Gracias por tu compra! 💖';
  D.WA_REMINDER =
    'Hola {cliente} 🧁\nTe escribo de *{negocio}* para recordarte con cariño que tienes un saldo pendiente:\n\n{detalle}\n\n*Total por pagar: {saldo}*\n{vence}\n\nPuedes pagar por el medio que prefieras y me avisas por aquí. ¡Gracias! 💖';
  // Textos de fábrica anteriores: si el dispositivo todavía los tiene (no se personalizaron) se cambian por los nuevos
  D.WA_OLD = {
    waInvoice: ['Hola {cliente} 🧁\nTe comparto tu factura *{numero}* de *{negocio}*:\n\n{detalle}\n\n*Total:* {total}\n{estado}\n\n¡Gracias por tu compra! 💖'],
    waReminder: ['Hola {cliente} 🧁\nTe escribo de *{negocio}* para recordarte con cariño que tienes un saldo pendiente de *{saldo}* ({detalle}).\n{vence}\n\nPuedes pagarme por el medio que prefieras y me avisas por aquí. ¡Gracias! 💖'],
  };

  D.defaults = {
    name: 'Dulza',
    owner: '',
    tagline: 'Postres hechos con amor',
    phone: '',
    address: '',
    country: '',
    dial: '',
    currency: '$',
    decimals: 0,
    numFmt: 'dot',
    invoicePrefix: 'D-',
    nextInvoice: 1,
    defaultTerm: 15,
    terms: 'Pago a 15 o 30 días según lo acordado. ¡Gracias por apoyar un emprendimiento!',
    waInvoice: D.WA_INVOICE,
    waReminder: D.WA_REMINDER,
    theme: 'auto',
    palette: 'fresa',
    brand: '#d9366f',
    accent: '#f59e5b',
    logo: '',
    mascot: '',
    onboarded: false,
    lastBackup: '',
  };

  D.data = {
    settings: { ...D.defaults },
    customers: [],
    products: [],
    sales: [],
    suppliers: [],
    purchases: [],
    deleted: [], // lápidas de registros borrados {col, id, at}: sirven para que un borrado también llegue al otro dispositivo
  };
  const KEYS = Object.keys(D.data);

  /* ---------- Persistencia ---------- */
  let db = null;
  let mode = 'memory';
  const dirty = new Set();
  const listeners = new Set();
  let timer = 0;
  let emitQueued = false;

  const idbOpen = () =>
    new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('sin indexedDB'));
      const req = indexedDB.open('dulza', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('bloqueado'));
    });
  const idbGetAll = () =>
    new Promise((resolve, reject) => {
      const out = {};
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          out[c.key] = c.value;
          c.continue();
        } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  const idbPut = (key, value) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

  function hydrate(saved) {
    KEYS.forEach((k) => {
      if (saved[k] == null) return;
      if (k === 'settings') {
        D.data.settings = { ...D.defaults, ...saved[k] };
        Object.keys(D.WA_OLD).forEach((f) => { if (D.WA_OLD[f].includes(D.data.settings[f])) D.data.settings[f] = D.defaults[f]; });
      }
      else if (Array.isArray(saved[k])) D.data[k] = saved[k];
    });
  }

  async function flush() {
    clearTimeout(timer);
    const keys = Array.from(dirty);
    dirty.clear();
    for (const k of keys) {
      try {
        if (mode === 'idb') await idbPut(k, JSON.parse(JSON.stringify(D.data[k])));
        else if (mode === 'ls') localStorage.setItem('dulza:' + k, JSON.stringify(D.data[k]));
      } catch (e) {
        console.warn('No se pudo guardar', k, e);
        D.store.error = true;
      }
    }
  }

  function emit() {
    if (emitQueued) return;
    emitQueued = true;
    requestAnimationFrame(() => {
      emitQueued = false;
      listeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  D.store = {
    error: false,
    get mode() {
      return mode;
    },
    async init() {
      try {
        db = await idbOpen();
        mode = 'idb';
        hydrate(await idbGetAll());
      } catch (e) {
        try {
          const saved = {};
          KEYS.forEach((k) => {
            const raw = localStorage.getItem('dulza:' + k);
            if (raw) saved[k] = JSON.parse(raw);
          });
          mode = 'ls';
          hydrate(saved);
        } catch (e2) {
          mode = 'memory';
        }
      }
      try {
        navigator.storage && navigator.storage.persist && navigator.storage.persist();
      } catch (e) {}
      if (D.store.afterLoad) D.store.afterLoad(); // sync.js toma la «foto» inicial para detectar cambios por registro
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
    },
    commit(...keys) {
      const ks = keys.length ? keys : KEYS;
      // sync.js sella con fecha los registros nuevos o cambiados y anota los borrados (devuelve las colecciones extra tocadas)
      const extra = D.store.track ? D.store.track(ks) : [];
      ks.concat(extra).forEach((k) => dirty.add(k));
      clearTimeout(timer);
      timer = setTimeout(flush, 120);
      emit();
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    flush,
    exportJSON() {
      return JSON.stringify({ app: 'dulza', version: 1, exportedAt: new Date().toISOString(), data: D.data }, null, 1);
    },
    importJSON(text) {
      const obj = JSON.parse(text);
      if (!obj || obj.app !== 'dulza' || !obj.data) throw new Error('Este archivo no es un respaldo de Dulza.');
      KEYS.forEach((k) => {
        if (k === 'settings') D.data.settings = { ...D.defaults, ...(obj.data.settings || {}) };
        else D.data[k] = Array.isArray(obj.data[k]) ? obj.data[k] : [];
      });
      D.store.commit();
    },
    reset() {
      KEYS.forEach((k) => {
        D.data[k] = k === 'settings' ? { ...D.defaults } : [];
      });
      D.store.commit();
    },
  };

  /* ---------- Cálculos de negocio ---------- */
  const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const STATUS = {
    paid: { label: 'Pagada', tone: 'ok' },
    pending: { label: 'Pendiente', tone: 'info' },
    partial: { label: 'Abonada', tone: 'warn' },
    overdue: { label: 'Vencida', tone: 'bad' },
  };
  D.STATUS = STATUS;
  D.METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];

  const docStatus = (doc, total) => {
    const paid = D.r2(sum(doc.payments || [], (p) => p.amount));
    const bal = D.r2(total - paid);
    if (bal <= 0.004) return 'paid';
    if (doc.due && doc.due < D.today()) return 'overdue';
    return paid > 0 ? 'partial' : 'pending';
  };

  D.sale = {
    byId: (id) => D.data.sales.find((s) => s.id === id),
    subtotal: (s) => D.r2(sum(s.items, (i) => i.qty * i.price)),
    total: (s) => Math.max(0, D.r2(D.sale.subtotal(s) - (s.discount || 0))),
    cost: (s) => D.r2(sum(s.items, (i) => i.qty * (i.cost || 0))),
    profit: (s) => D.r2(D.sale.total(s) - D.sale.cost(s)),
    paid: (s) => D.r2(sum(s.payments || [], (p) => p.amount)),
    balance: (s) => Math.max(0, D.r2(D.sale.total(s) - D.sale.paid(s))),
    status: (s) => docStatus(s, D.sale.total(s)),
    units: (s) => sum(s.items, (i) => i.qty),
    number(seq) {
      return D.data.settings.invoicePrefix + String(seq).padStart(4, '0');
    },
    // La numeración es por serie (prefijo): cada persona usa el suyo («D-», «R-»…) y así dos dispositivos nunca repiten número.
    nextSeq() {
      const S = D.data.settings;
      const pre = S.invoicePrefix || '';
      const max = D.data.sales.reduce((m, s) => (String(s.number || '').startsWith(pre) ? Math.max(m, s.seq || 0) : m), 0);
      return Math.max(S.nextInvoice || 1, max + 1);
    },
    customer: (s) => D.data.customers.find((c) => c.id === s.customerId),
    customerName: (s) => (D.sale.customer(s) ? D.sale.customer(s).name : 'Cliente ocasional'),
  };

  D.purchase = {
    byId: (id) => D.data.purchases.find((p) => p.id === id),
    total: (p) => D.r2(sum(p.items, (i) => i.qty * i.cost)),
    paid: (p) => D.r2(sum(p.payments || [], (x) => x.amount)),
    balance: (p) => Math.max(0, D.r2(D.purchase.total(p) - D.purchase.paid(p))),
    status: (p) => docStatus(p, D.purchase.total(p)),
    supplier: (p) => D.data.suppliers.find((s) => s.id === p.supplierId),
    supplierName: (p) => (D.purchase.supplier(p) ? D.purchase.supplier(p).name : 'Sin proveedor'),
    summary: (p) => p.items.map((i) => i.name).slice(0, 2).join(', ') + (p.items.length > 2 ? ` +${p.items.length - 2}` : ''),
  };

  D.customer = {
    byId: (id) => D.data.customers.find((c) => c.id === id),
    sales: (id) => D.data.sales.filter((s) => s.customerId === id),
    stats(id) {
      const list = D.customer.sales(id);
      const total = sum(list, D.sale.total);
      const balance = sum(list, D.sale.balance);
      const overdue = list.filter((s) => D.sale.status(s) === 'overdue');
      const last = list.reduce((m, s) => (s.date > m ? s.date : m), '');
      return { count: list.length, total: D.r2(total), balance: D.r2(balance), overdue: overdue.length, last };
    },
  };

  D.supplier = {
    byId: (id) => D.data.suppliers.find((s) => s.id === id),
    stats(id) {
      const list = D.data.purchases.filter((p) => p.supplierId === id);
      return {
        count: list.length,
        total: D.r2(sum(list, D.purchase.total)),
        balance: D.r2(sum(list, D.purchase.balance)),
        last: list.reduce((m, p) => (p.date > m ? p.date : m), ''),
      };
    },
  };

  D.product = {
    byId: (id) => D.data.products.find((p) => p.id === id),
    margin: (p) => (p.price > 0 ? ((p.price - (p.cost || 0)) / p.price) * 100 : 0),
  };

  /* Cuentas por cobrar / pagar, ordenadas por vencimiento */
  D.q = {
    sales: () => D.data.sales.slice().sort((a, b) => (b.date + (b.at || 0)).toString().localeCompare(a.date + (a.at || 0)) || (b.seq || 0) - (a.seq || 0)),
    purchases: () => D.data.purchases.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.at || 0) - (a.at || 0)),
    receivables: () => D.data.sales.filter((s) => D.sale.balance(s) > 0).sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date)),
    payables: () => D.data.purchases.filter((p) => D.purchase.balance(p) > 0).sort((a, b) => (a.due || a.date).localeCompare(b.due || b.date)),
    overdueCount: () => D.data.sales.filter((s) => D.sale.status(s) === 'overdue').length,
  };

  /* Periodos para filtros y reportes */
  D.PERIODS = [
    ['hoy', 'Hoy'],
    ['7d', 'Últimos 7 días'],
    ['mes', 'Este mes'],
    ['mes-ant', 'Mes pasado'],
    ['90d', 'Últimos 90 días'],
    ['anio', 'Este año'],
    ['todo', 'Todo'],
  ];
  D.period = (key) => {
    const t = D.today();
    switch (key) {
      case 'hoy':
        return { from: t, to: t };
      case '7d':
        return { from: D.addDays(t, -6), to: t };
      case 'mes':
        return { from: D.monthStart(t), to: t };
      case 'mes-ant': {
        const prev = D.addMonths(t, -1);
        return { from: D.monthStart(prev), to: D.monthEnd(prev) };
      }
      case '90d':
        return { from: D.addDays(t, -89), to: t };
      case 'anio':
        return { from: t.slice(0, 4) + '-01-01', to: t };
      default:
        return { from: '0000-00-00', to: '9999-12-31' };
    }
  };
  D.inPeriod = (date, p) => date >= p.from && date <= p.to;

  /* Registrar un abono / pago sobre una venta o compra */
  D.addPayment = (kind, id, pay) => {
    const doc = kind === 'sale' ? D.sale.byId(id) : D.purchase.byId(id);
    if (!doc) return null;
    const p = { id: D.uid(), date: pay.date || D.today(), amount: D.r2(pay.amount), method: pay.method || 'Efectivo', note: pay.note || '', at: Date.now() };
    doc.payments = doc.payments || [];
    doc.payments.push(p);
    D.store.commit(kind === 'sale' ? 'sales' : 'purchases');
    return p;
  };
})();
