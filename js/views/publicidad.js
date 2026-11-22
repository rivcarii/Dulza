/* Dulza · Publicidad: piezas listas para estados de WhatsApp, historias de Instagram y Facebook, publicaciones y volantes.
   Las imágenes están en assets/publicidad/ (grande) y assets/publicidad/mini/ (miniatura de la galería).
   «Compartir» abre el menú del teléfono con el archivo (WhatsApp → Mi estado, Instagram → Tu historia, Facebook…);
   donde no se puede compartir archivos (computadora) se descarga. */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const BASE = 'assets/publicidad/';

  const FMT = {
    historia: { label: 'Historia y estado', ratio: '9 / 16', tip: 'WhatsApp → «Mi estado» · Instagram y Facebook → «Tu historia»' },
    post: { label: 'Publicación', ratio: '1 / 1', tip: 'Instagram y Facebook → publicación en el muro · WhatsApp → chats o grupos' },
    volante: { label: 'Volante', ratio: '1240 / 1754', tip: 'Para imprimir o mandar por chat' },
  };

  // id = nombre del archivo (sin .jpg). Si cambian los precios, se vuelven a exportar las piezas con precio.
  const PIEZAS = [
    { id: 'historia-torta-chocolate', fmt: 'historia', title: 'Torta de chocolate', tag: 'Postre', text: '¡Antójate de nuestra torta de chocolate! 🍫 Pídela por WhatsApp.' },
    { id: 'historia-flan', fmt: 'historia', title: 'Flan', tag: 'Postre', text: '¡Antójate de nuestro flan de caramelo! 🍮 Pídelo por WhatsApp.' },
    { id: 'historia-napolitano', fmt: 'historia', title: 'Napolitano', tag: 'Postre', text: '¡Antójate de nuestro napolitano! 🍓 Pídelo por WhatsApp.' },
    { id: 'historia-menu', fmt: 'historia', title: 'Nuestro menú', tag: 'Menú', text: 'Postres hechos con amor 💖 Pide por WhatsApp.' },
    { id: 'historia-navidad', fmt: 'historia', title: 'Feliz Navidad', tag: 'Navidad', text: '¡Endulza tu Navidad con Dulza! 🎄 Encarga tus postres por WhatsApp.' },
    { id: 'post-torta-chocolate', fmt: 'post', title: 'Torta de chocolate', tag: 'Postre', text: '¡Antójate de nuestra torta de chocolate! 🍫 Pídela por WhatsApp.' },
    { id: 'post-flan', fmt: 'post', title: 'Flan', tag: 'Postre', text: '¡Antójate de nuestro flan de caramelo! 🍮 Pídelo por WhatsApp.' },
    { id: 'post-napolitano', fmt: 'post', title: 'Napolitano', tag: 'Postre', text: '¡Antójate de nuestro napolitano! 🍓 Pídelo por WhatsApp.' },
    { id: 'post-menu', fmt: 'post', title: 'Nuestro menú', tag: 'Menú', text: 'Postres hechos con amor 💖 Pide por WhatsApp.' },
    { id: 'post-navidad', fmt: 'post', title: 'Feliz Navidad', tag: 'Navidad', text: '¡Endulza tu Navidad con Dulza! 🎄 Encarga tus postres por WhatsApp.' },
    { id: 'volante-menu', fmt: 'volante', title: 'Volante del menú', tag: 'Menú', text: 'Postres hechos con amor 💖 Pide por WhatsApp.' },
  ];
  D.PUBLICIDAD = PIEZAS;

  const st = (D.ui.state.publicidad = { fmt: '' });
  const find = (id) => PIEZAS.find((p) => p.id === id);
  const big = (p) => `${BASE}${p.id}.jpg`;
  const mini = (p) => `${BASE}mini/${p.id}.jpg`;

  /* ---------- Archivo: se pide al tocar (o al abrir la vista previa) y se guarda en memoria ----------
     Compartir necesita que el toque sea reciente; por eso el archivo se empieza a bajar desde que el dedo toca el botón. */
  const files = new Map();
  function fileOf(p) {
    if (!files.has(p.id)) {
      const job = fetch(big(p))
        .then((r) => {
          if (!r.ok) throw new Error('No se pudo cargar la imagen');
          return r.blob();
        })
        .then((b) => new File([b], `dulza-${p.id}.jpg`, { type: b.type || 'image/jpeg' }))
        .catch((e) => {
          files.delete(p.id);
          throw e;
        });
      files.set(p.id, job);
    }
    return files.get(p.id);
  }

  function save(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    D.toast('Imagen descargada');
  }

  async function share(p, btn) {
    btn && btn.classList.add('is-busy');
    try {
      const file = await fileOf(p);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: p.title, text: p.text });
        } catch (e) {
          if (e && e.name === 'AbortError') return; // la persona cerró el menú
          save(file); // el navegador no dejó compartir: se descarga
        }
      } else save(file);
    } catch (e) {
      D.toast('No pude abrir la imagen. Revisa tu internet e intenta de nuevo.', { tone: 'bad' });
    } finally {
      btn && btn.classList.remove('is-busy');
    }
  }

  async function download(p, btn) {
    btn && btn.classList.add('is-busy');
    try {
      save(await fileOf(p));
    } catch (e) {
      D.toast('No pude descargar la imagen. Revisa tu internet e intenta de nuevo.', { tone: 'bad' });
    } finally {
      btn && btn.classList.remove('is-busy');
    }
  }

  // Empieza a bajar el archivo apenas el dedo toca «Compartir» o «Descargar»
  document.addEventListener(
    'pointerdown',
    (e) => {
      const b = e.target.closest('[data-act="ad.share"],[data-act="ad.download"]');
      const p = b && find(b.dataset.id);
      if (p) fileOf(p).catch(() => {});
    },
    { passive: true }
  );

  /* ---------- Galería ---------- */
  function gridHtml() {
    const list = PIEZAS.filter((p) => !st.fmt || p.fmt === st.fmt);
    return `<div class="ad-grid">${list
      .map(
        (p) => `<article class="ad card" style="--ratio:${FMT[p.fmt].ratio}">
          <button type="button" class="ad__thumb" data-act="ad.open" data-id="${p.id}" aria-label="Ver ${esc(p.title)} en grande">
            <img src="${mini(p)}" alt="" loading="lazy" decoding="async" draggable="false"></button>
          <div class="ad__info"><span class="ad__title">${esc(p.title)}</span><span class="ad__fmt">${esc(FMT[p.fmt].label)}</span></div>
          <div class="ad__btns">
            <button type="button" class="btn btn--sm ad__share" data-act="ad.share" data-id="${p.id}">${D.icon('share')}<span>Compartir</span></button>
            <button type="button" class="icon-btn ad__dl" data-act="ad.download" data-id="${p.id}" aria-label="Descargar ${esc(p.title)}">${D.icon('download')}</button>
          </div>
        </article>`
      )
      .join('')}</div>`;
  }

  D.views.publicidad = {
    title: 'Publicidad',
    render() {
      const opts = [['', 'Todas'], ['historia', 'Historias y estados'], ['post', 'Publicaciones'], ['volante', 'Volantes']];
      return D.ui.page({
        title: 'Publicidad',
        sub: 'Imágenes listas para tus estados, historias y redes',
        body: `<div class="toolbar" data-rise><div class="chips-row" id="ad-fmts">${opts
          .map(([v, l]) => `<button type="button" class="filter-chip" data-adfmt="${v}" aria-pressed="${v === st.fmt}">${esc(l)}</button>`)
          .join('')}</div></div>
          <p class="ad-hint muted" data-rise>${D.icon('sparkle')}<span>Toca <b>Compartir</b> y elige WhatsApp, Instagram o Facebook. Para un estado o historia usa las verticales.</span></p>
          <div id="ad-grid" data-rise>${gridHtml()}</div>`,
      });
    },
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-adfmt]');
    if (!b) return;
    st.fmt = b.dataset.adfmt;
    $$('#ad-fmts .filter-chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#ad-grid').innerHTML = gridHtml();
  });

  D.act['ad.share'] = (el) => {
    const p = find(el.dataset.id);
    p && share(p, el);
  };
  D.act['ad.download'] = (el) => {
    const p = find(el.dataset.id);
    p && download(p, el);
  };

  /* ---------- Vista previa en grande ---------- */
  D.act['ad.open'] = (el) => {
    const p = find(el.dataset.id);
    if (!p) return;
    fileOf(p).catch(() => {});
    D.sheet.open({
      title: p.title,
      left: false,
      right: { label: 'Listo', cls: 'btn--ghost', onClick: (c) => c.close() },
      body: `<div class="stack pad ad-preview">
          <img class="ad-preview__img" src="${big(p)}" alt="${esc(p.title)}" style="aspect-ratio:${FMT[p.fmt].ratio}" decoding="async">
          <p class="muted center ad-preview__tip">${esc(FMT[p.fmt].tip)}</p>
        </div>`,
      footer: `<button type="button" class="btn btn--plain" data-act="ad.download" data-id="${p.id}">${D.icon('download')}Descargar</button>
        <button type="button" class="btn" data-act="ad.share" data-id="${p.id}">${D.icon('share')}Compartir</button>`,
    });
  };
})();
