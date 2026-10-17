/* Dulza · datos de ejemplo (todos ficticios) para explorar la app sin escribir nada */
(function () {
  'use strict';
  const D = window.D;

  D.UNITS = ['u', 'kg', 'g', 'lt', 'ml', 'lata', 'paquete', 'caja', 'cubeta', 'rollo', 'docena'];
  D.EMOJIS = ['🧁', '🍰', '🎂', '🍮', '🍫', '🍩', '🍪', '🥧', '🍓', '🍨', '🍧', '🍡', '🍬', '🍭', '🥐', '🍯', '🍌', '🥥', '🍋', '🥛', '🍚', '🥞', '🧇', '🫐', '🍑', '🍒', '🍎', '☕', '🍞', '🎁'];

  D.demo = {
    load() {
      const S = D.data.settings;
      const f = S.decimals === 0 ? 1 : 0.001; // precios pensados en miles
      const m = (n) => D.r2(n * f);
      const t = D.today();
      const day = (ago) => D.addDays(t, -ago);
      let n = 0;
      const stamp = (date) => Date.parse(date + 'T12:00:00') + 60000 * ++n;

      D.data.products = [
        ['Brownie con nuez', 'p:18', 'Individuales', 4500, 1800],
        ['Cheesecake de fresa', 'p:08', 'Porciones', 7000, 2800],
        ['Torta de chocolate', 'p:10', 'Porciones', 6000, 2200],
        ['Flan de caramelo', 'p:17', 'Individuales', 4000, 1300],
        ['Tres leches', 'p:09', 'Porciones', 6500, 2400],
        ['Cupcakes x6', 'p:20', 'Cajas', 18000, 7000],
        ['Gelatina de mosaico', 'p:38', 'Individuales', 3000, 900],
        ['Arroz con leche', 'p:31', 'Individuales', 3500, 1000],
        ['Galletas x12', 'p:43', 'Cajas', 12000, 4300],
      ].map((p) => ({ id: D.uid(), name: p[0], emoji: p[1], category: p[2], price: m(p[3]), cost: m(p[4]), active: true }));

      D.data.customers = [
        ['Camila Rojas', '3005550101', 'Barrio Los Pinos'],
        ['Andrés Pardo', '3005550102', ''],
        ['Laura Gómez', '3005550103', 'Oficina centro, piso 3'],
        ['Familia Herrera', '3005550104', 'Casa 14, conjunto Alameda'],
        ['Cafetería El Rincón', '3005550105', 'Cra. 7 #12-30'],
        ['Sofía Mejía', '3005550106', ''],
        ['Tienda Doña Rosa', '3005550107', 'Plaza de mercado, local 8'],
        ['Mateo Salazar', '3005550108', ''],
      ].map((c) => ({ id: D.uid(), name: c[0], phone: c[1], address: c[2], notes: '', createdAt: Date.now() }));

      D.data.suppliers = [
        ['Distribuidora La Esquina', '3005550201', 'Harinas, azúcar y secos'],
        ['Lácteos del Valle', '3005550202', 'Leche, crema y mantequilla'],
        ['Frutas Don Pedro', '3005550203', 'Fruta fresca'],
        ['Empaques y Cajas', '3005550204', 'Cajas, cintas y moldes'],
      ].map((s) => ({ id: D.uid(), name: s[0], phone: s[1], notes: s[2], createdAt: Date.now() }));

      /* [hace N días, cliente, [[postre, cantidad]], plazo (días), fracción pagada] */
      const sales = [
        [0, 0, [[0, 2], [1, 1]], 0, 1],
        [1, 7, [[5, 1]], 0, 1],
        [1, 1, [[2, 2], [3, 2]], 15, 0],
        [2, 4, [[5, 2], [8, 1]], 30, 0.4],
        [3, 2, [[1, 3]], 15, 0],
        [4, 5, [[0, 4]], 0, 1],
        [6, 6, [[5, 3], [7, 4]], 30, 0],
        [7, 3, [[2, 2], [4, 2], [3, 2]], 15, 0.5],
        [9, 0, [[8, 2]], 0, 1],
        [10, 4, [[5, 2], [0, 6]], 30, 0],
        [12, 1, [[1, 2], [3, 1]], 15, 1],
        [14, 7, [[6, 6]], 0, 1],
        [16, 2, [[5, 1], [8, 1]], 15, 0],
        [19, 6, [[0, 5], [2, 3]], 15, 0],
        [22, 3, [[4, 3]], 30, 0.3],
        [25, 5, [[1, 2]], 0, 1],
        [28, 0, [[5, 2]], 15, 1],
        [31, 4, [[8, 3], [0, 3]], 30, 0],
        [35, 1, [[2, 4]], 15, 1],
        [40, 7, [[3, 5], [6, 4]], 0, 1],
        [44, 2, [[5, 2], [1, 2]], 30, 1],
        [52, 3, [[4, 2]], 15, 1],
        [58, 6, [[0, 6]], 30, 1],
        [66, 4, [[5, 4]], 30, 1],
        [72, 0, [[8, 2], [1, 1]], 0, 1],
      ];
      const methods = ['Efectivo', 'Transferencia', 'Transferencia', 'Efectivo'];
      D.data.sales = sales
        .slice()
        .reverse()
        .map((s, i) => {
          const date = day(s[0]);
          const sale = {
            id: D.uid(),
            seq: i + 1,
            number: D.sale.number(i + 1),
            date,
            customerId: D.data.customers[s[1]].id,
            items: s[2].map(([pi, q]) => {
              const p = D.data.products[pi];
              return { id: D.uid(), pid: p.id, name: p.name, emoji: p.emoji, qty: q, price: p.price, cost: p.cost };
            }),
            discount: 0,
            term: s[3],
            due: D.addDays(date, s[3]),
            payments: [],
            note: '',
            at: stamp(date),
          };
          const total = D.sale.total(sale);
          if (s[4] > 0) {
            const amount = s[4] === 1 ? total : D.r2(Math.round((total * s[4]) / (1000 * f)) * 1000 * f);
            const payDate = s[3] === 0 ? date : s[4] === 1 ? (D.addDays(date, Math.max(1, s[3] - 2)) > t ? t : D.addDays(date, Math.max(1, s[3] - 2))) : D.addDays(date, 2) > t ? t : D.addDays(date, 2);
            sale.payments.push({ id: D.uid(), date: payDate, amount, method: methods[i % methods.length], note: '', at: stamp(payDate) });
          }
          return sale;
        });

      /* [hace N días, proveedor, [[insumo, cantidad, unidad, costo]], plazo, fracción pagada] */
      const buys = [
        [1, 0, [['Harina de trigo', 10, 'kg', 3200], ['Azúcar', 8, 'kg', 3800]], 0, 1],
        [3, 1, [['Leche condensada', 6, 'lata', 6800], ['Crema de leche', 4, 'lt', 9500]], 15, 0],
        [6, 2, [['Fresas', 5, 'kg', 9000]], 0, 1],
        [9, 3, [['Cajas para postre', 50, 'u', 900], ['Cinta decorativa', 2, 'rollo', 4500]], 0, 1],
        [13, 0, [['Chocolate amargo', 4, 'kg', 21000], ['Cocoa', 1, 'kg', 18000]], 30, 0.5],
        [18, 1, [['Mantequilla', 6, 'kg', 17500], ['Huevos', 6, 'cubeta', 14500]], 15, 0],
        [24, 2, [['Limones', 3, 'kg', 4200], ['Manzanas', 4, 'kg', 5500]], 0, 1],
        [33, 0, [['Harina de trigo', 15, 'kg', 3100], ['Azúcar', 10, 'kg', 3700]], 30, 1],
        [45, 1, [['Leche entera', 20, 'lt', 3600]], 15, 1],
        [60, 3, [['Moldes', 20, 'u', 2500]], 0, 1],
      ];
      D.data.purchases = buys.map((b) => {
        const date = day(b[0]);
        const p = {
          id: D.uid(),
          date,
          supplierId: D.data.suppliers[b[1]].id,
          items: b[2].map((i) => ({ id: D.uid(), name: i[0], qty: i[1], unit: i[2], cost: m(i[3]) })),
          term: b[3],
          due: D.addDays(date, b[3]),
          payments: [],
          note: '',
          at: stamp(date),
        };
        const total = D.purchase.total(p);
        if (b[4] > 0) {
          const payDate = b[3] === 0 ? date : D.addDays(date, 5) > t ? t : D.addDays(date, 5);
          p.payments.push({ id: D.uid(), date: payDate, amount: b[4] === 1 ? total : D.r2(Math.round((total * b[4]) / (1000 * f)) * 1000 * f), method: 'Transferencia', note: '', at: stamp(payDate) });
        }
        return p;
      });

      S.nextInvoice = D.data.sales.length + 1;
      D.store.commit();
    },

    clear() {
      D.data.customers = [];
      D.data.products = [];
      D.data.sales = [];
      D.data.suppliers = [];
      D.data.purchases = [];
      D.data.settings.nextInvoice = 1;
      D.store.commit();
    },
  };
})();
