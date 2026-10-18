/* Dulza · sonidos de dinero
   Se generan con Web Audio (sin archivos): una «caja registradora» al vender y monedas al cobrar.
   Suenan solo tras un toque de la persona, nunca solos, y se pueden apagar en Ajustes → Sonido. */
(function () {
  'use strict';
  const D = window.D;
  let ctx = null;

  const on = () => !D.data || !D.data.settings || D.data.settings.sound !== false;
  const audio = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  // los navegadores solo dejan sonar tras un gesto: se prepara el audio con el primer toque
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (on()) audio(); }, { capture: true, passive: true }));

  /* Una nota de campana/moneda: fundamental + armónicos metálicos que caen más rápido */
  function bell(c, t, freq, { gain = 0.22, dur = 0.7, bright = 1 } = {}) {
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(c.destination);
    [[1, 1, 'sine'], [2.76, 0.42 * bright, 'sine'], [5.4, 0.2 * bright, 'sine'], [8.93, 0.08 * bright, 'sine']].forEach(([mul, amp, type], i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.value = freq * mul;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.9));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  /* El «cha» seco del cajón: ruido corto filtrado */
  function drawer(c, t) {
    const n = Math.floor(c.sampleRate * 0.07), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.value = 2600;
    f.Q.value = 0.9;
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  const play = (fn) => {
    if (!on()) return;
    const c = audio();
    if (!c) return;
    try { fn(c, c.currentTime + 0.02); } catch (e) {}
  };

  D.sound = {
    /* Venta registrada: «¡cha-ching!» */
    sale() {
      play((c, t) => {
        drawer(c, t);
        bell(c, t + 0.07, 1568, { gain: 0.2, dur: 0.55 }); // sol
        bell(c, t + 0.19, 2093, { gain: 0.22, dur: 0.95 }); // do agudo
      });
    },
    /* Cobro recibido: monedas que suben; si la factura queda saldada, cierra con un acorde */
    coin(settled) {
      play((c, t) => {
        bell(c, t, 1319, { gain: 0.17, dur: 0.38, bright: 1.3 }); // mi
        bell(c, t + 0.09, 1760, { gain: 0.19, dur: 0.5, bright: 1.3 }); // la
        if (settled) {
          bell(c, t + 0.2, 2217, { gain: 0.17, dur: 0.6 }); // do#
          bell(c, t + 0.2, 2637, { gain: 0.15, dur: 0.9 }); // mi agudo
        }
      });
    },
    // pequeño toque para probarlo desde Ajustes
    test() {
      D.sound.sale();
    },
  };

  D.chg['set.sound'] = (el) => {
    D.data.settings.sound = !!el.checked;
    D.router.hold(500);
    D.store.commit('settings');
    if (el.checked) D.sound.test();
  };
})();
