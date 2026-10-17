/* Dulza · nube compartida (Firebase: acceso con cuenta + Cloud Firestore)
   Conecta el motor de sincronización (js/sync.js) con Firestore y valida el acceso con las cuentas de Firebase.
   - Las cuentas se crean a mano en la consola de Firebase (el registro abierto está desactivado). El «usuario» de la app
     es la parte de antes de la arroba: `anaparr` entra como anaparr@dulza.app (también se acepta un correo completo).
   - Los datos viven en negocios/dulza/{coleccion}/{id}. Las reglas de Firestore solo dejan entrar a esas cuentas.
   - El SDK de Firebase se carga desde gstatic solo cuando hace falta (el service worker lo guarda para el modo sin internet).
   - La app sigue siendo «local primero»: si no hay internet, se entra con la clave que ya se usó en el dispositivo
     (se guarda solo su huella) y los cambios se suben cuando vuelve la conexión.
   La configuración de abajo es pública por diseño: lo que protege los datos son las reglas de Firestore y el acceso por cuenta. */
(function () {
  'use strict';
  const D = window.D;
  const { esc } = D;

  const CONFIG = {
    apiKey: 'AIzaSyAbUDO2ldn8NxOQZ771O81GvKX0AOW5Jpc',
    authDomain: 'dulza-ab94d.firebaseapp.com',
    projectId: 'dulza-ab94d',
    storageBucket: 'dulza-ab94d.firebasestorage.app',
    messagingSenderId: '1066581064437',
    appId: '1:1066581064437:web:c35336c2fed59539e723bc',
  };
  const VER = '10.14.1';
  const SDK = ['app', 'auth', 'firestore'].map((n) => `https://www.gstatic.com/firebasejs/${VER}/firebase-${n}-compat.js`);
  const BIZ = 'dulza';
  const DOMAIN = 'dulza.app';
  const KEY = 'dulza-cloud';

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const norm = (u) => String(u || '').trim().toLowerCase();
  const emailOf = (u) => (String(u).includes('@') ? String(u).trim().toLowerCase() : norm(u) + '@' + DOMAIN);

  /* ---------- SDK ---------- */
  let auth = null, db = null, booting = null;
  const script = (src) =>
    new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res();
      s.onerror = () => rej(Object.assign(new Error('No pude cargar Firebase. Revisa tu internet.'), { network: true }));
      document.head.appendChild(s);
    });
  function init() {
    if (booting) return booting;
    booting = (async () => {
      if (!(window.firebase && firebase.firestore && firebase.auth)) for (const src of SDK) await script(src); // en orden: app, auth, firestore
      if (!firebase.apps.length) firebase.initializeApp(CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
    })().catch((e) => { booting = null; throw e; });
    return booting;
  }
  const biz = () => db.collection('negocios').doc(BIZ);
  const firstUser = () => new Promise((res) => { const off = auth.onAuthStateChanged((u) => { off(); res(u); }); });

  /* ---------- Errores en cristiano ---------- */
  function wrap(e) {
    const code = (e && e.code) || '';
    const net = !!(e && e.network) || code === 'auth/network-request-failed' || navigator.onLine === false;
    const msg = {
      'auth/invalid-credential': 'Usuario o clave incorrectos.',
      'auth/wrong-password': 'Usuario o clave incorrectos.',
      'auth/user-not-found': 'Usuario o clave incorrectos.',
      'auth/invalid-email': 'Usuario o clave incorrectos.',
      'auth/user-disabled': 'Esta cuenta está desactivada.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/requires-recent-login': 'Vuelve a escribir tu clave actual.',
      'auth/weak-password': 'La clave nueva es muy débil.',
    }[code];
    const x = new Error(net ? 'Sin conexión con la nube.' : msg || (e && e.message) || 'No se pudo completar.');
    x.network = net;
    x.userMessage = x.message;
    x.code = code;
    return x;
  }

  /* ---------- Cuenta ---------- */
  async function signIn(user, pass) {
    try {
      await init();
      await auth.signInWithEmailAndPassword(emailOf(user), String(pass || ''));
    } catch (e) {
      throw wrap(e);
    }
    const s = read();
    s.linked = true;
    s.user = norm(user).split('@')[0];
    write(s);
  }
  async function changePassword(cur, nueva) {
    try {
      await init();
      const u = (await firstUser()) || auth.currentUser;
      if (!u) throw Object.assign(new Error('Inicia sesión en la nube primero.'), { code: 'auth/no-session' });
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, cur));
      await u.updatePassword(nueva);
    } catch (e) {
      throw wrap(e);
    }
  }
  async function signOut() {
    try { await init(); await auth.signOut(); } catch (e) {}
  }

  /* ---------- Adaptador de Firestore para el motor de sincronización ---------- */
  const adapter = {
    name: 'firebase',
    async open() {
      await init();
      const u = await firstUser();
      if (!u) throw Object.assign(new Error('No hay sesión en la nube. Entra con tu usuario y tu clave.'), { code: 'auth/no-session' });
    },
    async hasData() {
      const d = await biz().collection('settings').doc('main').get();
      return d.exists;
    },
    subscribe(col, onDocs, onError) {
      return biz().collection(col).onSnapshot(
        (snap) => {
          const docs = [];
          snap.docChanges().forEach((ch) => { if (ch.type !== 'removed') docs.push(Object.assign({}, ch.doc.data(), { id: ch.doc.id })); });
          onDocs(docs);
        },
        (err) => onError(err)
      );
    },
    write(col, doc) {
      return biz().collection(col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc)));
    },
    close() {},
  };

  /* ---------- Estado visible ---------- */
  const TEXT = {
    off: 'Sin conectar',
    connecting: 'Conectando…',
    online: 'Sincronizado',
    offline: 'Sin conexión',
    error: 'Error de sincronización',
  };
  function statusText() {
    const s = D.sync.status, n = D.sync.pendingCount();
    if (s === 'online') return n ? `Subiendo ${n} ${n === 1 ? 'cambio' : 'cambios'}…` : 'Sincronizado';
    if (s === 'offline') return n ? `Sin conexión · ${n} por subir` : 'Sin conexión';
    return TEXT[s] || '';
  }
  const chip = () => `<div class="sync-chip" data-sync-chip data-s="${D.sync.status}" role="status"><i aria-hidden="true"></i><span>${esc(statusText())}</span></div>`;
  function paint() {
    document.querySelectorAll('[data-sync-chip]').forEach((el) => {
      el.dataset.s = D.sync.status;
      const span = el.querySelector('span');
      if (span) span.textContent = statusText();
    });
    document.querySelectorAll('[data-sync-title]').forEach((el) => (el.textContent = statusText()));
  }
  D.sync.on(paint);

  /* ---------- Elegir qué hacer la primera vez ---------- */
  function choose(title, text, options) {
    return new Promise((resolve) => {
      let picked = null;
      const sh = D.sheet.open({
        title,
        left: false,
        size: 'large',
        right: { label: 'Cancelar', cls: 'btn--ghost', onClick: (c) => c.close() },
        body: `<p class="form-note" style="margin-top:0">${esc(text)}</p><div class="list">${options
          .map((o, i) => `<button type="button" class="row row--tap ${o.tone === 'bad' ? 'row--bad' : ''}" data-i="${i}"><span class="row__icon">${D.icon(o.icon || 'chevR')}</span><span class="row__main"><span class="row__title">${esc(o.label)}</span><span class="row__sub">${esc(o.sub)}</span></span></button>`)
          .join('')}</div>`,
        onClose: () => resolve(picked),
      });
      sh.el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (!b) return;
        picked = options[+b.dataset.i].id;
        sh.close('pick');
      });
    });
  }

  /* Cada persona usa su propia serie de facturas para que los números no se repitan */
  function assignPrefix() {
    const S = D.data.settings, u = read().user || '';
    if (u && u !== 'anaparr' && S.invoicePrefix === D.defaults.invoicePrefix) {
      S.invoicePrefix = u[0].toUpperCase() + '-';
      S.nextInvoice = 1;
      D.store.commit('settings');
      setTimeout(() => D.toast(`Tus facturas llevarán el prefijo ${S.invoicePrefix}`, { tone: 'info' }), 1500);
    }
  }

  /* ---------- Conectar este dispositivo ---------- */
  let starting = null;
  function start() {
    if (starting) return starting;
    starting = (async () => {
      try {
        await adapter.open();
        if (!D.sync.linked()) {
          const remote = await adapter.hasData();
          if (remote && D.sync.hasLocalData()) {
            const pick = await choose('Ya hay datos compartidos', 'La otra persona ya guardó datos del negocio. ¿Qué hacemos con los que hay en este dispositivo?', [
              { id: 'shared', icon: 'download', label: 'Usar los datos compartidos', sub: 'Descarto los de este dispositivo y bajo los de la nube (lo habitual en un dispositivo nuevo)' },
              { id: 'merge', icon: 'upload', label: 'Unir los dos', sub: 'Se quedan los de aquí y los compartidos; puede haber repetidos si ya eran los mismos' },
            ]);
            if (!pick) {
              D.toast('No se conectó con la nube', { tone: 'info', icon: 'cloud' });
              return;
            }
            if (pick === 'shared') D.sync.discardLocal();
          }
          assignPrefix();
        }
        await D.sync.start(adapter);
      } catch (e) {
        const x = e && e.userMessage ? e : wrap(e);
        D.toast(x.network ? 'Sin conexión: los cambios se subirán cuando vuelva internet' : x.userMessage, { tone: x.network ? 'info' : 'bad', icon: 'cloud' });
      } finally {
        starting = null;
      }
    })();
    return starting;
  }
  const boot = () => { if (read().linked) return start(); };

  /* ---------- Acciones de Ajustes → Datos compartidos ---------- */
  D.act['cloud.sync'] = async () => {
    if (D.sync.status === 'off') await start();
    else await D.sync.push();
    D.toast(D.sync.status === 'online' && !D.sync.pendingCount() ? 'Todo sincronizado' : statusText(), { tone: 'info', icon: 'cloud' });
  };
  D.act['cloud.login'] = () => {
    const sh = D.sheet.open({
      title: 'Conectar con la nube',
      form: true,
      size: 'large',
      right: { label: 'Conectar', onClick: () => go() },
      body: `<div class="fields">
          <label class="field"><span>Usuario</span><input name="user" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(read().user || '')}" data-autofocus></label>
          <label class="field"><span>Clave</span><input name="pass" type="password" autocomplete="current-password"></label>
        </div>
        <p class="lock__error" id="cl-err" role="alert" hidden></p>
        <p class="form-note">Con tu cuenta, los datos del negocio se comparten con la otra persona y se mantienen al día en los dos dispositivos.</p>`,
    });
    const val = (n) => sh.el.querySelector(`[name="${n}"]`).value;
    const say = (m) => { const p = sh.el.querySelector('#cl-err'); p.textContent = m; p.hidden = !m; };
    async function go() {
      if (!val('user').trim() || !val('pass')) return say('Escribe tu usuario y tu clave.');
      say('');
      try {
        await signIn(val('user'), val('pass'));
        D.auth.remember(val('user'), val('pass'));
      } catch (e) {
        return say(e.userMessage || 'No se pudo conectar.');
      }
      sh.close();
      await start();
      D.router.render({ force: true });
    }
  };
  D.act['cloud.logout'] = async () => {
    const msg = D.sync.pendingCount() ? `Hay ${D.sync.pendingCount()} cambios sin subir que se perderían para la otra persona. ` : '';
    if (!(await D.confirm({ title: '¿Desconectar de la nube?', message: msg + 'Este dispositivo se queda con sus datos, pero deja de compartirlos. Para volver a conectarlo tendrás que entrar de nuevo.', ok: 'Desconectar', danger: true }))) return;
    D.sync.unlink();
    await signOut();
    write({});
    D.toast('Desconectado de la nube', { tone: 'info', icon: 'cloud' });
    D.router.render({ force: true });
  };

  /* ---------- Sección de Ajustes ---------- */
  function rows() {
    const s = read();
    const row = (act, icon, title, sub, tone = '') =>
      `<button class="row row--tap row--noavatar ${tone}" data-act="${act}"><span class="row__icon">${D.icon(icon)}</span><span class="row__main"><span class="row__title">${title}</span><span class="row__sub">${sub}</span></span></button>`;
    let list;
    if (!s.linked) {
      list = row('cloud.login', 'cloud', 'Conectar con la nube', 'Comparte los datos del negocio con la otra persona');
    } else {
      list =
        `<div class="row row--noavatar"><span class="row__icon">${D.icon('cloud')}</span><span class="row__main"><span class="row__title" data-sync-title>${esc(statusText())}</span><span class="row__sub">Cuenta: ${esc(s.user || '')}</span></span></div>` +
        row('cloud.sync', 'upload', 'Sincronizar ahora', 'Sube lo pendiente y baja lo nuevo') +
        row('cloud.logout', 'x', 'Desconectar este dispositivo', 'Deja de compartir los datos', 'row--bad');
    }
    return `<div class="list" data-rise>${list}</div>
      <p class="form-note">Los clientes, postres, ventas, compras, proveedores y los datos del negocio se comparten con la otra persona. El tema, el logo subido y el prefijo de factura son de cada dispositivo.</p>`;
  }

  D.cloud = { configured: true, linked: () => !!read().linked, user: () => read().user || '', signIn, changePassword, signOut, start, boot, rows, chip, statusText, adapter, _wrap: wrap };
})();
