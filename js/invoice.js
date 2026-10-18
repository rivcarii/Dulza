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
  wa.sendDoc = async (sale, phone, text) => {
    const copied = await wa.copyImage(sale);
    const opened = wa.send(phone, text, { quiet: true, note: copied ? ' La imagen ya está copiada: pégala en el chat.' : '' });
    if (!opened) return; // el aviso de «Abrir WhatsApp» ya explica qué hacer
    const sinChat = phone ? '' : ' Elige también el contacto.';
    D.toast(copied ? `Imagen de la factura copiada: en WhatsApp mantén pulsado el mensaje y elige «Pegar».${sinChat}` : `No pude copiar la imagen: usa «Compartir imagen» para adjuntarla.${sinChat}`, { tone: copied ? 'ok' : 'info', icon: 'image' });
  };

  /* ==========================================================================
     Dibujo de la factura
     ========================================================================== */
  const FONT = 'Nunito, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const DISP = '"Titan One", "Arial Rounded MT Bold", ' + FONT;
  const fontD = (px) => `400 ${px}px ${DISP}`;
  const W = 840, PAD = 52;

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

  /* Hoja tamaño carta/A4: encabezado con emisor y número, recuadros de cliente y condiciones, tabla con
     cantidades, totales, firmas y pie. El pie se ancla al fondo para que siempre parezca una factura impresa. */
  const A4H = Math.round(W * 1.4142);
  const STATUS_LABEL = { paid: 'Pagada', pending: 'Por cobrar', partial: 'Abonada', overdue: 'Vencida' };
  const STAMP = { paid: 'PAGADA', pending: 'PENDIENTE', partial: 'ABONADA', overdue: 'VENCIDA' };
  // la mascota cambia de expresión según el estado de la factura
  const MOOD = D.SALE_MOOD;
  const THANKS = { paid: '¡Gracias por tu pago!', pending: '¡Gracias por tu compra!', partial: '¡Gracias por tu abono!', overdue: '¡Gracias por tu compra!' };
  const SUBLINE = { paid: 'Tu factura quedó pagada.', pending: '', partial: 'Te esperamos con el saldo restante.', overdue: 'Tu saldo está vencido: escríbenos y lo resolvemos.' };
  const fdate = (iso) => {
    const d = D.parseDate(iso);
    return `${d.getDate()} ${D.MONTHS_L[d.getMonth()]} ${d.getFullYear()}`;
  };

  /* Mide (dry) o dibuja la factura. Devuelve la altura total; con minH el pie baja hasta el fondo de la hoja. */
  function paint(ctx, sale, A, dry, minH = 0) {
    const S = D.data.settings;
    const K = A.colors;
    const mix = D.color.mix;
    const ink = '#2a1a23', ink2 = '#6b5762', ink3 = '#9a8892', line = '#e6dce1';
    const tint = mix(K.brand, '#ffffff', 0.93);
    const total = D.sale.total(sale), paid = D.sale.paid(sale), bal = D.sale.balance(sale);
    const st = D.sale.status(sale);
    const tone = { paid: '#178a55', pending: '#2f6fdb', partial: '#a15c00', overdue: '#c8283d' }[st];
    const customer = D.sale.customer(sale);
    const onB = K.onBrand;
    const text = (t, x, y, f, c, align = 'left', ls = 0) => {
      ctx.font = f;
      if (dry) return;
      ctx.fillStyle = c;
      ctx.textAlign = align;
      try { ctx.letterSpacing = ls ? ls + 'px' : '0px'; } catch (e) {}
      ctx.fillText(t, x, y);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    };
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '0px'; } catch (e) {}

    /* ---- Franja superior ---- */
    if (!dry) {
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, K.fill);
      g.addColorStop(1, K.accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, 12);
    }

    /* ---- Encabezado: emisor a la izquierda, número y fechas a la derecha ---- */
    let y = 44;
    const own = !!A.brandLogo;
    let ix = PAD;
    if (own) {
      if (!dry) ctx.drawImage(A.brandLogo, PAD - 8, y - 6, 156, 156);
      ix = PAD + 156;
    } else {
      if (!dry) {
        ctx.save();
        rr(ctx, PAD, y, 80, 80, 22);
        ctx.clip();
        ctx.drawImage(A.logo, PAD, y, 80, 80);
        ctx.restore();
      }
      ix = PAD + 100;
    }
    let iy = y + (own ? 26 : 34);
    if (!own) {
      text(S.name, ix, iy, fontD(34), K.ink);
      iy += 32;
    }
    const issuerW = W - PAD - 280 - 20 - ix;
    [S.tagline, S.owner, S.phone, S.address].filter(Boolean).forEach((l, k) => {
      ctx.font = font(k === 0 ? 650 : 500, 18);
      wrap(ctx, l, issuerW, 2).forEach((s) => {
        text(s, ix, iy, font(k === 0 ? 650 : 500, 18), k === 0 ? K.ink : ink2);
        iy += 25;
      });
    });
    const rx = W - PAD, lx = rx - 280;
    text('FACTURA DE VENTA', rx, y + 16, font(800, 14), ink2, 'right', 1.2);
    text(sale.number, rx, y + 64, fontD(42), K.ink, 'right');
    let my = y + 100;
    text('Emisión', lx, my, font(500, 17), ink3);
    text(fdate(sale.date), rx, my, font(700, 18), ink, 'right');
    my += 28;
    if (sale.term > 0) {
      text('Vencimiento', lx, my, font(500, 17), ink3);
      text(fdate(sale.due), rx, my, font(700, 18), bal > 0 && sale.due < D.today() ? '#c8283d' : ink, 'right');
      my += 28;
    }
    y = Math.max(iy, my, y + 150) + 10;
    if (!dry) {
      ctx.fillStyle = K.fill;
      ctx.fillRect(PAD, y, W - PAD * 2, 3);
    }
    y += 28;

    /* ---- Recuadros: cliente y condiciones ---- */
    const bw1 = 484, bw2 = W - PAD * 2 - bw1 - 16, bx2 = PAD + bw1 + 16;
    ctx.font = font(750, 25);
    const nameLines = wrap(ctx, D.sale.customerName(sale), bw1 - 36, 2);
    ctx.font = font(500, 18);
    const metaLines = [];
    [customer && customer.phone, customer && customer.address].filter(Boolean).forEach((m) => wrap(ctx, m, bw1 - 36, 2).forEach((l) => metaLines.push(l)));
    const cond = [['Plazo', sale.term === 0 ? 'Contado' : `${sale.term} días`], ['Estado', STATUS_LABEL[st]]];
    const bh = Math.max(34 + 16 + nameLines.length * 31 + metaLines.length * 25 + 12, 34 + 16 + cond.length * 34 + 8, 116);
    const frame = (x, w, label) => {
      if (dry) return;
      ctx.fillStyle = '#ffffff';
      rr(ctx, x, y, w, bh, 14);
      ctx.fill();
      ctx.save();
      rr(ctx, x, y, w, bh, 14);
      ctx.clip();
      ctx.fillStyle = tint;
      ctx.fillRect(x, y, w, 34);
      ctx.restore();
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      rr(ctx, x, y, w, bh, 14);
      ctx.stroke();
      text(label, x + 18, y + 23, font(800, 13), K.ink, 'left', 1.1);
    };
    frame(PAD, bw1, 'FACTURADO A');
    frame(bx2, bw2, 'CONDICIONES');
    let cy = y + 34 + 16 + 24;
    nameLines.forEach((l, i) => text(l, PAD + 18, cy + i * 31, font(750, 25), ink));
    cy += (nameLines.length - 1) * 31 + 28;
    metaLines.forEach((l) => {
      text(l, PAD + 18, cy, font(500, 18), ink2);
      cy += 25;
    });
    cond.forEach(([k, v], i) => {
      const yy = y + 34 + 16 + 24 + i * 34;
      text(k, bx2 + 18, yy, font(500, 18), ink3);
      text(v, bx2 + bw2 - 18, yy, font(750, 20), k === 'Estado' ? tone : ink, 'right');
    });
    y += bh + 28;

    /* ---- Tabla de detalle ---- */
    const cx = { n: PAD + 26, icon: PAD + 52, desc: PAD + 114, qty: 520, price: 640, tot: W - PAD - 18 };
    const HB = 46;
    ctx.font = font(650, 21);
    const rows = sale.items.map((it) => {
      const nm = wrap(ctx, it.name, cx.qty - cx.desc - 56, 2);
      return { it, nm, h: Math.max(72, 36 + nm.length * 27) };
    });
    const th = HB + rows.reduce((a, r) => a + r.h, 0);
    const t0 = y;
    if (!dry) {
      ctx.fillStyle = '#ffffff';
      rr(ctx, PAD, t0, W - PAD * 2, th, 14);
      ctx.fill();
      ctx.save();
      rr(ctx, PAD, t0, W - PAD * 2, th, 14);
      ctx.clip();
      ctx.fillStyle = K.fill;
      ctx.fillRect(PAD, t0, W - PAD * 2, HB);
      let zy = t0 + HB;
      rows.forEach((r, i) => {
        if (i % 2) {
          ctx.fillStyle = tint;
          ctx.fillRect(PAD, zy, W - PAD * 2, r.h);
        }
        zy += r.h;
      });
      ctx.restore();
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.5;
      rr(ctx, PAD, t0, W - PAD * 2, th, 14);
      ctx.stroke();
    }
    const hy = t0 + 29;
    text('N°', cx.n, hy, font(800, 13), onB, 'center', 0.8);
    text('DESCRIPCIÓN', cx.desc, hy, font(800, 13), onB, 'left', 0.8);
    text('CANT.', cx.qty, hy, font(800, 13), onB, 'right', 0.8);
    text('PRECIO UNIT.', cx.price, hy, font(800, 13), onB, 'right', 0.8);
    text('TOTAL', cx.tot, hy, font(800, 13), onB, 'right', 0.8);
    let ry = t0 + HB;
    rows.forEach((r, i) => {
      const it = r.it, mid = ry + r.h / 2;
      text(String(i + 1), cx.n, mid + 7, font(650, 19), ink3, 'center');
      // ícono del postre en un cuadro de tamaño fijo, siempre alineado con el texto
      const g = A.glyphs && A.glyphs[it.emoji || D.DEFAULT_GLYPH];
      if (!dry) {
        ctx.fillStyle = mix(K.brand, '#ffffff', 0.88);
        rr(ctx, cx.icon, mid - 27, 54, 54, 16);
        ctx.fill();
        if (g) {
          const k = Math.min(42 / g.naturalWidth, 42 / g.naturalHeight), gw = g.naturalWidth * k, gh = g.naturalHeight * k;
          ctx.drawImage(g, cx.icon + 27 - gw / 2, mid - gh / 2, gw, gh);
        }
      }
      if (!g && it.emoji && !D.isPostre(it.emoji)) text(it.emoji, cx.icon + 27, mid + 11, font(400, 30), ink, 'center');
      r.nm.forEach((l, k) => text(l, cx.desc, mid + 7 - ((r.nm.length - 1) * 27) / 2 + k * 27, font(650, 21), ink));
      text(String(it.qty), cx.qty, mid + 7, font(650, 21), ink, 'right');
      text(D.money(it.price), cx.price, mid + 7, font(500, 20), ink2, 'right');
      text(D.money(it.qty * it.price), cx.tot, mid + 7, font(750, 21), ink, 'right');
      ry += r.h;
    });
    y = t0 + th + 30;

    /* ---- Totales (derecha) · sello, pagos y observaciones (izquierda) ---- */
    const bx = W - PAD - 340, bwid = 340;
    let ty = y;
    const kv = (label, val, color = ink, big = false) => {
      text(label, bx + 4, ty + 22, font(500, 19), ink2);
      text(val, W - PAD - 4, ty + 22, font(big ? 800 : 650, big ? 23 : 20), color, 'right');
      ty += 36;
    };
    kv('Subtotal', D.money(D.sale.subtotal(sale)));
    if (sale.discount > 0) kv('Descuento', '− ' + D.money(sale.discount), '#c8283d');
    ty += 4;
    if (!dry) {
      ctx.fillStyle = K.fill;
      rr(ctx, bx, ty, bwid, 64, 16);
      ctx.fill();
    }
    text('TOTAL', bx + 20, ty + 38, font(800, 16), onB + 'dd', 'left', 1);
    text(D.money(total), W - PAD - 20, ty + 43, fontD(30), onB, 'right');
    ty += 76;
    if (paid > 0) kv('Abonado', D.money(paid), '#178a55');
    if (bal > 0) kv('Saldo pendiente', D.money(bal), tone, true);

    const lw = bx - 24 - PAD;
    let ly = y + 4;
    if (!dry) {
      ctx.save();
      ctx.translate(PAD + Math.min(150, lw / 2), ly + 56);
      ctx.rotate(-0.15);
      ctx.font = fontD(30);
      const tw = ctx.measureText(STAMP[st]).width;
      ctx.strokeStyle = tone;
      ctx.fillStyle = tone;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 5;
      rr(ctx, -tw / 2 - 24, -32, tw + 48, 64, 15);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      rr(ctx, -tw / 2 - 18, -26, tw + 36, 52, 10);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(STAMP[st], 0, 11);
      ctx.restore();
    }
    ly += 118;
    if (sale.payments && sale.payments.length) {
      text('PAGOS RECIBIDOS', PAD, ly + 8, font(800, 13), ink2, 'left', 1.1);
      ly += 14;
      sale.payments
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((p) => {
          ly += 30;
          text(`${D.fmtDate(p.date)}  ·  ${p.method}`, PAD, ly, font(500, 18), ink2);
          text(D.money(p.amount), PAD + lw, ly, font(650, 19), ink, 'right');
        });
      ly += 14;
    }
    if (sale.note) {
      ly += 14;
      ctx.font = font(500, 18);
      const nl = wrap(ctx, sale.note, lw - 36, 4);
      const nh = 44 + nl.length * 25;
      if (!dry) {
        ctx.fillStyle = tint;
        rr(ctx, PAD, ly - 4, lw, nh, 14);
        ctx.fill();
      }
      text('OBSERVACIONES', PAD + 18, ly + 22, font(800, 12), K.ink, 'left', 1.1);
      nl.forEach((l, i) => text(l, PAD + 18, ly + 50 + i * 25, font(500, 18), ink));
      ly += nh;
    }
    y = Math.max(ly, ty) + 22;

    /* ---- Pie anclado al fondo: firmas, agradecimiento con la mascota y aviso ---- */
    ctx.font = font(500, 17);
    const tl = wrap(ctx, S.terms || '', W - PAD * 2 - 190, 4);
    const sub = SUBLINE[st];
    const mw = 140, mh = A.mascot ? mw * ((A.mascot.naturalHeight || 1) / (A.mascot.naturalWidth || 1)) : 0;
    const thanksH = Math.max(46 + (sub ? 28 : 0) + tl.length * 24, mh + 4, 120);
    const sigH = 76;
    const Bh = 20 + sigH + 24 + thanksH + 36 + 12;
    const footTop = Math.max(y + 18, minH - Bh);
    let fy = footTop + 20;
    if (!dry) {
      ctx.fillStyle = ink3;
      ctx.fillRect(PAD, fy + 46, 240, 1.5);
      ctx.fillRect(W - PAD - 240, fy + 46, 240, 1.5);
    }
    text('Elaboró', PAD + 120, fy + 68, font(600, 15), ink3, 'center');
    text('Recibí conforme', W - PAD - 120, fy + 68, font(600, 15), ink3, 'center');
    fy += sigH + 24;
    if (!dry) {
      ctx.fillStyle = line;
      ctx.fillRect(PAD, fy - 14, W - PAD * 2, 1.5);
    }
    text(THANKS[st], PAD, fy + 28, fontD(30), K.ink);
    let sy = fy + 28;
    if (sub) {
      sy += 28;
      text(sub, PAD, sy, font(650, 18), tone);
    }
    tl.forEach((l, i) => text(l, PAD, sy + 28 + i * 24, font(500, 17), ink2));
    if (!dry && A.mascot) ctx.drawImage(A.mascot, W - PAD - mw, fy + (thanksH - mh) / 2 - 8, mw, mh);
    fy += thanksH;
    text('Comprobante de venta · no es una factura electrónica', PAD, fy + 26, font(500, 14), ink3);
    const end = footTop + Bh;
    if (!dry) {
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, K.fill);
      g.addColorStop(1, K.accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, end - 12, W, 12);
    }
    return end;
  }

  async function assets(sale) {
    const S = D.data.settings;
    const K = D.theme.colors();
    try {
      await Promise.all([document.fonts.load('40px "Titan One"'), document.fonts.load('400 20px Nunito'), document.fonts.load('600 20px Nunito'), document.fonts.load('700 20px Nunito'), document.fonts.load('800 20px Nunito')]);
    } catch (e) {}
    const ownLogo = !S.logo && /^dulza$/i.test(String(S.name || '').trim());
    const tokens = Array.from(new Set(((sale && sale.items) || []).map((i) => i.emoji || D.DEFAULT_GLYPH).filter(D.isPostre)));
    const mood = D.gpt.moods[MOOD[sale ? D.sale.status(sale) : 'pending']] || D.gpt.bust;
    const [logo, mascot, brandLogo, ...glyphs] = await Promise.all([
      D.art.srcToImage(S.logo || D.gpt.url(D.gpt.icon)),
      D.art.srcToImage(S.mascot || D.gpt.url(mood)),
      ownLogo ? D.art.srcToImage(D.gpt.url(D.gpt.logo)).catch(() => null) : null,
      ...tokens.map((t) => D.art.srcToImage(D.postreUrl(t)).catch(() => null)),
    ]);
    return { colors: K, logo, mascot, brandLogo, glyphs: Object.fromEntries(tokens.map((t, i) => [t, glyphs[i]])) };
  }

  D.invoice = {
    async render(sale, scale = 2) {
      const A = await assets(sale);
      const probe = document.createElement('canvas').getContext('2d');
      const H = Math.max(Math.ceil(paint(probe, sale, A, true)), A4H);
      const c = document.createElement('canvas');
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      paint(ctx, sale, A, false, H);
      return c;
    },

    async blob(sale, type = 'png') {
      const c = await D.invoice.render(sale, 2);
      if (type === 'png') return new Promise((r) => c.toBlob(r, 'image/png'));
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
        body: `<div class="invoice-preview" id="inv-prev"><div class="spinner" role="status" aria-label="Preparando factura"></div></div>
          <div class="list list--spaced" style="margin-top:14px">
            <button class="row row--tap row--noavatar" data-inv="share-pdf"><span class="row__icon">${D.icon('file')}</span><span class="row__main"><span class="row__title">Compartir PDF</span><span class="row__sub">Elige WhatsApp u otra app</span></span><span class="row__chev">${D.icon('chevR')}</span></button>
            <button class="row row--tap row--noavatar" data-inv="share-png"><span class="row__icon">${D.icon('image')}</span><span class="row__main"><span class="row__title">Compartir imagen</span><span class="row__sub">Se ve directo en el chat</span></span><span class="row__chev">${D.icon('chevR')}</span></button>
            <button class="row row--tap row--noavatar" data-inv="dl-pdf"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Descargar PDF</span></span></button>
            <button class="row row--tap row--noavatar" data-inv="dl-png"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Descargar imagen</span></span></button>
          </div>`,
        footer: `<button class="btn btn--wa" data-inv="wa">${D.icon('whatsapp')}Enviar por WhatsApp${customer ? ' a ' + esc(customer.name.split(' ')[0]) : ''}</button>
                 <p class="muted center" style="font-size:.8rem">Abre el chat con el detalle ordenado y copia la imagen de la factura: en WhatsApp mantén pulsado y elige «Pegar». O usa «Compartir imagen» para adjuntarla directo.</p>`,
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
        if (k === 'wa') wa.sendDoc(sale, customer && customer.phone, wa.invoiceText(sale));
        else {
          const type = k.endsWith('pdf') ? 'pdf' : 'png';
          b.style.opacity = '0.5';
          if (k.startsWith('share')) {
            const r = await D.invoice.share(sale, type);
            if (r === 'downloaded') D.toast('Factura descargada. Adjúntala en WhatsApp.', { tone: 'info', icon: 'download' });
          } else {
            D.download(await D.invoice.blob(sale, type), D.invoice.fileName(sale, type));
            D.toast('Factura descargada', { icon: 'download' });
          }
          b.style.opacity = '';
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
