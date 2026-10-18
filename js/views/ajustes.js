/* Dulza · Ajustes y pantalla «Más» */
(function () {
  'use strict';
  const D = window.D;
  const { $, $$, esc } = D;
  const S = () => D.data.settings;
  // con el negocio compartido, estas acciones también llegan a la otra persona
  const shared = () => (D.sync && D.sync.linked() ? ' Como el negocio está compartido, el cambio también le llega a la otra persona.' : '');

  /* ---------- Más (teléfono) ---------- */
  D.views.mas = {
    title: 'Más',
    render() {
      const row = (id, icon, label, sub) => `<a class="row row--tap" href="#/${id}"><span class="row__icon">${D.icon(icon)}</span><span class="row__main"><span class="row__title">${label}</span>${sub ? `<span class="row__sub">${sub}</span>` : ''}</span><span class="row__chev">${D.icon('chevR')}</span></a>`;
      return D.ui.page({
        title: 'Más',
        cls: 'page--narrow',
        body: `<div class="more-hero card" data-rise>${`<div style="width:72px;flex:none">${D.art.mascot({ cls: 'mascot--alive', mood: 'hello' })}</div>`}<div><p style="font-weight:750;font-size:1.15rem;letter-spacing:-.02em">${esc(S().name)}</p><p class="muted" style="font-size:.9rem">${esc(S().tagline || 'Ventas y compras')}</p>${D.cloud ? D.cloud.chip() : ''}</div></div>
          <div class="form-title">Catálogo</div>
          <div class="list" data-rise>
            ${row('clientes', 'users', 'Clientes', D.plural(D.data.customers.length, 'cliente', 'clientes'))}
            ${row('productos', 'cupcake', 'Postres', D.plural(D.data.products.length, 'postre', 'postres'))}
            ${row('proveedores', 'truck', 'Proveedores', D.plural(D.data.suppliers.length, 'proveedor', 'proveedores'))}
          </div>
          <div class="form-title">Análisis</div>
          <div class="list" data-rise>${row('reportes', 'chart', 'Reportes', 'Ganancias, mejores clientes y más')}</div>
          <div class="form-title">App</div>
          <div class="list" data-rise>
            ${row('ajustes', 'sliders', 'Ajustes', 'Negocio, factura, apariencia y datos')}
            ${D.install.standalone ? '' : `<button class="row row--tap" data-act="app.install"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Instalar app</span><span class="row__sub">Agrégala a tu pantalla de inicio</span></span><span class="row__chev">${D.icon('chevR')}</span></button>`}
          </div>`,
      });
    },
  };

  /* ---------- Ajustes ---------- */
  const field = (label, key, extra = '') => `<label class="field"><span>${label}</span><input data-change="set" data-key="${key}" value="${esc(S()[key])}" ${extra}></label>`;
  const area = (label, key, rows = 3, cls = '') => `<label class="field field--area"><span>${label}</span><textarea class="${cls}" data-change="set" data-key="${key}" rows="${rows}">${esc(S()[key])}</textarea></label>`;
  const chips = (key) => `<div class="var-chips">${['cliente', 'numero', 'fecha', 'negocio', 'detalle', 'resumen', 'total', 'saldo', 'vence', 'plazo'].map((v) => `<button type="button" data-var="${v}" data-for="${key}">{${v}}</button>`).join('')}</div>`;

  function render() {
    const s = S();
    const storage = D.store.mode === 'idb' ? ['ok', 'Guardado en este dispositivo', 'checkCircle'] : D.store.mode === 'ls' ? ['ok', 'Guardado en este navegador', 'checkCircle'] : ['bad', 'No se puede guardar en este modo (ventana privada)', 'alert'];
    const sample = D.fmtNum(1234.5);
    return D.ui.page({
      title: 'Ajustes',
      cls: 'page--narrow',
      sub: 'Personaliza tu negocio',
      body: `
      <div class="form-title" data-rise>Mi negocio</div>
      <div class="fields" data-rise>
        ${field('Nombre', 'name', 'autocomplete="organization"')}
        ${field('Tu nombre', 'owner', 'autocomplete="name"')}
        ${field('Lema', 'tagline', 'placeholder="Postres hechos con amor"')}
        ${field('WhatsApp del negocio', 'phone', 'type="tel" inputmode="tel" placeholder="Para la factura"')}
        ${field('Dirección', 'address', 'placeholder="Opcional"')}
        <label class="field"><span>País</span><select data-change="set.country"><option value="">Elegir…</option>${D.COUNTRIES.map((c) => `<option value="${esc(c.n)}" ${c.n === s.country ? 'selected' : ''}>${esc(c.n)} (+${c.d})</option>`).join('')}</select></label>
      </div>
      <p class="form-note">El país define el prefijo para WhatsApp (+${esc(s.dial || '…')}), la moneda y el formato de números.</p>

      <div class="form-title" data-rise>Moneda y números</div>
      <div class="fields" data-rise>
        ${field('Símbolo', 'currency', 'maxlength="4"')}
        <label class="field"><span>Decimales</span><select data-change="set" data-key="decimals" data-type="int"><option value="0" ${s.decimals === 0 ? 'selected' : ''}>Sin decimales</option><option value="2" ${s.decimals === 2 ? 'selected' : ''}>2 decimales</option></select></label>
        <label class="field"><span>Formato</span><select data-change="set" data-key="numFmt"><option value="dot" ${s.numFmt === 'dot' ? 'selected' : ''}>1.234,50</option><option value="comma" ${s.numFmt === 'comma' ? 'selected' : ''}>1,234.50</option></select></label>
      </div>
      <p class="form-note">Vista previa: <b>${esc(D.money(1234.5))}</b></p>

      <div class="form-title" data-rise>Facturación</div>
      <div class="fields" data-rise>
        ${field('Prefijo', 'invoicePrefix', 'maxlength="6" autocapitalize="characters"')}
        <label class="field"><span>Próximo número</span><input data-change="set" data-key="nextInvoice" data-type="int" type="number" inputmode="numeric" min="1" value="${D.sale.nextSeq()}"></label>
        <label class="field"><span>Plazo habitual</span><select data-change="set" data-key="defaultTerm" data-type="int">${[[0, 'Contado'], [8, '8 días'], [15, '15 días'], [30, '30 días']].map(([v, l]) => `<option value="${v}" ${s.defaultTerm === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${area('Condiciones al pie de la factura', 'terms', 3)}
      </div>
      <p class="form-note">La numeración es por prefijo. Si dos personas usan la app con los mismos datos, cada una debe tener su propio prefijo (por ejemplo «D-» y «R-») para que los números de factura no se repitan.</p>

      <div class="form-title" data-rise>Mensajes de WhatsApp</div>
      <div class="fields" data-rise>${area('Al enviar una factura', 'waInvoice', 6, 'tpl')}${chips('waInvoice')}${area('Al recordar un cobro', 'waReminder', 6, 'tpl')}${chips('waReminder')}</div>
      <div class="row-flex" style="padding:10px 4px 0"><button class="btn btn--sm btn--plain" data-act="set.tpl.reset">${D.icon('sparkle')}Restaurar mensajes originales</button></div>

      <div class="form-title" data-rise>Apariencia</div>
      <div class="fields" data-rise>
        <div class="field" style="display:block;padding:14px 16px">${D.ui.seg('set.theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']], s.theme)}</div>
        <div class="swatches" role="group" aria-label="Paleta de colores">${D.PALETTES.map((p) => `<button type="button" class="swatch" data-act="set.palette" data-id="${p.id}" aria-pressed="${s.palette === p.id}" aria-label="Paleta ${p.name}"><span class="swatch__dot" style="--a:${p.brand};--b:${p.accent}">${D.icon('check')}</span>${p.name}</button>`).join('')}</div>
        <label class="field"><span>Color principal</span><span class="field__sw"><input type="color" class="color-input" data-change="set.color" data-key="brand" value="${s.brand}" aria-label="Color principal"></span></label>
        <label class="field"><span>Color de acento</span><span class="field__sw"><input type="color" class="color-input" data-change="set.color" data-key="accent" value="${s.accent}" aria-label="Color de acento"></span></label>
      </div>
      <p class="form-note">Cambia la app, la factura y el ícono de golpe. Los colores de texto se ajustan solos para que siempre se lean bien.</p>

      <div class="form-title" data-rise>Logo y mascota</div>
      <div class="fields" data-rise>
        <div class="upload"><span class="upload__thumb">${D.art.logo({ size: 64 })}</span><span class="grow"><b>Logo</b><br><span class="muted" style="font-size:.85rem">Cuadrado, se usa en la factura y el menú</span></span>
          <button class="btn btn--sm btn--tint" data-act="set.pick" data-kind="logo">${s.logo ? 'Cambiar' : 'Subir'}</button>${s.logo ? `<button class="icon-btn icon-btn--sm" data-act="set.reset" data-kind="logo" aria-label="Quitar logo">${D.icon('x')}</button>` : ''}</div>
        <div class="upload"><span class="upload__thumb">${D.art.mascot({ size: 64 })}</span><span class="grow"><b>Mascota</b><br><span class="muted" style="font-size:.85rem">PNG con fondo transparente se ve mejor</span></span>
          <button class="btn btn--sm btn--tint" data-act="set.pick" data-kind="mascot">${s.mascot ? 'Cambiar' : 'Subir'}</button>${s.mascot ? `<button class="icon-btn icon-btn--sm" data-act="set.reset" data-kind="mascot" aria-label="Quitar mascota">${D.icon('x')}</button>` : ''}</div>
      </div>
      <input type="file" id="file-img" accept="image/*" hidden>

      <div class="form-title" data-rise>Seguridad</div>
      <div class="list" data-rise>
        <button class="row row--tap row--noavatar" data-act="auth.change"><span class="row__icon">${D.icon('shield')}</span><span class="row__main"><span class="row__title">Cambiar clave</span><span class="row__sub">${D.auth.usingDefault() ? 'Sigues con la clave por defecto: cámbiala' : 'Usuario: ' + esc(D.auth.user())}</span></span><span class="row__chev">${D.icon('chevR')}</span></button>
        <button class="row row--tap row--noavatar" data-act="auth.lock"><span class="row__icon">${D.icon('lock')}</span><span class="row__main"><span class="row__title">Bloquear ahora</span><span class="row__sub">Vuelve a pedir usuario y clave</span></span></button>
      </div>
      <p class="form-note">La app pide usuario y clave al abrirla y tras 10 minutos sin usarla. Es un candado para este dispositivo: tus datos no se cifran.</p>

      <div class="form-title" data-rise>Datos compartidos</div>
      ${D.cloud.rows()}

      <div class="form-title" data-rise>Respaldo en la nube</div>
      ${D.drive.rows()}

      <div class="form-title" data-rise>Tus datos</div>
      <div class="fields" data-rise>
        <div class="field" style="min-height:58px"><span style="display:flex;align-items:center;gap:10px">${D.icon(storage[2])}${esc(storage[1])}</span></div>
      </div>
      <div class="list" style="margin-top:12px" data-rise>
        <button class="row row--tap row--noavatar" data-act="data.export"><span class="row__icon">${D.icon('download')}</span><span class="row__main"><span class="row__title">Guardar respaldo</span><span class="row__sub">${s.lastBackup ? 'Último: ' + D.fmtDate(s.lastBackup) : 'Descarga un archivo con todos tus datos'}</span></span></button>
        <button class="row row--tap row--noavatar" data-act="data.import"><span class="row__icon">${D.icon('upload')}</span><span class="row__main"><span class="row__title">Restaurar respaldo</span><span class="row__sub">Útil para pasar tus datos a otro dispositivo</span></span></button>
        <button class="row row--tap row--noavatar" data-act="data.demo"><span class="row__icon">${D.icon('sparkle')}</span><span class="row__main"><span class="row__title">Cargar datos de ejemplo</span><span class="row__sub">Para explorar la app</span></span></button>
      </div>
      <input type="file" id="file-json" accept="application/json,.json" hidden>
      <div class="list" style="margin-top:12px" data-rise>
        <button class="row row--tap row--noavatar row--bad" data-act="data.clear"><span class="row__icon">${D.icon('trash')}</span><span class="row__main"><span class="row__title">Borrar ventas, compras y clientes</span><span class="row__sub">Conserva tus ajustes</span></span></button>
      </div>
      <p class="form-note">Tus datos viven en este dispositivo (funcionan sin internet). Para usar Dulza en dos dispositivos, guarda un respaldo y restáuralo en el otro.</p>

      <div class="about" data-rise>${D.art.mascot({ cls: 'mascot--alive', mood: 'hug' })}<b style="color:var(--ink)">${esc(s.name)} · versión ${D.version}</b><span>Hecha con cariño para endulzar tus cuentas.</span>
        ${D.install.standalone ? '' : `<button class="btn btn--sm btn--tint" data-act="app.install">${D.icon('download')}Instalar app</button>`}</div>`,
    });
  }

  D.views.ajustes = { title: 'Ajustes', render };

  /* Cambios inmediatos sin repintar la pantalla (conserva animaciones y foco) */
  const save = (hold = true) => {
    if (hold) D.router.hold(500);
    D.store.commit('settings');
  };

  D.chg.set = (el) => {
    const key = el.dataset.key;
    let v = el.value;
    if (el.dataset.type === 'int') v = Math.max(el.dataset.key === 'nextInvoice' ? 1 : 0, Math.round(+v || 0));
    if (key === 'name' && !v.trim()) v = D.defaults.name;
    S()[key] = typeof v === 'string' && key !== 'terms' && !key.startsWith('wa') ? v.trim() : v;
    save(!['decimals', 'numFmt', 'currency'].includes(key));
  };
  D.chg['set.country'] = (el) => {
    const c = D.COUNTRIES.find((x) => x.n === el.value);
    if (!c) return;
    Object.assign(S(), { country: c.n, dial: c.d, currency: c.c, decimals: c.dec, numFmt: c.f });
    save(false);
  };
  D.seg['set.theme'] = (v) => {
    S().theme = v;
    save();
    D.theme.apply();
  };
  D.act['set.palette'] = (el) => {
    const p = D.PALETTES.find((x) => x.id === el.dataset.id);
    if (!p) return;
    Object.assign(S(), { palette: p.id, brand: p.brand, accent: p.accent });
    $$('.swatch').forEach((b) => b.setAttribute('aria-pressed', b === el));
    $$('.color-input').forEach((i) => (i.value = S()[i.dataset.key]));
    D.theme.apply();
    save();
  };
  D.chg['set.color'] = (el) => {
    S()[el.dataset.key] = el.value;
    S().palette = 'custom';
    $$('.swatch').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    D.theme.apply();
    save();
  };
  document.addEventListener('input', (e) => {
    const el = e.target.closest && e.target.closest('[data-change="set.color"]');
    if (!el) return;
    S()[el.dataset.key] = el.value; // vista previa en vivo mientras se arrastra el selector
    D.theme.apply();
  });
  document.addEventListener('focusout', (e) => {
    const ta = e.target;
    if (ta && ta.matches && ta.matches('textarea.tpl')) {
      ta.dataset.at = ta.selectionStart;
      ta.dataset.to = ta.selectionEnd;
    }
  });
  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-var]');
    if (!v) return;
    const ta = $(`[data-key="${v.dataset.for}"]`);
    if (!ta) return;
    // se inserta donde estaba el cursor al salir del cuadro; si nunca se tocó, al final (antes iba al principio y desordenaba el mensaje)
    const at = ta.dataset.at != null ? +ta.dataset.at : ta.value.length;
    const to = ta.dataset.to != null ? +ta.dataset.to : at;
    ta.value = ta.value.slice(0, at) + `{${v.dataset.var}}` + ta.value.slice(to);
    ta.focus();
    ta.setSelectionRange(at + v.dataset.var.length + 2, at + v.dataset.var.length + 2);
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  });
  D.act['set.tpl.reset'] = () => {
    Object.assign(S(), { waInvoice: D.WA_INVOICE, waReminder: D.WA_REMINDER });
    D.store.commit('settings');
    D.toast('Mensajes restaurados');
  };

  /* Logo y mascota: se reducen a 512 px antes de guardarse */
  let imgKind = 'logo';
  D.act['set.pick'] = (el) => {
    imgKind = el.dataset.kind;
    $('#file-img').click();
  };
  D.act['set.reset'] = (el) => {
    S()[el.dataset.kind] = '';
    D.store.commit('settings');
  };
  document.addEventListener('change', (e) => {
    if (e.target.id === 'file-img' && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        S()[imgKind] = c.toDataURL('image/png');
        D.store.commit('settings');
        D.toast(imgKind === 'logo' ? 'Logo actualizado' : 'Mascota actualizada');
      };
      img.onerror = () => D.toast('No pude leer esa imagen', { tone: 'bad' });
      img.src = url;
    }
    if (e.target.id === 'file-json' && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      file.text().then(async (txt) => {
        try {
          JSON.parse(txt);
        } catch (err) {
          return D.alert('Archivo no válido', 'Ese archivo no es un respaldo de Dulza.');
        }
        if (await D.confirm({ title: '¿Restaurar este respaldo?', message: 'Reemplazará todos los datos actuales de este dispositivo.' + shared(), ok: 'Restaurar', danger: true })) {
          try {
            D.store.importJSON(txt);
            D.theme.apply();
            D.toast('Respaldo restaurado');
          } catch (err) {
            D.alert('No se pudo restaurar', err.message);
          }
        }
      });
    }
  });

  D.act['data.export'] = () => {
    D.download(new Blob([D.store.exportJSON()], { type: 'application/json' }), `dulza-respaldo-${D.today()}.json`);
    S().lastBackup = D.today();
    D.store.commit('settings');
    D.toast('Respaldo guardado', { icon: 'download' });
  };
  D.act['data.import'] = () => $('#file-json').click();
  D.act['data.demo'] = async () => {
    const has = D.data.sales.length || D.data.customers.length;
    if (has && !(await D.confirm({ title: '¿Cargar datos de ejemplo?', message: 'Reemplazará tus ventas, compras, clientes y postres actuales.' + shared(), ok: 'Reemplazar', danger: true }))) return;
    D.demo.load();
    D.toast('Datos de ejemplo cargados', { icon: 'sparkle' });
  };
  D.act['data.clear'] = async () => {
    if (await D.confirm({ title: '¿Borrar todos los datos?', message: 'Se eliminarán ventas, compras, clientes, postres y proveedores. Tus ajustes se conservan. Esto no se puede deshacer.' + shared(), ok: 'Borrar todo', danger: true })) {
      D.demo.clear();
      D.toast('Datos borrados', { tone: 'info', icon: 'trash' });
    }
  };
})();
