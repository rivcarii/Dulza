/* Herramienta de desarrollo: dibuja las letras «Dulza» y los logos en canvas (con la tipografía real cargada)
   y los guarda como PNG transparentes en assets/brand/. */
(function () {
  const ROT = [-3, 2, -2, 3, -1], YOFF = [0, 0.02, -0.012, 0.016, 0], WID = [0.731, 0.678, 0.34, 0.576, 0.664];
  const TEXT = 'Dulza';
  const FLAV = () => D.art.FLAVORS;

  function glyphs(ctx, x, y, fs, fn) {
    let cum = 0;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(x + cum * fs, y + YOFF[i] * fs);
      ctx.rotate((ROT[i] * Math.PI) / 180);
      ctx.font = `${fs}px "Titan One"`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      fn(TEXT[i], i);
      ctx.restore();
      cum += WID[i];
    }
  }

  /* Dibuja las letras con baseline en (x, y). `s` es la escala del canvas. */
  function wordmark(ctx, x, y, fs, s, o = {}) {
    const [l, b, d] = FLAV()[o.flavor || 'fresa'];
    const mono = o.mono, rev = o.reverse;
    const edge = rev ? o.edge || d : d;
    const asc = 0.78 * fs;
    ctx.lineJoin = 'round';
    if (!mono) {
      for (let k = 3; k >= 0; k--) {
        ctx.save();
        if (k === 3) {
          ctx.shadowColor = `rgba(0,0,0,${rev ? 0.2 : 0.3})`;
          ctx.shadowBlur = 0.07 * fs * s;
          ctx.shadowOffsetY = 0.05 * fs * s;
        }
        glyphs(ctx, x, y + k * 0.026 * fs, fs, (ch) => {
          ctx.lineWidth = 0.1 * fs;
          ctx.strokeStyle = edge;
          ctx.fillStyle = edge;
          ctx.strokeText(ch, 0, 0);
          ctx.fillText(ch, 0, 0);
        });
        ctx.restore();
      }
    }
    // relleno
    glyphs(ctx, x, y, fs, (ch) => {
      if (mono) ctx.fillStyle = mono;
      else if (rev) ctx.fillStyle = '#ffffff';
      else {
        const g = ctx.createLinearGradient(0, -asc, 0, 0);
        g.addColorStop(0, l);
        g.addColorStop(0.42, b);
        g.addColorStop(1, d);
        ctx.fillStyle = g;
      }
      ctx.fillText(ch, 0, 0);
    });
    if (mono || rev) return;
    // rayas y brillo de caramelo, recortados a las letras
    const mask = () => {
      const off = document.createElement('canvas');
      off.width = ctx.canvas.width;
      off.height = ctx.canvas.height;
      const c = off.getContext('2d');
      c.setTransform(ctx.getTransform());
      glyphs(c, x, y, fs, (ch) => {
        c.fillStyle = '#000';
        c.fillText(ch, 0, 0);
      });
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-in';
      return { off, c };
    };
    {
      const { off, c } = mask();
      const per = 0.17 * fs * s;
      const pc = document.createElement('canvas');
      pc.width = pc.height = Math.max(4, Math.round(per));
      const pctx = pc.getContext('2d');
      pctx.fillStyle = 'rgba(255,255,255,.4)';
      pctx.fillRect(0, 0, 0.07 * fs * s, pc.height);
      const pat = c.createPattern(pc, 'repeat');
      pat.setTransform(new DOMMatrix().rotate(-35));
      c.fillStyle = pat;
      c.fillRect(0, 0, off.width, off.height);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }
    {
      const { off, c } = mask();
      const top = (y - asc) * s, bot = y * s;
      const g = c.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, 'rgba(255,255,255,.72)');
      g.addColorStop(0.06, 'rgba(255,255,255,.72)');
      g.addColorStop(0.061, 'rgba(255,255,255,.22)');
      g.addColorStop(0.34, 'rgba(255,255,255,.22)');
      g.addColorStop(0.4, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, off.width, off.height);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }
  }

  const toBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  const save = async (name, canvas) => {
    const r = await fetch('/__save?name=assets/brand/' + name, { method: 'POST', body: await toBlob(canvas) });
    return name + ': ' + (await r.text());
  };
  D.art.toImage = D.art.toImage || ((svg) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }));
  const svgImg = async (svg, w, h) => D.art.toImage(svg.replace(/^<svg /, `<svg width="${w}" height="${h}" `));

  async function ready() {
    await document.fonts.load('100px "Titan One"');
    await document.fonts.load('800 30px Nunito');
  }

  /* Solo las letras */
  async function letras(o, s = 3) {
    const fs = 150;
    const vb = { x: -0.08 * fs, y: -0.88 * fs, w: 2.989 * fs + 0.16 * fs, h: 1.07 * fs };
    const c = document.createElement('canvas');
    c.width = Math.round(vb.w * s);
    c.height = Math.round(vb.h * s);
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    wordmark(ctx, -vb.x, -vb.y, fs, s, o);
    return c;
  }

  async function vertical(o, brand, s = 2) {
    const c = document.createElement('canvas');
    c.width = 900 * s;
    c.height = 940 * s;
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    const bust = await svgImg(D.art.character({ view: 'bust', brand, badge: false, wordmark: false }), 600, 750);
    ctx.drawImage(bust, 150, 0, 600, 750);
    const fs = 150 * (640 / (3.149 * 150));
    const wmw = 2.989 * fs;
    wordmark(ctx, 450 - wmw / 2, 791, fs, s, o);
    ctx.font = '800 34px Nunito';
    ctx.fillStyle = o.ink || '#3a1230';
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = '1.5px'; } catch (e) {}
    ctx.fillText('POSTRES HECHOS CON AMOR', 450, 906);
    return c;
  }

  async function horizontal(o, brand, s = 2) {
    const c = document.createElement('canvas');
    c.width = 940 * s;
    c.height = 268 * s;
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    const iso = await svgImg(D.art.isotipo({ brand }), 240, 240);
    ctx.drawImage(iso, 10, 10, 240, 240);
    const fs = 150 * (610 / (3.149 * 150));
    wordmark(ctx, 307.5, 176.5, fs, s, o);
    ctx.font = '800 27px Nunito';
    ctx.fillStyle = o.ink || '#3a1230';
    ctx.textAlign = 'left';
    try { ctx.letterSpacing = '1.2px'; } catch (e) {}
    ctx.fillText('POSTRES HECHOS CON AMOR', 296, 250);
    return c;
  }

  window.exportarLogos = async function (brand = '#ff3d8b') {
    await ready();
    const out = [];
    out.push(await save('dulza-letras.png', await letras({})));
    out.push(await save('dulza-letras-mora.png', await letras({ flavor: 'mora' })));
    out.push(await save('dulza-letras-mono.png', await letras({ mono: '#3a1230' })));
    out.push(await save('dulza-letras-blanco.png', await letras({ reverse: true, edge: '#c4165f' })));
    out.push(await save('dulza-logo-vertical.png', await vertical({}, brand)));
    out.push(await save('dulza-logo-vertical-blanco.png', await vertical({ reverse: true, edge: '#8f4dff', ink: '#ffffff' }, brand)));
    out.push(await save('dulza-logo-horizontal.png', await horizontal({}, brand)));
    out.push(await save('dulza-logo-horizontal-blanco.png', await horizontal({ reverse: true, edge: '#c4165f', ink: '#ffffff' }, brand)));
    return out.join('\n');
  };
})();
