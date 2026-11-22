/* Dulza · facturas (imagen PNG y PDF dibujados en canvas), mensajes y envío por WhatsApp */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;

  /* ==========================================================================
     Mensajes de WhatsApp
     ========================================================================== */
  const wa = (D.wa = {});

  wa.lines = (sale) =>
    sale.items.map((i) => `• ${i.qty}× ${i.name} — ${D.money(i.qty * i.price)}`).join('\n');

  wa.dueText = (sale) => {
    const bal = D.sale.balance(sale);
    if (bal <= 0 || !sale.due) return '';
    const n = D.diffDays(sale.due, D.today());
    if (n < 0) return `Venció el ${D.fmtDate(sale.due)} (${D.relDay(sale.due)}).`;
    if (n === 0) return 'Vence hoy.';
    return `Vence el ${D.fmtDate(sale.due)}.`;
  };

  /* Línea de fecha límite con emoji: «📅 Vence el 29 oct (en 12 días)» o «⚠️ Venció el … (hace 3 días)» */
  wa.dueLine = (sale) => {
    if (D.sale.balance(sale) <= 0 || !sale.due) return '';
    const n = D.diffDays(sale.due, D.today());
    if (n < 0) return `⚠️ Venció el ${D.fmtDate(sale.due)} (${D.relDay(sale.due)})`;
    if (n === 0) return '📅 Vence hoy';
    return `📅 Vence el ${D.fmtDate(sale.due)} (${D.relDay(sale.due)})`;
  };

  /* Totales en pocas líneas: total, lo abonado y el saldo (o «Pagada») */
  wa.summary = (sale) => {
    const total = D.sale.total(sale), paid = D.sale.paid(sale), bal = D.sale.balance(sale);
    const L = [];
    if (sale.discount > 0) L.push(`Subtotal: ${D.money(D.sale.subtotal(sale))}`, `Descuento: −${D.money(sale.discount)}`);
    L.push(`*Total: ${D.money(total)}*`);
    if (paid > 0 && bal > 0) L.push(`Abonado: ${D.money(paid)}`);
    L.push(bal > 0 ? `*Saldo pendiente: ${D.money(bal)}*` : '✅ *Pagada, ¡gracias!*');
    return L.join('\n');
  };

  wa.invoiceText = (sale) => {
    const S = D.data.settings;
    const bal = D.sale.balance(sale);
    return D.fill(S.waInvoice || D.WA_INVOICE, {
      cliente: D.sale.customerName(sale),
      numero: sale.number,
      negocio: S.name,
      fecha: fdate(sale.date),
      detalle: wa.lines(sale),
      resumen: wa.summary(sale),
      total: D.money(D.sale.total(sale)),
      saldo: D.money(bal),
      plazo: sale.term ? `${sale.term} días` : 'Contado',
      vence: wa.dueLine(sale),
      condiciones: S.terms || '',
      estado: bal <= 0 ? '✅ Pagada, ¡gracias!' : `Saldo pendiente: *${D.money(bal)}*${sale.due ? ` · ${wa.dueText(sale)}` : ''}`,
    })
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  /* Recordatorio de cobro de una o varias ventas del mismo cliente */
  wa.reminderText = (sales, customerName) => {
    const S = D.data.settings;
    const open = sales.filter((s) => D.sale.balance(s) > 0);
    const total = open.reduce((a, s) => a + D.sale.balance(s), 0);
    const one = open.length === 1;
    // una viñeta por factura; con varias, cada una dice cuándo vence (con una sola, la fecha va en su propia línea)
    const detalle = open
      .map((s) => `• Factura *${s.number}* del ${D.fmtDate(s.date)} — saldo *${D.money(D.sale.balance(s))}*${!one && s.due ? ` (${s.due < D.today() ? 'venció' : 'vence'} ${D.relDay(s.due)})` : ''}`)
      .join('\n');
    return D.fill(S.waReminder || D.WA_REMINDER, {
      cliente: customerName,
      negocio: S.name,
      saldo: D.money(D.r2(total)),
      detalle,
      vence: one ? wa.dueLine(open[0]) : '',
    })
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  wa.paymentText = (sale, amount) => {
    const S = D.data.settings;
    const bal = D.sale.balance(sale);
    return `Hola ${D.sale.customerName(sale)} 🧁\nRecibí tu pago de *${D.money(amount)}* para la factura *${sale.number}*. ¡Gracias! 💖\n${bal > 0 ? `Saldo pendiente: *${D.money(bal)}*${sale.due ? ` · ${wa.dueText(sale)}` : ''}` : '✅ Tu factura quedó *pagada*.'}\n— ${S.name}`;
  };

  /* Primer nombre para los botones: una palabra, de hasta 14 letras (un correo o un nombre larguísimo no revienta el botón) */
  const firstName = (n) => {
    const w = String(n || '').trim().split(/\s+/)[0] || '';
    return w.length > 14 ? w.slice(0, 13) + '…' : w;
  };

  /* Abre el chat con el texto listo. Devuelve false si el navegador bloqueó la ventana (pasa en iPhone después de preparar la
     imagen): entonces un toque más en «Abrir WhatsApp» la abre. */
  wa.send = (phone, text, o = {}) => {
    if (!phone && !o.quiet) D.toast('Este cliente no tiene WhatsApp guardado: elige el contacto en WhatsApp', { tone: 'info', icon: 'info' });
    const ok = D.openWa(phone, text);
    if (!ok) D.toast(`El navegador frenó la ventana de WhatsApp.${o.note || ''}`, { tone: 'info', icon: 'whatsapp', action: { label: 'Abrir WhatsApp', fn: () => D.openWa(phone, text) } });
    return ok;
  };

  /* Copia la imagen de la factura al portapapeles. WhatsApp (enlace wa.me) solo admite texto, así que la imagen se pega en el chat.
     El PNG se entrega como promesa para que Safari lo acepte dentro del toque; debe llamarse sin esperar nada antes. */
  wa.copyImage = async (sale) => {
    if (!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': D.invoice.blob(sale, 'png') })]);
      return true;
    } catch (e) {
      return false;
    }
  };

  /* Envío por WhatsApp con texto ordenado y la imagen de la factura ya copiada para pegarla en el chat */
  wa.manualDoc = async (sale, phone, text) => {
    // Celular: el menú de compartir del teléfono adjunta la imagen de verdad (con el texto como pie): se elige WhatsApp y el cliente.
    if (matchMedia('(pointer: coarse)').matches && navigator.share && navigator.canShare) {
      try {
        const blob = await D.invoice.blob(sale, 'png');
        const file = new File([blob], D.invoice.fileName(sale, 'png'), { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text, title: `Factura ${sale.number}` });
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return; // la persona cerró el menú
      }
    }
    // Computador: se copia la imagen primero (con la página en primer plano, si no el navegador no deja) y luego se abre el chat
    const copied = await wa.copyImage(sale);
    if (!D.openWa(phone, text)) {
      D.toast(`El navegador frenó la ventana de WhatsApp.${copied ? ' La imagen ya está copiada: pégala en el chat.' : ''}`, { tone: 'info', icon: 'whatsapp', action: { label: 'Abrir WhatsApp', fn: () => D.openWa(phone, text) } });
      return;
    }
    const sinChat = phone ? '' : ' Elige también el contacto.';
    D.toast(copied ? `Imagen de la factura copiada: en WhatsApp pega con Ctrl+V (o mantén pulsado y «Pegar»).${sinChat}` : `No pude copiar la imagen: usa «Compartir imagen» para adjuntarla.${sinChat}`, { tone: copied ? 'ok' : 'info', icon: 'image' });
  };

  /* ---------- Envío automático (API oficial de WhatsApp, a través de la función de Firebase) ---------- */
  wa.autoOn = () => !!(D.data.settings.waAuto && D.cloud && D.cloud.linked());
  const one = (s) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() || '-';
  const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

  wa.paramsFactura = (sale) => {
    const bal = D.sale.balance(sale);
    return [
      D.sale.customerName(sale),
      sale.number,
      D.data.settings.name,
      sale.items.map((i) => `${i.qty}× ${i.name}`).join(', '),
      D.money(D.sale.total(sale)),
      bal > 0 ? D.money(bal) : `${D.money(0)} (pagada)`,
      bal <= 0 ? '✅ Factura pagada' : wa.dueLine(sale) || 'Pago de contado',
    ].map(one);
  };
  wa.paramsRecordatorio = (sales, name) => {
    const open = sales.filter((s) => D.sale.balance(s) > 0);
    const total = open.reduce((a, s) => a + D.sale.balance(s), 0);
    return [
      name,
      D.data.settings.name,
      D.money(D.r2(total)),
      open.map((s) => `${s.number}: ${D.money(D.sale.balance(s))}`).join(' · '),
      open.length === 1 ? wa.dueLine(open[0]) || 'Avísanos cuando hagas el pago.' : 'Avísanos cuando hagas el pago.',
    ].map(one);
  };

  /* Devuelve true si se envió; si falla, avisa con el motivo y ofrece mandarlo a mano (`manual`) */
  wa.autoSend = async (kind, phone, params, sale, who, manual) => {
    const to = D.waNumber(phone);
    if (!to) {
      D.toast(`${who || 'Este cliente'} no tiene WhatsApp guardado: agrégalo en su ficha.`, { tone: 'info', icon: 'info' });
      return false;
    }
    D.toast('Enviando por WhatsApp…', { tone: 'info', icon: 'whatsapp' });
    try {
      const data = { kind, to, params };
      if (kind === 'factura') data.image = await b64(await D.invoice.blob(sale, 'jpg'));
      await D.cloud.call('waSend', data);
    } catch (e) {
      D.toast(e.userMessage || e.message || 'No se pudo enviar.', { tone: 'bad', icon: 'whatsapp', action: manual ? { label: 'Enviar a mano', fn: manual } : undefined });
      return false;
    }
    if (kind === 'factura' && sale) {
      sale.waSentAt = Date.now();
      D.store.commit('sales');
    }
    D.haptic && D.haptic(14);
    D.toast(`${kind === 'factura' ? 'Factura enviada' : 'Recordatorio enviado'} a ${who || 'tu cliente'} por WhatsApp`, { icon: 'checkCircle' });
    return true;
  };

  /* kind: 'factura' | 'recordatorio' | 'pago'. Con el envío automático activo, factura y recordatorio salen solos. */
  wa.sendDoc = async (sale, phone, text, kind = 'factura') => {
    const manual = () => wa.manualDoc(sale, phone, text);
    if (wa.autoOn() && phone && kind !== 'pago') {
      const name = D.sale.customerName(sale);
      const params = kind === 'factura' ? wa.paramsFactura(sale) : wa.paramsRecordatorio([sale], name);
      if (await wa.autoSend(kind, phone, params, sale, name, manual)) return;
      return;
    }
    return manual();
  };
  wa.sendReminder = (sales, customer) => {
    const open = sales.filter((s) => D.sale.balance(s) > 0);
    const text = wa.reminderText(open, customer.name);
    if (open.length === 1) return wa.sendDoc(open[0], customer.phone, text, 'recordatorio');
    const manual = () => wa.send(customer.phone, text);
    if (wa.autoOn() && customer.phone) return wa.autoSend('recordatorio', customer.phone, wa.paramsRecordatorio(open, customer.name), null, customer.name, manual);
    return manual();
  };
  /* Al guardar una venta: sale sola si el envío automático está activo y el cliente tiene WhatsApp */
  wa.autoInvoice = (sale) => {
    if (!wa.autoOn()) return false;
    const c = D.sale.customer(sale);
    if (!c || !c.phone) return false;
    wa.sendDoc(sale, c.phone, wa.invoiceText(sale), 'factura');
    return true;
  };

  /* ==========================================================================
     Dibujo de la factura
     ========================================================================== */
  const FONT = 'Nunito, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const DISP = '"Titan One", "Arial Rounded MT Bold", ' + FONT;
  const fontD = (px) => `400 ${px}px ${DISP}`;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrap(ctx, text, maxW, maxLines = 99) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
    }
    return lines;
  }
  const font = (w, px) => `${w} ${px}px ${FONT}`;

  /* Factura de marca (v1.33): tarjeta blanca de esquinas redondeadas sobre un fondo suave; encabezado de color con el
     logo y el número, borde de glaseado que gotea; cajas de cliente y condiciones; tabla de postres con su dibujo;
     totales con el saldo resaltado; sello de estado; y un cierre con Dulce y el agradecimiento. En festividad toma
     los colores, el logo, Dulce y los adornos de la fecha.
     paint() dibuja el contenido (con dry=true solo mide la altura); render() pone el fondo y la tarjeta. */
  const W = 820, PAD = 26, TOP = 26, L = PAD + 40, R = W - PAD - 40, CW = R - L, MINH = 900;
  const STATUS_LABEL = { paid: 'Pagada', pending: 'Por cobrar', partial: 'Abonada', overdue: 'Vencida' };
  const STAMP = { paid: 'PAGADA', pending: 'PENDIENTE', partial: 'ABONADA', overdue: 'VENCIDA' };
  const TONE = { paid: '#178a55', pending: '#2f6fdb', partial: '#a15c00', overdue: '#c8283d' };
  // la mascota cambia de expresión según el estado de la factura
  const MOOD = D.SALE_MOOD;
  const THANKS = { paid: '¡Gracias por tu pago!', pending: '¡Gracias por tu compra!', partial: '¡Gracias por tu abono!', overdue: '¡Gracias por tu compra!' };
  const SUBLINE = { paid: 'Tu factura quedó pagada.', pending: '', partial: 'Te esperamos con el saldo restante.', overdue: 'Tu saldo está vencido: escríbenos y lo resolvemos.' };
  const fdate = (iso) => {
    const d = D.parseDate(iso);
    return `${d.getDate()} ${D.MONTHS_L[d.getMonth()]} ${d.getFullYear()}`;
  };
  const N = (w, px) => `${w} ${px}px ${FONT}`;
  // alto del encabezado según lo que lleve (se usa al medir y al dibujar)
  const headerLines = (S) => [S.tagline, S.owner, S.phone, S.address].filter(Boolean).slice(0, 4);

  function paint(ctx, sale, A, dry) {
    const S = D.data.settings;
    const C = D.color;
    const { pri, sec, inkB, soft, soft2 } = A.pal;
    const ink = '#2a1a23', ink2 = '#6b5762', ink3 = '#8f7f88', line = '#efe3ea';
    const total = D.sale.total(sale), paid = D.sale.paid(sale), bal = D.sale.balance(sale);
    const st = D.sale.status(sale);
    const tone = TONE[st];
    const customer = D.sale.customer(sale);
    const text = (t, x, yy, f, c, align = 'left', ls = 0) => {
      ctx.font = f;
      if (dry) return;
      ctx.fillStyle = c;
      ctx.textAlign = align;
      try { ctx.letterSpacing = ls ? ls + 'px' : '0px'; } catch (e) {}
      ctx.fillText(t, x, yy);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    };
    const box = (x, yy, w, h, r, fill, stroke) => {
      if (dry) return;
      rr(ctx, x, yy, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };
    const pill = (t, x, yy, f, fill, color, align = 'left') => {
      ctx.font = f;
      const w = ctx.measureText(t).width + 30;
      const x0 = align === 'right' ? x - w : x;
      box(x0, yy, w, 34, 17, fill);
      text(t, x0 + w / 2, yy + 23, f, color, 'center', 1);
      return w;
    };
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '0px'; } catch (e) {}

    /* ---- Encabezado de color ---- */
    const hl = headerLines(S);
    const logoH = A.brandLogo ? 104 : 84;
    const leftH = logoH + 14 + hl.length * 23;
    const hh = Math.max(176, leftH) + 56;
    const y0 = TOP;
    if (!dry) {
      const g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
      g.addColorStop(0, A.pal.hdrA);
      g.addColorStop(1, A.pal.hdrB);
      ctx.fillStyle = g;
      ctx.fillRect(PAD, y0, W - 2 * PAD, hh);
      // borde de glaseado que gotea
      let k = 0;
      for (let x = PAD + 10; x < W - PAD + 20; x += 46, k++) {
        const r = 15 + ((k * 7) % 3) * 4, d = 10 + ((k * 5) % 4) * 7;
        ctx.beginPath();
        ctx.arc(x, y0 + hh, r, 0, Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x - 6, y0 + hh, 12, d + 6, 6) : ctx.rect(x - 6, y0 + hh, 12, d + 6);
        if (k % 3 === 1) ctx.fill();
      }
      // puntitos de confeti y, en festividad, sus adornos
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 26; i++) {
        const x = PAD + 20 + ((i * 97) % (W - 2 * PAD - 40)), yy = y0 + 14 + ((i * 53) % (hh - 30));
        ctx.beginPath();
        ctx.arc(x, yy, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      A.deco.slice(0, 3).forEach((im, i) => {
        const s = Math.min(46 / im.naturalWidth, 46 / im.naturalHeight);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.translate(L + 300 + i * 66, y0 + 44 + (i % 2) * 26); // entre el logo y el número, sin pisar textos
        ctx.rotate((i % 2 ? 1 : -1) * 0.22);
        ctx.drawImage(im, (-im.naturalWidth * s) / 2, (-im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
        ctx.restore();
      });
    }
    // logo y datos del negocio
    let ly = y0 + 28;
    if (A.brandLogo) {
      const k2 = Math.min(250 / A.brandLogo.naturalWidth, logoH / A.brandLogo.naturalHeight);
      if (!dry) ctx.drawImage(A.brandLogo, L - 6, ly, A.brandLogo.naturalWidth * k2, A.brandLogo.naturalHeight * k2);
    } else {
      if (!dry) {
        ctx.save();
        rr(ctx, L, ly, 84, 84, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(A.logo, L, ly, 84, 84);
        ctx.restore();
      }
      ctx.font = fontD(32);
      text(S.name, L + 100, ly + 54, fontD(32), '#ffffff');
    }
    ly += logoH + 14;
    hl.forEach((l, i) => {
      ctx.font = N(i === 0 ? 800 : 600, 16);
      const s = wrap(ctx, l, CW * 0.52, 1)[0] || '';
      text(s, L, ly + 16, N(i === 0 ? 800 : 600, 16), 'rgba(255,255,255,0.94)');
      ly += 23;
    });
    // número, fecha y estado
    let ry = y0 + 46;
    text('FACTURA DE VENTA', R, ry, N(900, 14), 'rgba(255,255,255,0.88)', 'right', 3);
    ry += 54;
    text(sale.number, R, ry, fontD(46), '#ffffff', 'right');
    ry += 32;
    const hora = sale.at ? new Date(sale.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    text(fdate(sale.date) + (hora ? '  ·  ' + hora : ''), R, ry, N(700, 17), 'rgba(255,255,255,0.94)', 'right');
    ry += 16;
    pill(STATUS_LABEL[st].toUpperCase(), R, ry, N(900, 14), '#ffffff', tone, 'right');

    let y = y0 + hh + 44;

    /* ---- Cliente y condiciones ---- */
    const bw = (CW - 20) / 2;
    ctx.font = N(800, 21);
    const nm = wrap(ctx, D.sale.customerName(sale), bw - 44, 2);
    const cRows = [['Plazo', sale.term === 0 ? 'Contado' : `${sale.term} días`, ink]];
    if (sale.term > 0) cRows.push(['Vence', fdate(sale.due), bal > 0 && sale.due < D.today() ? '#c8283d' : ink]);
    cRows.push(['Estado', STATUS_LABEL[st], tone]);
    const h1 = 46 + nm.length * 27 + (customer && customer.phone ? 26 : 0);
    const h2 = 46 + cRows.length * 28;
    const bh = Math.max(h1, h2) + 16;
    box(L, y, bw, bh, 20, soft);
    box(L + bw + 20, y, bw, bh, 20, soft);
    text('CLIENTE', L + 22, y + 32, N(900, 13), inkB, 'left', 2);
    nm.forEach((l, i) => text(l, L + 22, y + 62 + i * 27, N(800, 21), ink));
    if (customer && customer.phone) text(customer.phone, L + 22, y + 62 + nm.length * 27, N(600, 16), ink2);
    const x2 = L + bw + 42, xr2 = L + 2 * bw + 20 - 22;
    text('CONDICIONES', x2, y + 32, N(900, 13), inkB, 'left', 2);
    cRows.forEach(([k, v, c], i) => {
      text(k, x2, y + 62 + i * 28, N(600, 16), ink2);
      text(v, xr2, y + 62 + i * 28, N(800, 17), c, 'right');
    });
    y += bh + 30;

    /* ---- Postres ---- */
    const cQ = R - 300, cP = R - 150, cT = R - 18;
    box(L, y, CW, 44, 14, soft2);
    text('POSTRE', L + 18, y + 28, N(900, 13), inkB, 'left', 2);
    text('CANT.', cQ, y + 28, N(900, 13), inkB, 'center', 2);
    text('PRECIO', cP, y + 28, N(900, 13), inkB, 'right', 2);
    text('TOTAL', cT, y + 28, N(900, 13), inkB, 'right', 2);
    y += 52;
    const nx = L + 78, nw = cQ - 50 - nx;
    sale.items.forEach((it, i) => {
      ctx.font = N(800, 18);
      const nl = wrap(ctx, it.name, nw, 2);
      const rowH = Math.max(66, 26 + nl.length * 24);
      if (i % 2 === 1) box(L, y, CW, rowH, 14, '#fcf7f9');
      const mid = y + rowH / 2;
      const g = A.glyphs && A.glyphs[it.emoji || D.DEFAULT_GLYPH];
      if (g && !dry) {
        const k = Math.min(46 / g.naturalWidth, 46 / g.naturalHeight);
        ctx.drawImage(g, L + 40 - (g.naturalWidth * k) / 2, mid - (g.naturalHeight * k) / 2, g.naturalWidth * k, g.naturalHeight * k);
      } else if (!g && it.emoji && !D.isPostre(it.emoji)) text(it.emoji, L + 40, mid + 11, font(400, 30), ink, 'center');
      const ty = mid - ((nl.length - 1) * 24) / 2 + 7;
      nl.forEach((l, j) => text(l, nx, ty + j * 24, N(800, 18), ink));
      text(String(it.qty), cQ, mid + 7, N(800, 18), ink, 'center');
      text(D.money(it.price), cP, mid + 7, N(600, 17), ink2, 'right');
      text(D.money(it.qty * it.price), cT, mid + 7, N(800, 18), ink, 'right');
      y += rowH;
    });
    if (!dry) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(L, y + 8);
      ctx.lineTo(R, y + 8);
      ctx.stroke();
    }
    y += 30;

    /* ---- Totales (derecha) y sello / pagos (izquierda) ---- */
    const tw = 370, tx = R - tw;
    const tRows = [['Subtotal', D.money(D.sale.subtotal(sale)), ink]];
    if (sale.discount > 0) tRows.push(['Descuento', '− ' + D.money(sale.discount), '#c8283d']);
    const th = 28 + tRows.length * 30 + 66 + (paid > 0 ? 30 : 0) + (bal > 0 ? 56 : 0) + 12;
    box(tx, y, tw, th, 22, soft);
    let ty = y + 36;
    tRows.forEach(([k, v, c]) => {
      text(k, tx + 24, ty, N(600, 17), ink2);
      text(v, tx + tw - 24, ty, N(800, 18), c, 'right');
      ty += 30;
    });
    if (!dry) {
      ctx.strokeStyle = C.mix(pri, '#ffffff', 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx + 24, ty - 10);
      ctx.lineTo(tx + tw - 24, ty - 10);
      ctx.stroke();
    }
    text('TOTAL', tx + 24, ty + 34, N(900, 20), ink, 'left', 2);
    text(D.money(total), tx + tw - 24, ty + 38, fontD(38), inkB, 'right');
    ty += 66;
    if (paid > 0) {
      text('Abonado', tx + 24, ty, N(600, 17), ink2);
      text(D.money(paid), tx + tw - 24, ty, N(800, 18), '#178a55', 'right');
      ty += 30;
    }
    if (bal > 0) {
      box(tx + 14, ty - 8, tw - 28, 46, 23, tone);
      text('SALDO PENDIENTE', tx + 34, ty + 22, N(900, 15), '#ffffff', 'left', 1);
      text(D.money(bal), tx + tw - 34, ty + 23, N(900, 21), '#ffffff', 'right');
    }
    // izquierda: pagos recibidos o el sello del estado
    const lw = CW - tw - 30;
    let ly2 = y + 8;
    if (sale.payments && sale.payments.length) {
      text('PAGOS RECIBIDOS', L, ly2 + 14, N(900, 13), inkB, 'left', 2);
      ly2 += 40;
      sale.payments
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-5)
        .forEach((p) => {
          ctx.font = N(600, 15);
          text(`${D.fmtDate(p.date)} · ${wrap(ctx, p.method || '', lw - 150, 1)[0] || ''}`, L, ly2, N(600, 15), ink2);
          text(D.money(p.amount), L + lw, ly2, N(800, 16), ink, 'right');
          ly2 += 27;
        });
    } else if (!dry) {
      ctx.save();
      ctx.translate(L + lw / 2, y + th / 2);
      ctx.rotate(-0.12);
      ctx.font = fontD(32);
      const sw = ctx.measureText(STAMP[st]).width;
      ctx.strokeStyle = tone;
      ctx.fillStyle = tone;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 4.5;
      rr(ctx, -sw / 2 - 26, -34, sw + 52, 68, 16);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      rr(ctx, -sw / 2 - 19, -27, sw + 38, 54, 11);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(STAMP[st], 0, 12);
      ctx.restore();
    }
    y += Math.max(th, ly2 - y) + 30;

    /* ---- Nota ---- */
    if (sale.note) {
      ctx.font = N(600, 16);
      const nl = wrap(ctx, sale.note, CW - 44, 4);
      const nh = 44 + nl.length * 23;
      box(L, y, CW, nh, 18, '#ffffff', line);
      text('NOTA', L + 22, y + 30, N(900, 13), inkB, 'left', 2);
      nl.forEach((l, i) => text(l, L + 22, y + 56 + i * 23, N(600, 16), ink));
      y += nh + 24;
    }

    /* ---- Cierre con Dulce ---- */
    const mx = L + 232; // el texto empieza después de Dulce
    const fw = R - mx - 22;
    ctx.font = N(700, 15);
    const sub = SUBLINE[st] ? wrap(ctx, SUBLINE[st], fw, 2) : [];
    ctx.font = N(500, 14);
    const terms = wrap(ctx, S.terms || '', fw, 4);
    const fh = Math.max(196, 40 + 36 + (A.season ? 32 : 0) + sub.length * 21 + (terms.length ? 12 + terms.length * 20 : 0) + 30);
    box(L, y, CW, fh, 26, soft2);
    if (!dry && A.mascot) {
      // Dulce asoma desde abajo, recortada por el borde de la caja
      ctx.save();
      rr(ctx, L, y, CW, fh, 26);
      ctx.clip();
      const mh = Math.min(fh + 20, 214);
      const mw = mh * ((A.mascot.naturalWidth || 1) / (A.mascot.naturalHeight || 1));
      ctx.drawImage(A.mascot, L + 112 - mw / 2, y + fh - mh + 8, mw, mh);
      ctx.restore();
    }
    let fy = y + 52;
    text(THANKS[st], mx, fy, fontD(30), inkB);
    if (A.season) {
      fy += 34;
      text(A.season.saludo, mx, fy, fontD(22), C.ensure(A.season.brand, '#ffffff', 4.5, '#000000'));
    }
    sub.forEach((l) => {
      fy += 25;
      text(l, mx, fy, N(700, 15), tone);
    });
    if (terms.length) fy += 10;
    terms.forEach((l) => {
      fy += 20;
      text(l, mx, fy, N(500, 14), ink2);
    });
    y += fh + 26;
    text(`Comprobante de venta ${sale.number} · no es factura electrónica`, W / 2, y, N(600, 12.5), ink3, 'center');
    return y + 14;
  }

  async function assets(sale) {
    const S = D.data.settings;
    const K = D.theme.colors();
    const C = D.color;
    try {
      await Promise.all([document.fonts.load('40px "Titan One"'), document.fonts.load('600 20px Nunito'), document.fonts.load('700 20px Nunito'), document.fonts.load('800 20px Nunito'), document.fonts.load('900 20px Nunito')]);
    } catch (e) {}
    const ownLogo = !S.logo && /^dulza$/i.test(String(S.name || '').trim());
    const tokens = Array.from(new Set(((sale && sale.items) || []).map((i) => i.emoji || D.DEFAULT_GLYPH).filter(D.isPostre)));
    // En temporada, Dulce va con el vestuario de la fecha y los adornos de la fecha decoran el encabezado
    const season = D.season ? D.season.current() : null;
    const mood = season ? D.gpt.bust : D.gpt.moods[MOOD[sale ? D.sale.status(sale) : 'pending']] || D.gpt.bust;
    const adornos = D.season ? D.season.adornos(season) : [];
    const hd = (t) => D.art.srcToImage(`${D.gpt.base}v3/postres-hd/postre-${t.slice(2)}.png`).catch(() => D.art.srcToImage(D.postreUrl(t)));
    const [logo, mascot, brandLogo, ...rest] = await Promise.all([
      D.art.srcToImage(S.logo || D.gpt.url(D.gpt.icon)),
      D.art.srcToImage(S.mascot || D.gpt.url(mood)),
      ownLogo ? D.art.srcToImage(D.gpt.url(D.gpt.logoName)).catch(() => null) : null,
      ...tokens.map((t) => hd(t).catch(() => null)),
      ...adornos.map((u) => D.art.srcToImage(u).catch(() => null)),
    ]);
    const glyphs = rest.slice(0, tokens.length);
    const deco = rest.slice(tokens.length).filter(Boolean);
    // paleta: la de la marca, o la de la festividad
    const pri = season ? season.brand : K.brand;
    const sec = season ? season.accent : K.accent;
    const pal = {
      pri,
      sec,
      hdrA: C.ensure(C.mix(pri, '#000000', 0.08), '#ffffff', 3.2, '#000000'),
      hdrB: C.ensure(C.mix(pri, sec, 0.45), '#ffffff', 3.2, '#000000'),
      inkB: C.ensure(pri, '#ffffff', 4.5, '#000000'),
      soft: C.mix(pri, '#ffffff', 0.93),
      soft2: C.mix(pri, '#ffffff', 0.86),
      page: C.mix(pri, '#ffffff', 0.82),
    };
    return { colors: K, pal, logo, mascot, brandLogo, season, deco, glyphs: Object.fromEntries(tokens.map((t, i) => [t, glyphs[i]])) };
  }

  D.invoice = {
    async render(sale, scale = 2) {
      const A = await assets(sale);
      const probe = document.createElement('canvas').getContext('2d');
      const H = Math.max(Math.ceil(paint(probe, sale, A, true)) + PAD, MINH);
      const c = document.createElement('canvas');
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext('2d');
      ctx.scale(scale, scale);
      ctx.imageSmoothingQuality = 'high';
      // fondo suave del color de la marca (o de la fecha) con confeti, y la tarjeta encima con sombra
      ctx.fillStyle = A.pal.page;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.35;
      const conf = ['#ffffff', A.pal.pri, A.pal.sec];
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = conf[i % 3];
        const x = (i * 131) % W, yy = (i * 89) % H;
        ctx.beginPath();
        ctx.arc(x, yy, 2.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.shadowColor = 'rgba(70, 25, 48, 0.2)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 8;
      rr(ctx, PAD, TOP, W - 2 * PAD, H - TOP - PAD, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
      ctx.save();
      rr(ctx, PAD, TOP, W - 2 * PAD, H - TOP - PAD, 30);
      ctx.clip();
      paint(ctx, sale, A, false);
      ctx.restore();
      return c;
    },

    async blob(sale, type = 'png') {
      const c = await D.invoice.render(sale, type === 'jpg' ? 1.5 : 2);
      if (type === 'png') return new Promise((r) => c.toBlob(r, 'image/png'));
      if (type === 'jpg') return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); // más liviano para enviar por la nube
      const jpg = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
      const bytes = new Uint8Array(await jpg.arrayBuffer());
      return new Blob([pdfFromJpeg(bytes, c.width, c.height)], { type: 'application/pdf' });
    },

    fileName: (sale, type) => `Factura-${sale.number}.${type === 'pdf' ? 'pdf' : 'png'}`,

    /* Abre el menú de compartir del sistema (WhatsApp, Mensajes…) o descarga el archivo */
    async share(sale, type) {
      const blob = await D.invoice.blob(sale, type);
      const name = D.invoice.fileName(sale, type);
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name, text: wa.invoiceText(sale) });
          return 'shared';
        } catch (e) {
          if (e && e.name === 'AbortError') return 'cancel';
        }
      }
      D.download(blob, name);
      return 'downloaded';
    },

    /* Hoja con vista previa y acciones */
    open(id) {
      const sale = D.sale.byId(id);
      if (!sale) return;
      const customer = D.sale.customer(sale);
      let url = '';
      const sh = D.sheet.open({
        title: `Factura ${sale.number}`,
        wide: true,
        size: 'large',
        body: `<div class="invoice-preview" id="inv-prev"><div class="skel-ticket" role="status" aria-label="Preparando factura"><i class="skel skel--logo"></i><i class="skel skel--l1"></i><i class="skel skel--l2"></i><i class="skel skel--row"></i><i class="skel skel--row"></i><i class="skel skel--row"></i><i class="skel skel--tot"></i><i class="skel skel--bar"></i></div></div>
          <div class="list list--spaced" style="margin-top:14px">
            <button class="row row--tap row--noavatar" data-inv="share-pdf"><span class="row__icon">${D.icon('file')}</span><span class="row__main"><span class="row__title">Compartir PDF</span><span class="row__sub">Elige WhatsApp u otra app</span></span><span class="row__chev">${D.icon('chevR')}</span></button>
            <button class="row row--tap row--noavatar" data-inv="share-png"><span class="row__icon">${D.icon('image')}</span><span class="row__main"><span class="row__title">Compartir imagen</span><span class="row__sub">Se ve directo en el chat</span></span><span class="row__chev">${D.icon('chevR')}</span></button>
            <button class="row row--tap row--noavatar" data-inv="dl-pdf"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Descargar PDF</span></span></button>
            <button class="row row--tap row--noavatar" data-inv="dl-png"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Descargar imagen</span></span></button>
          </div>`,
        footer: `<button class="btn btn--wa" data-inv="wa">${D.icon('whatsapp')}Enviar por WhatsApp${customer ? ' a ' + esc(firstName(customer.name)) : ''}</button>
                 <p class="muted center" style="font-size:.8rem">En el celular abre el menú de compartir con la factura adjunta y el detalle ordenado: elige WhatsApp y el cliente. En el computador abre el chat y copia la imagen: pégala con Ctrl+V.</p>`,
        onClose: () => url && URL.revokeObjectURL(url),
      });
      D.invoice.render(sale, 2).then((c) =>
        c.toBlob((b) => {
          if (sh.closed) return;
          url = URL.createObjectURL(b);
          const box = sh.$('#inv-prev');
          box.innerHTML = `<img src="${url}" alt="Vista previa de la factura ${esc(sale.number)}" width="${c.width / 2}" height="${c.height / 2}">`;
          box.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.23,1,0.32,1)' });
        }, 'image/png')
      );
      sh.el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-inv]');
        if (!b) return;
        const k = b.dataset.inv;
        if (b.classList.contains('is-busy')) return;
        if (k === 'wa') D.busy(b, wa.sendDoc(sale, customer && customer.phone, wa.invoiceText(sale)));
        else {
          const type = k.endsWith('pdf') ? 'pdf' : 'png';
          await D.busy(b, (async () => {
            if (k.startsWith('share')) {
              const r = await D.invoice.share(sale, type);
              if (r === 'downloaded') D.toast('Factura descargada. Adjúntala en WhatsApp.', { tone: 'info', icon: 'download' });
            } else {
              D.download(await D.invoice.blob(sale, type), D.invoice.fileName(sale, type));
              D.toast('Factura descargada', { icon: 'download' });
            }
          })());
        }
      });
    },
  };

  /* ==========================================================================
     PDF mínimo: una página con la factura como imagen JPEG
     ========================================================================== */
  function pdfFromJpeg(jpeg, iw, ih) {
    const enc = new TextEncoder();
    const pw = 595.28;
    const imgH = (pw * ih) / iw;
    const ph = Math.max(841.89, imgH);
    const parts = [];
    let off = 0;
    const xref = [];
    const put = (d) => {
      const b = typeof d === 'string' ? enc.encode(d) : d;
      parts.push(b);
      off += b.length;
    };
    const obj = (n, body) => {
      xref[n] = off;
      put(`${n} 0 obj\n${body}\nendobj\n`);
    };
    put('%PDF-1.4\n%âãÏÓ\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    xref[4] = off;
    put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    put(jpeg);
    put('\nendstream\nendobj\n');
    const content = `q ${pw.toFixed(2)} 0 0 ${imgH.toFixed(2)} 0 ${(ph - imgH).toFixed(2)} cm /Im0 Do Q`;
    obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(6, `<< /Title (${D.data.settings.name} - Factura) /Producer (Dulza) >>`);
    const start = off;
    let x = 'xref\n0 7\n0000000000 65535 f \n';
    for (let i = 1; i <= 6; i++) x += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
    put(x + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${start}\n%%EOF`);
    const out = new Uint8Array(off);
    let p = 0;
    parts.forEach((b) => {
      out.set(b, p);
      p += b.length;
    });
    return out;
  }
})();
