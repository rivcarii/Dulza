/* Dulza · respaldo en Google Drive
   Guarda y restaura el respaldo completo (el mismo archivo de «Guardar respaldo») en la carpeta oculta de la app
   dentro del Drive de la usuaria. Usa el alcance drive.appdata: solo esta app puede ver ese archivo y no aparece
   en «Mi unidad». El inicio de sesión de Google (Google Identity Services) se carga solo al tocar «Conectar», así
   que la app sigue funcionando sin internet; Drive se usa únicamente al guardar o restaurar.
   No hay servidor propio: los datos solo viajan entre el dispositivo y Google. */
(function () {
  'use strict';
  const D = window.D;
  const { esc } = D;

  // ID de cliente de OAuth de Google Cloud (es público por diseño). Con '' la sección queda «sin configurar».
  const CLIENT_ID = '';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email';
  const FILE = 'dulza-respaldo.json';
  const KEY = 'dulza-drive';
  const REMIND_DAYS = 7;
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const GIS = 'https://accounts.google.com/gsi/client';

  const me = { clientId: CLIENT_ID, fetch: null }; // fetch se puede reemplazar en pruebas
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const net = (...a) => (me.fetch || window.fetch.bind(window))(...a);
  let token = '', expires = 0, gis = null;

  /* ---------- Inicio de sesión de Google ---------- */
  const loadGis = () =>
    window.google && google.accounts && google.accounts.oauth2
      ? Promise.resolve()
      : gis ||
        (gis = new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = GIS;
          s.async = true;
          s.onload = () => res();
          s.onerror = () => { gis = null; rej(new Error('No pude cargar el inicio de sesión de Google. Revisa tu internet.')); };
          document.head.appendChild(s);
        }));

  function getToken(prompt) {
    if (prompt === undefined && token && Date.now() < expires - 60000) return Promise.resolve(token);
    return loadGis().then(
      () =>
        new Promise((res, rej) => {
          const email = read().email;
          const client = google.accounts.oauth2.initTokenClient({
            client_id: me.clientId,
            scope: SCOPE,
            callback: (r) => {
              if (r.error) return rej(new Error(r.error_description || r.error));
              token = r.access_token;
              expires = Date.now() + (+r.expires_in || 3600) * 1000;
              res(token);
            },
            error_callback: (e) =>
              rej(new Error(e && e.type === 'popup_closed' ? 'Cerraste la ventana de Google antes de terminar.' : e && e.type === 'popup_failed_to_open' ? 'El navegador bloqueó la ventana de Google. Permítela e inténtalo de nuevo.' : 'No se pudo iniciar sesión con Google.')),
          });
          client.requestAccessToken({ prompt: prompt === undefined ? '' : prompt, hint: email || undefined });
        })
    );
  }

  /* ---------- Llamadas a Drive ---------- */
  async function gfetch(url, opts = {}, retry = true) {
    const t = await getToken();
    const res = await net(url, Object.assign({}, opts, { headers: Object.assign({ Authorization: 'Bearer ' + t }, opts.headers || {}) }));
    if (res.status === 401 && retry) {
      token = '';
      return gfetch(url, opts, false);
    }
    if (!res.ok) {
      const e = new Error((await res.text().catch(() => '')).slice(0, 300) || 'Error ' + res.status);
      e.status = res.status;
      throw e;
    }
    return res;
  }
  async function find() {
    const q = encodeURIComponent(`name='${FILE}' and trashed=false`);
    const r = await gfetch(`${API}?spaces=appDataFolder&q=${q}&orderBy=${encodeURIComponent('modifiedTime desc')}&pageSize=1&fields=${encodeURIComponent('files(id,modifiedTime,size)')}`);
    const j = await r.json();
    return (j.files && j.files[0]) || null;
  }
  async function put(json) {
    const found = await find();
    if (found) {
      await gfetch(`${UPLOAD}/${found.id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: json });
      return found.id;
    }
    const b = 'dulza' + Date.now();
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE, parents: ['appDataFolder'] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${b}--`;
    const r = await gfetch(`${UPLOAD}?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body });
    return (await r.json()).id;
  }

  const explain = (e) => {
    const m = String((e && e.message) || e);
    if (e && e.status === 403 && /accessNotConfigured|has not been used|is disabled/i.test(m)) return 'La API de Google Drive no está activada en el proyecto de Google Cloud.';
    if (e && (e.status === 401 || e.status === 403)) return 'Google no dio permiso. Vuelve a conectar la cuenta.';
    if (!navigator.onLine || /Failed to fetch|NetworkError/i.test(m)) return 'No hay conexión con Google. Revisa tu internet.';
    return m.length < 140 ? m : 'No se pudo completar la operación con Google.';
  };
  const stamp = (iso) => {
    const d = new Date(iso);
    return `${D.fmtDate(iso.slice(0, 10))}, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const refresh = () => D.router.render({ force: true });
  const wait = (msg) => D.toast(msg, { tone: 'info', icon: 'cloud' });

  /* ---------- Acciones de Ajustes → Respaldo en la nube ---------- */
  D.act['drive.connect'] = async () => {
    try {
      if (!me.clientId) return D.alert('Falta configurar Google', 'La app todavía no tiene el ID de cliente de Google Cloud. Mira el LEEME, sección «Respaldo en Google Drive».');
      wait('Abriendo Google…');
      await getToken('select_account');
      const u = await (await net('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } })).json();
      const s = read();
      s.email = u.email || 'tu cuenta de Google';
      write(s);
      D.toast(`Conectada con ${s.email}`);
      refresh();
    } catch (e) {
      D.toast(explain(e), { tone: 'bad' });
    }
  };
  D.act['drive.backup'] = async () => {
    try {
      wait('Guardando en tu Drive…');
      await put(D.store.exportJSON());
      const s = read();
      s.last = new Date().toISOString();
      write(s);
      D.toast('Respaldo guardado en tu Drive', { icon: 'cloud' });
      refresh();
    } catch (e) {
      D.toast(explain(e), { tone: 'bad' });
    }
  };
  D.act['drive.restore'] = async () => {
    try {
      wait('Buscando tu respaldo…');
      const f = await find();
      if (!f) return D.alert('Todavía no hay respaldo', 'No encontré ningún respaldo en tu Drive. Primero guarda uno desde el dispositivo que tiene los datos.');
      if (!(await D.confirm({ title: '¿Restaurar desde Drive?', message: `Respaldo guardado el ${stamp(f.modifiedTime)}. Reemplazará todos los datos de este dispositivo.`, ok: 'Restaurar', danger: true }))) return;
      const text = await (await gfetch(`${API}/${f.id}?alt=media`)).text();
      JSON.parse(text);
      D.store.importJSON(text);
      D.theme.apply();
      D.toast('Datos restaurados desde Drive', { icon: 'cloud' });
    } catch (e) {
      D.toast(explain(e), { tone: 'bad' });
    }
  };
  D.act['drive.disconnect'] = async () => {
    if (!(await D.confirm({ title: '¿Desconectar Google Drive?', message: 'La app dejará de usar tu cuenta. El respaldo ya guardado se queda en tu Drive.', ok: 'Desconectar' }))) return;
    try {
      if (token && window.google && google.accounts) google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {}
    token = '';
    expires = 0;
    try { localStorage.removeItem(KEY); } catch (e) {}
    D.toast('Google Drive desconectado', { tone: 'info', icon: 'cloud' });
    refresh();
  };

  /* ---------- Sección de Ajustes ---------- */
  function rows() {
    const s = read();
    const row = (act, icon, title, sub, tone = '') =>
      `<button class="row row--tap row--noavatar ${tone}" data-act="${act}"><span class="row__icon">${D.icon(icon)}</span><span class="row__main"><span class="row__title">${title}</span><span class="row__sub">${sub}</span></span></button>`;
    let list;
    if (!me.clientId) {
      list = `<div class="row row--noavatar"><span class="row__icon">${D.icon('cloud')}</span><span class="row__main"><span class="row__title">Respaldo en Google Drive</span><span class="row__sub">Todavía sin configurar: falta el ID de cliente de Google (ver LEEME)</span></span></div>`;
    } else if (!s.email) {
      list = row('drive.connect', 'cloud', 'Conectar con Google', 'Guarda tus datos en tu Google Drive');
    } else {
      list =
        `<div class="row row--noavatar"><span class="row__icon">${D.icon('cloud')}</span><span class="row__main"><span class="row__title">Conectada</span><span class="row__sub">${esc(s.email)}</span></span></div>` +
        row('drive.backup', 'upload', 'Guardar ahora en Drive', s.last ? 'Último: ' + esc(stamp(s.last)) : 'Aún no guardas ningún respaldo') +
        row('drive.restore', 'download', 'Restaurar desde Drive', 'Reemplaza los datos de este dispositivo') +
        row('drive.disconnect', 'x', 'Desconectar', 'Deja de usar tu cuenta de Google', 'row--bad');
    }
    return `<div class="list" data-rise>${list}</div>
      <p class="form-note">El respaldo (clientes, ventas, postres y logo) se guarda en una carpeta oculta de tu Drive que solo esta app puede leer. Sirve para no perder los datos y para pasarlos a otro dispositivo.</p>`;
  }

  /* Recordatorio al entrar: si hay cuenta conectada y el último respaldo es viejo */
  const due = () => {
    const s = read();
    return !!(me.clientId && s.email && (!s.last || Date.now() - Date.parse(s.last) > REMIND_DAYS * 864e5));
  };
  function remind() {
    if (!due() || sessionStorage.getItem('dulza-driveaviso')) return;
    sessionStorage.setItem('dulza-driveaviso', '1');
    const s = read();
    setTimeout(
      () => D.toast(s.last ? `Hace más de ${REMIND_DAYS} días que no guardas tu respaldo en Drive` : 'Aún no guardas tu respaldo en Drive', { tone: 'info', icon: 'cloud', action: { label: 'Guardar ahora', fn: () => D.act['drive.backup']() } }),
      6000
    );
  }

  D.drive = Object.assign(me, { rows, due, remind, connected: () => !!read().email, _explain: explain });
})();
