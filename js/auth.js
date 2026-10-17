/* Dulza · acceso con usuario y clave
   Es un candado para el dispositivo: pide usuario y clave al abrir la app y tras un rato sin usarla.
   Los datos siguen guardados en el dispositivo sin cifrar, así que esto protege contra miradas y manos ajenas,
   no contra alguien con conocimientos técnicos. La clave nunca se guarda en el código: solo su huella (SHA-256
   con sal, 30 000 vueltas); la clave elegida por la usuaria queda en este navegador, fuera de los respaldos. */
(function () {
  'use strict';
  const D = window.D;
  const { esc } = D;

  const USER = 'anaparr';
  const SALT = 'dulza:v1:5c1e9a7d3b04f2a8';
  const DEFAULT_HASH = '6b2945af8fee95de7714dcae20a83f169461293e0dbb995b96f011c37cd995c2'; // huella de la clave por defecto
  const ROUNDS = 30000;
  const IDLE_MS = 10 * 60 * 1000; // bloqueo tras 10 minutos sin usar la app
  const K_AUTH = 'dulza-auth', K_LOCK = 'dulza-lockout', K_SESSION = 'dulza-session';

  /* ---------- Almacenamiento con respaldo en memoria (ventanas privadas) ---------- */
  const mem = {};
  const store = (area) => ({
    get(k) {
      try { const v = window[area].getItem(k); return v === null ? (mem[area + k] ?? null) : v; } catch (e) { return mem[area + k] ?? null; }
    },
    set(k, v) {
      mem[area + k] = v;
      try { window[area].setItem(k, v); } catch (e) {}
    },
    del(k) {
      delete mem[area + k];
      try { window[area].removeItem(k); } catch (e) {}
    },
  });
  const ls = store('localStorage'), ss = store('sessionStorage');
  const readJSON = (s, k) => { try { return JSON.parse(s.get(k) || 'null'); } catch (e) { return null; } };

  /* ---------- SHA-256 puro: da el mismo resultado con o sin https ---------- */
  const KK = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const W = new Uint32Array(64);
  function sha256(msg) {
    const l = msg.length, padLen = ((l + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(padLen);
    buf.set(msg);
    buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor(l / 0x20000000));
    dv.setUint32(padLen - 4, (l << 3) >>> 0);
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let o = 0; o < padLen; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = W[i - 15], b = W[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + KK[i] + W[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => odv.setUint32(i * 4, v >>> 0));
    return out;
  }
  const enc = (s) => new TextEncoder().encode(s);
  const cat = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    parts.forEach((p) => { out.set(p, o); o += p.length; });
    return out;
  };
  const hex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');
  function derive(pass, salt) {
    const p = enc(pass), s = enc(salt);
    let h = sha256(cat(s, p));
    for (let i = 0; i < ROUNDS; i++) h = sha256(cat(h, s, p));
    return hex(h);
  }
  const same = (a, b) => {
    let d = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return d === 0;
  };

  /* ---------- Credenciales ---------- */
  const record = () => readJSON(ls, K_AUTH) || { u: USER, s: SALT, h: DEFAULT_HASH };
  const usingDefault = () => !readJSON(ls, K_AUTH);
  const norm = (u) => String(u || '').trim().toLowerCase();
  const tick = () => new Promise((r) => setTimeout(r, 30)); // deja pintar «Entrando…» antes de calcular
  const cloudLinked = () => !!(D.cloud && D.cloud.linked());
  const newSalt = () => 'dulza:' + Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  /* Guarda la huella de una clave validada por la nube: así se puede entrar sin internet con la misma clave */
  function remember(user, pass) {
    const salt = newSalt();
    ls.set(K_AUTH, JSON.stringify({ u: norm(user).split('@')[0], s: salt, h: derive(String(pass), salt), c: 1, t: Date.now() }));
  }
  /* Orden: 1) la clave guardada en este dispositivo (la de fábrica solo vale mientras no haya nube vinculada);
     2) las cuentas de la nube, si hay internet. Devuelve {ok, network?, message?}. */
  async function check(user, pass) {
    await tick();
    const r = record();
    const okHash = same(derive(String(pass || ''), r.s), r.h); // se calcula siempre, aunque el usuario no coincida
    if (okHash && norm(user) === r.u && (r.c || !cloudLinked())) return { ok: true };
    if (D.cloud && D.cloud.configured) {
      try {
        await D.cloud.signIn(user, pass);
        remember(user, pass);
        return { ok: true, cloud: true };
      } catch (e) {
        return { ok: false, network: !!(e && e.network), message: e && e.userMessage };
      }
    }
    return { ok: false };
  }

  /* ---------- Intentos fallidos: pausa creciente ---------- */
  const lockout = () => readJSON(ls, K_LOCK) || { n: 0, until: 0 };
  const waitLeft = () => Math.max(0, lockout().until - Date.now());
  function fail() {
    const s = lockout();
    s.n += 1;
    if (s.n % 5 === 0) s.until = Date.now() + Math.min(5 * 60 * 1000, 30000 * 2 ** (s.n / 5 - 1));
    ls.set(K_LOCK, JSON.stringify(s));
  }
  const clearFails = () => ls.del(K_LOCK);

  /* ---------- Sesión: vale mientras se usa la app ---------- */
  let last = Date.now(), lastSaved = 0;
  const touch = () => {
    last = Date.now();
    if (last - lastSaved > 10000 && ss.get(K_SESSION)) { lastSaved = last; ss.set(K_SESSION, String(last)); }
  };
  const unlocked = () => {
    const t = +ss.get(K_SESSION);
    return !!t && Date.now() - t < IDLE_MS;
  };
  const open = () => { ss.set(K_SESSION, String(Date.now())); last = Date.now(); };

  /* ---------- Pantalla de acceso ---------- */
  let dlg = null;
  const waiting = [];
  const isOwnLogo = () => !D.data.settings.logo && /^dulza$/i.test(String(D.data.settings.name || '').trim());

  function build() {
    const S = D.data.settings;
    const word = isOwnLogo();
    dlg = document.createElement('dialog');
    dlg.className = 'lock';
    dlg.setAttribute('aria-labelledby', 'lock-title');
    dlg.innerHTML = `<form class="lock__card" autocomplete="on" novalidate>
        <div class="lock__art">${D.mood('hello', { cls: 'lock__mood' })}</div>
        ${word ? `<img class="lock__word" src="${D.gpt.url(D.gpt.logoName)}" alt="" decoding="async">` : ''}
        <h1 id="lock-title" class="lock__title">${word ? 'Bienvenida' : esc(S.name)}</h1>
        <p class="lock__sub">Entra con tu usuario y tu clave para abrir el negocio.</p>
        <div class="fields">
          <label class="field"><span>Usuario</span><input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" required></label>
          <label class="field"><span>Clave</span><input name="password" type="password" autocomplete="current-password" enterkeyhint="go" required><button type="button" class="lock__eye" aria-label="Mostrar la clave" aria-pressed="false">Ver</button></label>
        </div>
        <p class="lock__error" role="alert" hidden></p>
        <button class="btn lock__go" type="submit">Entrar</button>
      </form>`;
    const form = dlg.querySelector('form');
    const user = form.elements.username, pass = form.elements.password;
    const err = dlg.querySelector('.lock__error'), go = dlg.querySelector('.lock__go');
    const art = dlg.querySelector('.lock__art');
    const face = (mood) => (art.innerHTML = D.mood(mood, { cls: 'lock__mood' }));
    const say = (msg, mood) => {
      err.textContent = msg;
      err.hidden = !msg;
      if (mood) face(mood);
    };
    let timer = 0;
    const countdown = () => {
      clearInterval(timer);
      const tickDown = () => {
        const ms = waitLeft();
        if (!ms) { clearInterval(timer); say(''); go.disabled = false; face('hello'); return; }
        go.disabled = true;
        say(`Demasiados intentos. Espera ${Math.ceil(ms / 1000)} s.`, 'sad');
      };
      tickDown();
      timer = setInterval(tickDown, 1000);
    };
    dlg.querySelector('.lock__eye').addEventListener('click', (e) => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      e.currentTarget.textContent = show ? 'Ocultar' : 'Ver';
      e.currentTarget.setAttribute('aria-pressed', String(show));
      e.currentTarget.setAttribute('aria-label', show ? 'Ocultar la clave' : 'Mostrar la clave');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (waitLeft()) return countdown();
      if (!user.value.trim() || !pass.value) return say('Escribe tu usuario y tu clave.', 'think');
      go.disabled = true;
      go.textContent = 'Entrando…';
      const res = await check(user.value, pass.value);
      go.textContent = 'Entrar';
      if (!res.ok && res.network) {
        // sin internet no se puede comprobar con la nube: no cuenta como intento fallido
        go.disabled = false;
        return say('No pude comprobar tu clave por internet. Sin conexión solo entra con la clave que ya usaste en este dispositivo.', 'think');
      }
      if (!res.ok) {
        fail();
        pass.value = '';
        pass.focus();
        form.classList.remove('is-shake');
        void form.offsetWidth;
        form.classList.add('is-shake');
        if (waitLeft()) return countdown();
        go.disabled = false;
        return say(res.message && !/incorrectos/.test(res.message) ? res.message : 'Usuario o clave incorrectos. Inténtalo de nuevo.', 'sad');
      }
      clearFails();
      open();
      say('', 'joy');
      form.reset();
      dlg.classList.add('is-out');
      setTimeout(() => {
        dlg.close();
        dlg.remove();
        dlg = null;
        document.documentElement.classList.remove('is-locked');
        waiting.splice(0).forEach((r) => r());
      }, 240);
    });
    dlg.addEventListener('cancel', (e) => e.preventDefault());
    document.body.appendChild(dlg);
    document.documentElement.classList.add('is-locked');
    dlg.showModal();
    if (waitLeft()) countdown();
    user.focus({ preventScroll: true });
  }

  function lock() {
    ss.del(K_SESSION);
    if (dlg) return;
    build();
  }
  function gate() {
    if (unlocked()) return Promise.resolve();
    return new Promise((res) => {
      waiting.push(res);
      if (!dlg) build();
    });
  }

  /* Bloqueo por inactividad y al volver de segundo plano */
  let hiddenAt = 0;
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => document.addEventListener(ev, touch, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > IDLE_MS && ss.get(K_SESSION)) lock();
  });
  setInterval(() => { if (!dlg && ss.get(K_SESSION) && Date.now() - last > IDLE_MS) lock(); }, 30000);

  /* ---------- Cambiar la clave (Ajustes → Seguridad) ---------- */
  function changePassword() {
    const sh = D.sheet.open({
      title: 'Cambiar clave',
      form: true,
      size: 'large',
      right: { label: 'Guardar', onClick: () => save() },
      body: `<div class="fields">
          <label class="field"><span>Clave actual</span><input name="cur" type="password" autocomplete="current-password" data-autofocus></label>
          <label class="field"><span>Clave nueva</span><input name="nueva" type="password" autocomplete="new-password"></label>
          <label class="field"><span>Repite la nueva</span><input name="rep" type="password" autocomplete="new-password"></label>
        </div>
        <p class="lock__error" id="pw-err" role="alert" hidden></p>
        <p class="form-note">Mínimo 8 caracteres, con letras y números. Anótala en un lugar seguro: si la olvidas, la única salida es borrar los datos del navegador, y con ellos los de la app. Guarda respaldos de vez en cuando.</p>`,
    });
    const val = (n) => sh.el.querySelector(`[name="${n}"]`).value;
    const say = (m) => {
      const p = sh.el.querySelector('#pw-err');
      p.textContent = m;
      p.hidden = !m;
    };
    async function save() {
      const nueva = val('nueva');
      if (!val('cur')) return say('Escribe tu clave actual.');
      if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return say('La clave nueva debe tener al menos 8 caracteres, con letras y números.');
      if (nueva !== val('rep')) return say('Las dos claves nuevas no son iguales.');
      say('');
      const r0 = record();
      const viaCloud = cloudLinked();
      if (viaCloud) {
        // con la nube vinculada, la clave se cambia en la cuenta (necesita internet) y luego se guarda su huella aquí
        try { await D.cloud.changePassword(val('cur'), nueva); } catch (e) { return say(e.network ? 'Para cambiar la clave necesitas internet.' : e.userMessage || 'No se pudo cambiar la clave.'); }
      } else if (!(await check(r0.u, val('cur'))).ok) return say('La clave actual no es correcta.');
      const salt = newSalt();
      ls.set(K_AUTH, JSON.stringify({ u: r0.u, s: salt, h: derive(nueva, salt), c: viaCloud ? 1 : undefined, t: Date.now() }));
      sh.close();
      D.toast('Clave cambiada', { icon: 'shield' });
      D.router.render({ force: true });
    }
  }

  D.act['auth.change'] = changePassword;
  D.act['auth.lock'] = lock;
  D.auth = { gate, lock, unlocked, usingDefault, remember, user: () => record().u, _derive: derive, _sha256: (s) => hex(sha256(enc(s))), _salt: SALT };
})();
