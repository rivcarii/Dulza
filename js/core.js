/* Dulza · utilidades base: DOM, fechas, números, color, WhatsApp */
(function () {
  'use strict';
  const D = (window.D = window.D || {});
  D.version = '1.6.1'; // se sube junto con VERSION de sw.js (python .dev/version.py 1.7.0)

  /* ---------- DOM ---------- */
  D.$ = (s, r = document) => r.querySelector(s);
  D.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  D.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  D.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  D.raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  D.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  D.debounce = (fn, ms = 150) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  D.reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  D.isCompact = () => window.matchMedia('(max-width: 699px)').matches;
  D.plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  D.haptic = (ms = 8) => {
    try {
      if (navigator.vibrate && window.matchMedia('(pointer: coarse)').matches) navigator.vibrate(ms);
    } catch (e) {}
  };
  D.download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  };

  /* ---------- Fechas (siempre ISO local AAAA-MM-DD) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  D.MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  D.MONTHS_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  D.DAYS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  D.DAYS_S = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  D.iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  D.today = () => D.iso();
  D.parseDate = (iso) => {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  D.addDays = (iso, n) => {
    const d = D.parseDate(iso);
    d.setDate(d.getDate() + n);
    return D.iso(d);
  };
  D.addMonths = (iso, n) => {
    const d = D.parseDate(iso);
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    return D.iso(d);
  };
  D.diffDays = (a, b) => Math.round((D.parseDate(a) - D.parseDate(b)) / 864e5);
  D.monthStart = (iso = D.today()) => iso.slice(0, 8) + '01';
  D.monthEnd = (iso = D.today()) => {
    const d = D.parseDate(iso);
    return D.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };
  D.fmtDate = (iso) => {
    if (!iso) return '';
    const d = D.parseDate(iso);
    const y = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`;
    return `${d.getDate()} ${D.MONTHS[d.getMonth()]}${y}`;
  };
  D.fmtDateLong = (iso) => {
    const d = D.parseDate(iso);
    return `${D.DAYS_L[d.getDay()]} ${d.getDate()} de ${D.MONTHS_L[d.getMonth()]}`;
  };
  D.relDay = (iso) => {
    const n = D.diffDays(iso, D.today());
    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    if (n === -1) return 'ayer';
    return n > 0 ? `en ${n} días` : `hace ${-n} días`;
  };
  D.dayHeading = (iso) => {
    const n = D.diffDays(iso, D.today());
    if (n === 0) return 'Hoy';
    if (n === -1) return 'Ayer';
    const d = D.parseDate(iso);
    const base = `${D.DAYS_L[d.getDay()]} ${d.getDate()} de ${D.MONTHS_L[d.getMonth()]}`;
    return (base[0].toUpperCase() + base.slice(1)) + (d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '');
  };
  D.greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  };

  /* ---------- Números y dinero ---------- */
  D.r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const cfg = () => (D.data && D.data.settings) || { currency: '$', decimals: 0, numFmt: 'dot' };

  D.fmtNum = (n, dec) => {
    const S = cfg();
    dec = dec ?? S.decimals;
    const thou = S.numFmt === 'dot' ? '.' : ',';
    const decSep = S.numFmt === 'dot' ? ',' : '.';
    const [i, f] = Math.abs(Number(n) || 0).toFixed(dec).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, thou) + (f ? decSep + f : '');
  };
  D.money = (n, dec) => {
    const S = cfg();
    const v = Number(n) || 0;
    const body = D.fmtNum(Math.abs(v), dec);
    const neg = v < 0 && /[1-9]/.test(body);
    const sym = S.currency.length > 1 ? S.currency + ' ' : S.currency;
    return (neg ? '-' : '') + sym + body;
  };
  /* Dinero que se acorta (370,8 M) solo cuando la cifra completa no cabe en una tarjeta */
  D.moneyC = (n) => {
    const full = D.money(n);
    if (full.length <= 9) return full;
    const S = cfg();
    const sym = S.currency.length > 1 ? S.currency + ' ' : S.currency;
    return (n < 0 ? '-' : '') + sym + D.short(Math.abs(n));
  };
  D.short = (n) => {
    const a = Math.abs(n);
    const s = cfg().numFmt === 'dot' ? ',' : '.';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', s).replace(/[.,]0$/, '') + ' M';
    if (a >= 1e3) return Math.round(n / 1e3) + ' k';
    return String(Math.round(n));
  };
  D.parseNum = (v) => {
    if (typeof v === 'number') return v;
    let s = String(v ?? '').trim().replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) {
      const dec = lc > ld ? ',' : '.';
      const th = dec === ',' ? '.' : ',';
      s = s.split(th).join('').replace(dec, '.');
    } else if (lc > -1 || ld > -1) {
      const sep = lc > -1 ? ',' : '.';
      const parts = s.split(sep);
      const thou = cfg().numFmt === 'dot' ? '.' : ',';
      if (parts.length > 2 || (sep === thou && parts[1].length === 3)) s = parts.join('');
      else s = parts.join('.');
    }
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  D.pct = (n) => `${Math.round(n)}%`;

  /* ---------- Color ---------- */
  const C = (D.color = {});
  C.rgb = (hex) => {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  C.hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  C.mix = (a, b, t) => {
    const A = C.rgb(a), B = C.rgb(b);
    return C.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  C.lum = (hex) => {
    const [r, g, b] = C.rgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  C.contrast = (a, b) => {
    const la = C.lum(a), lb = C.lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  /* Acerca `hex` a `toward` (negro o blanco) hasta lograr el contraste pedido contra `against` */
  C.ensure = (hex, against, min, toward) => {
    let out = hex;
    for (let t = 0; t <= 1.001 && C.contrast(out, against) < min; t += 0.04) out = C.mix(hex, toward, t);
    return out;
  };
  C.valid = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim());

  /* Avatar: tono estable a partir del nombre */
  D.hue = (s) => {
    let h = 0;
    for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  };
  D.initials = (name) => {
    const p = String(name || '?').trim().split(/\s+/).filter(Boolean);
    const ch = (w) => Array.from(w || '?').find((c) => /[\p{L}\p{N}]/u.test(c)) || Array.from(w || '?')[0];
    return (ch(p[0]) + (p.length > 1 ? ch(p[p.length - 1]) : '')).toUpperCase();
  };

  /* ---------- WhatsApp ---------- */
  D.waNumber = (phone) => {
    const raw = String(phone || '').trim();
    let d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (raw.startsWith('+') || raw.startsWith('00')) return d.replace(/^00/, '');
    d = d.replace(/^0+/, '');
    const dial = (D.data.settings.dial || '').replace(/\D/g, '');
    if (!dial) return d;
    if (d.startsWith(dial) && d.length >= 11) return d;
    return dial + d;
  };
  D.waLink = (phone, text) => {
    const n = D.waNumber(phone);
    return `https://wa.me/${n}?text=${encodeURIComponent(text || '')}`;
  };
  D.openWa = (phone, text) => {
    window.open(D.waLink(phone, text), '_blank', 'noopener');
  };
  D.fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

  /* ---------- CSV ---------- */
  D.csv = (rows) => {
    const sep = cfg().numFmt === 'dot' ? ';' : ',';
    const q = (v) => {
      const s = v == null ? '' : String(v);
      return /[";,\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + rows.map((r) => r.map(q).join(sep)).join('\r\n');
  };
})();
