/* Dulza · bienvenida inicial */
(function () {
  'use strict';
  const D = window.D;
  const { $, esc } = D;

  const guessCountry = () => {
    const region = ((navigator.language || '').split('-')[1] || '').toUpperCase();
    const map = { CO: 'Colombia', MX: 'México', PE: 'Perú', AR: 'Argentina', CL: 'Chile', EC: 'Ecuador', VE: 'Venezuela', BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay', PA: 'Panamá', CR: 'Costa Rica', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua', DO: 'Rep. Dominicana', PR: 'Puerto Rico', ES: 'España', US: 'Estados Unidos' };
    return map[region] || 'Colombia';
  };

  D.onboarding = {
    open() {
      const S = D.data.settings;
      const country = S.country || guessCountry();
      const sh = D.sheet.open({
        title: '¡Bienvenida!',
        left: false,
        dismissible: false,
        size: 'large',
        form: false,
        body: `<div class="welcome">
            <div style="width:min(250px,100%)"><img class="empty__sticker mascot--alive" src="${D.gpt.url(D.gpt.logo)}" alt="Dulza" decoding="async"></div>
            <h2 class="welcome__title">Tu negocio de postres,<br>en orden</h2>
            <p>Registra ventas, compras y cobros. Envía facturas por WhatsApp y mira cuánto ganas. Empecemos con unos datos.</p>
          </div>
          <div class="fields">
            <label class="field"><span>Nombre del negocio</span><input name="name" value="${esc(S.name)}" autocomplete="organization" autocapitalize="words" data-autofocus></label>
            <label class="field"><span>Tu nombre</span><input name="owner" value="${esc(S.owner)}" placeholder="Opcional" autocomplete="name" autocapitalize="words"></label>
            <label class="field"><span>País</span><select name="country">${D.COUNTRIES.map((c) => `<option ${c.n === country ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select></label>
            <label class="field"><span>WhatsApp del negocio</span><input name="phone" type="tel" inputmode="tel" value="${esc(S.phone)}" placeholder="Opcional" autocomplete="tel"></label>
          </div>
          <p class="form-note">Con tu país configuramos moneda, formato de números y el prefijo de WhatsApp. Todo se puede cambiar después en Ajustes.</p>`,
        footer: `<button class="btn" data-ob="go">Empezar</button><button class="btn btn--tint" data-ob="demo">${D.icon('sparkle')}Explorar con datos de ejemplo</button>`,
      });
      const finish = (demo) => {
        const v = D.ui.read(sh.body);
        const c = D.COUNTRIES.find((x) => x.n === v.country) || D.COUNTRIES[0];
        Object.assign(S, { name: v.name || D.defaults.name, owner: v.owner, phone: v.phone, country: c.n, dial: c.d, currency: c.c, decimals: c.dec, numFmt: c.f, onboarded: true });
        D.store.commit('settings');
        if (demo) D.demo.load();
        sh.close('force');
        D.toast(demo ? 'Datos de ejemplo cargados' : '¡Todo listo! Registra tu primera venta', { icon: 'sparkle' });
      };
      sh.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ob]');
        if (b) finish(b.dataset.ob === 'demo');
      });
    },
  };
})();
