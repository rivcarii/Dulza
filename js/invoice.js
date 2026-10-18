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
  const MONO = '"Courier New", Courier, "Liberation Mono", ui-monospace, Menlo, Consolas, monospace';
  const mono = (w, px) => `${w} ${px}px ${MONO}`;
  const W = 620, M = 30, PAD = 62, RX = W - PAD, CW = RX - PAD, TOP = 28; // tiquete angosto: el papel va de M a W-M

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

  /* Tiquete de supermercado: papel angosto con bordes dentados, logo centrado arriba, líneas punteadas, texto de máquina,
     totales a la derecha, sello de estado, código de barras y una marca de agua de postres translúcidos en todo el papel.
     paint() solo escribe el contenido (con dry=true únicamente mide); el papel y la marca de agua los pone render(). */
  const MINH = 640;
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
  // postres de la marca de agua (siempre los mismos, más los que lleva la venta)
  const WATERMARK = ['02', '06', '11', '15', '19', '24', '29', '34', '40', '47'].map((n) => 'p:' + n);

  /* Contorno del papel con dientes arriba y abajo */
  function paperPath(ctx, top, bottom) {
    const x0 = M, x1 = W - M, t = 9, n = Math.round((x1 - x0) / 16), w = (x1 - x0) / n;
    ctx.beginPath();
    ctx.moveTo(x0, top + t);
    for (let i = 0; i < n; i++) {
      ctx.lineTo(x0 + w * (i + 0.5), top);
      ctx.lineTo(x0 + w * (i + 1), top + t);
    }
    ctx.lineTo(x1, bottom - t);
    for (let i = n; i > 0; i--) {
      ctx.lineTo(x0 + w * (i - 0.5), bottom);
      ctx.lineTo(x0 + w * (i - 1), bottom - t);
    }
    ctx.closePath();
  }

  /* Dibuja el contenido del tiquete empezando en TOP. Devuelve la y donde termina. */
  function paint(ctx, sale, A, dry) {
    const S = D.data.settings;
    const K = A.colors;
    const ink = '#241820', ink2 = '#5f4f58', ink3 = '#8f7f88', dash = '#b3a3ac';
    const total = D.sale.total(sale), paid = D.sale.paid(sale), bal = D.sale.balance(sale);
    const st = D.sale.status(sale);
    const tone = { paid: '#178a55', pending: '#2f6fdb', partial: '#a15c00', overdue: '#c8283d' }[st];
    const customer = D.sale.customer(sale);
    const cxm = W / 2;
    const text = (t, x, yy, f, c, align = 'left', ls = 0) => {
      ctx.font = f;
      if (dry) return;
      ctx.fillStyle = c;
      ctx.textAlign = align;
      try { ctx.letterSpacing = ls ? ls + 'px' : '0px'; } catch (e) {}
      ctx.fillText(t, x, yy);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    };
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    let y = TOP + 40;

    const rule = (kind = 'dash') => {
      if (!dry) {
        ctx.save();
        ctx.strokeStyle = dash;
        ctx.lineWidth = 2;
        const line = (yy) => { ctx.beginPath(); ctx.moveTo(PAD, yy); ctx.lineTo(RX, yy); ctx.stroke(); };
        if (kind === 'dash') { ctx.setLineDash([8, 6]); line(y); }
        else { line(y - 2); line(y + 2); }
        ctx.restore();
      }
      y += 24;
    };
    const kv = (label, val, { bold = false, color = ink, size = 16 } = {}) => {
      text(label, PAD, y, mono(500, size), ink2);
      text(val, RX, y, mono(bold ? 800 : 700, size), color, 'right');
      y += size + 11;
    };

    /* ---- Logo arriba y centrado, y los datos del negocio ---- */
    if (A.brandLogo) {
      const k = Math.min(250 / A.brandLogo.naturalWidth, 170 / A.brandLogo.naturalHeight);
      const bw = A.brandLogo.naturalWidth * k, bh = A.brandLogo.naturalHeight * k;
      if (!dry) ctx.drawImage(A.brandLogo, cxm - bw / 2, y - 14, bw, bh);
      y += bh + 6;
    } else {
      if (!dry) {
        ctx.save();
        rr(ctx, cxm - 40, y - 14, 80, 80, 22);
        ctx.clip();
        ctx.drawImage(A.logo, cxm - 40, y - 14, 80, 80);
        ctx.restore();
      }
      y += 94;
      text(S.name, cxm, y, fontD(32), K.ink, 'center');
      y += 12;
    }
    y += 14;
    [S.tagline, S.owner, S.phone, S.address].filter(Boolean).forEach((l, k) => {
      ctx.font = mono(k === 0 ? 800 : 500, 15);
      wrap(ctx, l, CW, 2).forEach((s) => {
        text(s, cxm, y, mono(k === 0 ? 800 : 500, 15), k === 0 ? ink : ink2, 'center');
        y += 21;
      });
    });
    y += 6;
    rule();

    /* ---- Documento ---- */
    text('FACTURA DE VENTA', cxm, y, mono(800, 14), ink2, 'center', 3);
    y += 42;
    text(sale.number, cxm, y, fontD(40), K.ink, 'center');
    y += 28;
    const hora = sale.at ? new Date(sale.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    text(fdate(sale.date) + (hora ? '  ·  ' + hora : ''), cxm, y, mono(700, 15), ink2, 'center');
    y += 20;
    rule();
    ctx.font = mono(800, 16);
    const nm = wrap(ctx, D.sale.customerName(sale), CW - 110, 2);
    text('CLIENTE', PAD, y, mono(500, 16), ink2);
    nm.forEach((l, i) => text(l, RX, y + i * 21, mono(800, 16), ink, 'right'));
    y += nm.length * 21 + 8;
    if (customer && customer.phone) kv('WhatsApp', customer.phone);
    kv('Plazo', sale.term === 0 ? 'Contado' : `${sale.term} días`);
    if (sale.term > 0) kv('Vence', fdate(sale.due), { color: bal > 0 && sale.due < D.today() ? '#c8283d' : ink });
    kv('Estado', STATUS_LABEL[st], { color: tone, bold: true });
    y -= 4;
    rule('double');

    /* ---- Detalle ---- */
    text('CANT', PAD, y, mono(800, 13), ink3, 'left', 1);
    text('DESCRIPCIÓN', PAD + 92, y, mono(800, 13), ink3, 'left', 1);
    text('VALOR', RX, y, mono(800, 13), ink3, 'right', 1);
    y += 12;
    rule();
    y -= 4;
    const dx = PAD + 92, descW = RX - 128 - dx;
    sale.items.forEach((it) => {
      ctx.font = mono(700, 17);
      const nl = wrap(ctx, it.name, descW, 2);
      const sub = it.qty > 1;
      const rowH = Math.max(54, 20 + nl.length * 22 + (sub ? 20 : 0));
      const mid = y + rowH / 2;
      text(`${it.qty}x`, PAD, y + 24, mono(800, 18), ink);
      const g = A.glyphs && A.glyphs[it.emoji || D.DEFAULT_GLYPH];
      if (g && !dry) {
        const k = Math.min(40 / g.naturalWidth, 40 / g.naturalHeight);
        ctx.drawImage(g, PAD + 44 - (g.naturalWidth * k) / 2, mid - (g.naturalHeight * k) / 2, g.naturalWidth * k, g.naturalHeight * k);
      } else if (!g && it.emoji && !D.isPostre(it.emoji)) text(it.emoji, PAD + 44, mid + 10, font(400, 28), ink, 'center');
      nl.forEach((l, i) => text(l, dx, y + 24 + i * 22, mono(700, 17), ink));
      if (sub) text(`${D.money(it.price)} c/u`, dx, y + 24 + nl.length * 22 - 2, mono(500, 13), ink3);
      text(D.money(it.qty * it.price), RX, y + 24, mono(800, 17), ink, 'right');
      y += rowH;
    });
    rule();

    /* ---- Totales ---- */
    kv('SUBTOTAL', D.money(D.sale.subtotal(sale)));
    if (sale.discount > 0) kv('DESCUENTO', '− ' + D.money(sale.discount), { color: '#c8283d' });
    y += 2;
    rule('double');
    text('TOTAL', PAD, y + 8, mono(800, 26), ink);
    text(D.money(total), RX, y + 8, mono(800, 30), K.ink, 'right');
    y += 42;
    if (paid > 0) kv('ABONADO', D.money(paid), { color: '#178a55' });
    if (bal > 0) {
      text('SALDO PENDIENTE', PAD, y + 2, mono(800, 17), tone);
      text(D.money(bal), RX, y + 2, mono(800, 22), tone, 'right');
      y += 36;
    }

    /* ---- Sello de estado ---- */
    y += 20;
    if (!dry) {
      ctx.save();
      ctx.translate(cxm, y + 34);
      ctx.rotate(-0.1);
      ctx.font = fontD(30);
      const tw = ctx.measureText(STAMP[st]).width;
      ctx.strokeStyle = tone;
      ctx.fillStyle = tone;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 4.5;
      rr(ctx, -tw / 2 - 24, -32, tw + 48, 64, 15);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      rr(ctx, -tw / 2 - 18, -26, tw + 36, 52, 10);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(STAMP[st], 0, 11);
      ctx.restore();
    }
    y += 84;

    /* ---- Pagos y observaciones ---- */
    if (sale.payments && sale.payments.length) {
      rule();
      text('PAGOS RECIBIDOS', PAD, y, mono(800, 13), ink3, 'left', 1);
      y += 24;
      sale.payments
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((p) => {
          text(`${D.fmtDate(p.date)}  ${p.method}`, PAD, y, mono(500, 15), ink2);
          text(D.money(p.amount), RX, y, mono(800, 16), ink, 'right');
          y += 26;
        });
      y -= 6;
    }
    if (sale.note) {
      rule();
      text('NOTA', PAD, y, mono(800, 13), ink3, 'left', 1);
      y += 22;
      ctx.font = mono(500, 15);
      wrap(ctx, sale.note, CW, 4).forEach((l) => {
        text(l, PAD, y, mono(500, 15), ink);
        y += 21;
      });
      y -= 4;
    }
    rule();

    /* ---- Cierre: mascota, agradecimiento, condiciones y código de barras ---- */
    const mw = 118, mh = A.mascot ? mw * ((A.mascot.naturalHeight || 1) / (A.mascot.naturalWidth || 1)) : 0;
    if (!dry && A.mascot) ctx.drawImage(A.mascot, cxm - mw / 2, y - 6, mw, mh);
    y += mh + 30;
    text(THANKS[st], cxm, y, fontD(27), K.ink, 'center');
    y += 10;
    if (SUBLINE[st]) {
      y += 22;
      ctx.font = mono(700, 14);
      wrap(ctx, SUBLINE[st], CW, 2).forEach((l) => {
        text(l, cxm, y, mono(700, 14), tone, 'center');
        y += 20;
      });
      y -= 6;
    }
    ctx.font = mono(500, 13);
    const tl = wrap(ctx, S.terms || '', CW, 4);
    y += 22;
    tl.forEach((l) => {
      text(l, cxm, y, mono(500, 13), ink2, 'center');
      y += 19;
    });
    y += 18;
    if (!dry) {
      let h = 2166136261;
      for (const ch of sale.number + sale.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
      const rnd = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
      const bw = CW - 60, x0 = PAD + 30;
      ctx.fillStyle = ink;
      for (let x = 0, bar = true; x < bw; bar = !bar) {
        const w = 2 + Math.floor(rnd() * 4);
        if (bar) ctx.fillRect(x0 + x, y, Math.min(w, bw - x), 52);
        x += w;
      }
    }
    y += 52 + 20;
    text(sale.number.split('').join(' '), cxm, y, mono(700, 13), ink2, 'center', 2);
    y += 28;
    text('Comprobante de venta · no es factura electrónica', cxm, y, mono(500, 11.5), ink3, 'center');
    return y + 4;
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
    const marks = Array.from(new Set([...WATERMARK, ...tokens])).slice(0, 14);
    const [logo, mascot, brandLogo, ...rest] = await Promise.all([
      D.art.srcToImage(S.logo || D.gpt.url(D.gpt.icon)),
      D.art.srcToImage(S.mascot || D.gpt.url(mood)),
      ownLogo ? D.art.srcToImage(D.gpt.url(D.gpt.logo)).catch(() => null) : null,
      ...tokens.map((t) => D.art.srcToImage(D.postreUrl(t)).catch(() => null)),
      ...marks.map((t) => D.art.srcToImage(D.postreUrl(t)).catch(() => null)),
    ]);
    const glyphs = rest.slice(0, tokens.length);
    return { colors: K, logo, mascot, brandLogo, pat: rest.slice(tokens.length), glyphs: Object.fromEntries(tokens.map((t, i) => [t, glyphs[i]])) };
  }

  D.invoice = {
    async render(sale, scale = 2) {
      const A = await assets(sale);
      const probe = document.createElement('canvas').getContext('2d');
      const H = Math.max(Math.ceil(paint(probe, sale, A, true)) + 34 + TOP, MINH);
      const bottom = H - TOP; // fin del papel
      const c = document.createElement('canvas');
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext('2d');
      ctx.scale(scale, scale);
      // fondo suave con el color de la marca y el papel encima, con sombra
      ctx.fillStyle = D.color.mix(A.colors.brand, '#ffffff', 0.86);
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.shadowColor = 'rgba(70, 25, 48, 0.22)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 7;
      ctx.fillStyle = '#fffdfb';
      paperPath(ctx, TOP, bottom);
      ctx.fill();
      ctx.restore();
      // marca de agua: postres translúcidos girados, en filas desfasadas, recortados al papel
      ctx.save();
      paperPath(ctx, TOP, bottom);
      ctx.clip();
      const pat = A.pat.filter(Boolean);
      if (pat.length) {
        const cell = 104;
        ctx.globalAlpha = 0.095;
        for (let r = 0, yy = TOP + 20; yy < bottom + cell; r++, yy += cell * 0.9) {
          for (let k = 0, xx = M - (r % 2 ? 0 : cell / 2) + 8; xx < W; k++, xx += cell) {
            const g = pat[(r * 4 + k * 3) % pat.length];
            const s = Math.min(70 / g.naturalWidth, 70 / g.naturalHeight);
            ctx.save();
            ctx.translate(xx + cell / 2, yy + cell / 2);
            ctx.rotate(((r + k) % 2 ? -1 : 1) * 0.22);
            ctx.drawImage(g, (-g.naturalWidth * s) / 2, (-g.naturalHeight * s) / 2, g.naturalWidth * s, g.naturalHeight * s);
            ctx.restore();
          }
        }
      }
      ctx.restore();
      paint(ctx, sale, A, false);
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
