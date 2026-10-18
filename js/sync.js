/* Dulza · sincronización entre dispositivos (motor)
   La app sigue siendo «local primero»: todo se lee y se escribe en el dispositivo y funciona sin internet.
   Este motor, cuando hay una nube conectada, hace tres cosas:
     1. Detecta qué registros se crearon, cambiaron o se borraron (cada registro lleva `updatedAt`; los borrados dejan
        una lápida en D.data.deleted) y los pone en la cola de envío.
     2. Sube la cola cuando hay conexión (reintenta solo) y baja los cambios del otro dispositivo en tiempo real.
     3. Resuelve los choques por registro: gana el cambio más reciente. El reloj nunca va hacia atrás respecto a lo que
        ya se vio de la nube, así que un cambio hecho justo después de ver el del otro siempre gana.
   La nube se conecta por medio de un adaptador (js/cloud-*.js):
     { name, open(): Promise, subscribe(col, onDocs, onError): unsubscribe, write(col, doc): Promise, close() }
     - subscribe entrega primero todos los documentos de la colección y luego los cambios; cada documento trae `id`.
     - write guarda (o reemplaza) el documento por `id`; los borrados viajan como {id, deleted: true, updatedAt}.
   Colecciones sincronizadas: customers, products, sales, suppliers, purchases y los ajustes del negocio (settings).
   Siguen siendo solo del dispositivo: tema claro/oscuro, logo y mascota subidos, prefijo y número de factura, avisos. */
(function () {
  'use strict';
  const D = window.D;

  const COLS = ['customers', 'products', 'sales', 'suppliers', 'purchases'];
  const ALL = ['settings'].concat(COLS);
  // Ajustes compartidos del negocio. El prefijo de factura NO se comparte: cada persona usa el suyo.
  const SHARED = ['name', 'owner', 'tagline', 'phone', 'address', 'country', 'dial', 'currency', 'decimals', 'numFmt', 'defaultTerm', 'terms', 'waInvoice', 'waReminder', 'waAuto', 'brand', 'accent', 'palette'];
  const META = 'dulza-sync';
  const TOMB_MS = 60 * 864e5; // las lápidas se conservan 60 días

  /* ---------- Estado que sobrevive al cierre: cola de envío, reloj, vínculo con la nube ---------- */
  const meta = (() => {
    try { return JSON.parse(localStorage.getItem(META) || 'null') || {}; } catch (e) { return {}; }
  })();
  const pending = new Set(Array.isArray(meta.pending) ? meta.pending : []); // 'col:id'
  let last = +meta.clock || 0;
  const saveMeta = () => {
    meta.pending = Array.from(pending);
    meta.clock = last;
    try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) {}
  };
  const clock = () => (last = Math.max(Date.now(), last + 1));
  const observe = (t) => { if (+t > last) last = +t; };

  /* ---------- Huellas para detectar cambios ---------- */
  const strip = (doc) => JSON.stringify(doc, (k, v) => (k === 'updatedAt' ? undefined : v));
  const shared = (S) => JSON.stringify(SHARED.map((k) => S[k]));
  const shadow = { settings: '' };
  COLS.forEach((c) => (shadow[c] = new Map()));
  let applying = false; // true mientras se aplican cambios que vienen de la nube (no se vuelven a sellar ni a subir)

  const tombs = () => D.data.deleted;
  const tombAt = (col, id) => tombs().reduce((m, t) => (t.col === col && t.id === id && t.at > m ? t.at : m), 0);
  const dropTomb = (col, id) => {
    const t = tombs();
    for (let i = t.length - 1; i >= 0; i--) if (t[i].col === col && t[i].id === id) t.splice(i, 1);
  };
  const key = (col, id) => col + ':' + id;
  // Sin nube vinculada no se acumula cola: al vincular, markAll() pone en cola todo lo que haya.
  const queue = (k) => { if (meta.linked || sync.adapter) pending.add(k); };

  D.store.afterLoad = () => {
    shadow.settings = shared(D.data.settings);
    COLS.forEach((c) => {
      shadow[c] = new Map();
      D.data[c].forEach((d) => shadow[c].set(d.id, strip(d)));
    });
    // lápidas viejas ya enviadas: se limpian
    const now = Date.now();
    D.data.deleted = D.data.deleted.filter((t) => pending.has(key(t.col, t.id)) || now - t.at < TOMB_MS);
  };

  /* Se llama desde D.store.commit: sella con fecha lo nuevo o cambiado y anota los borrados */
  D.store.track = (keys) => {
    if (applying) return [];
    const extra = [];
    keys.forEach((k) => {
      if (k === 'settings') {
        const S = D.data.settings;
        const now = shared(S);
        if (now !== shadow.settings) {
          shadow.settings = now;
          S.updatedAt = clock();
          queue(key('settings', 'main'));
        }
      } else if (COLS.includes(k)) {
        const sh = shadow[k];
        const seen = new Set();
        D.data[k].forEach((d) => {
          seen.add(d.id);
          const fp = strip(d);
          if (sh.get(d.id) !== fp) {
            d.updatedAt = clock();
            sh.set(d.id, fp);
            queue(key(k, d.id));
            if (tombAt(k, d.id)) { dropTomb(k, d.id); extra.push('deleted'); } // volvió a existir (p. ej. al restaurar un respaldo)
          }
        });
        Array.from(sh.keys()).forEach((id) => {
          if (seen.has(id)) return;
          sh.delete(id);
          tombs().push({ col: k, id, at: clock() });
          queue(key(k, id));
          extra.push('deleted');
        });
      }
    });
    if (keys.some((k) => k === 'settings' || COLS.includes(k))) {
      saveMeta();
      schedulePush(400);
      emitStatus();
    }
    return extra;
  };

  /* ---------- Documentos que viajan a la nube ---------- */
  function docFor(col, id) {
    if (col === 'settings') {
      const S = D.data.settings;
      const o = { id: 'main', updatedAt: S.updatedAt || clock() };
      SHARED.forEach((k) => (o[k] = S[k] === undefined ? null : S[k]));
      return o;
    }
    const d = D.data[col].find((x) => x.id === id);
    if (d) return JSON.parse(JSON.stringify(d));
    const at = tombAt(col, id);
    return at ? { id, deleted: true, updatedAt: at } : null;
  }

  /* ---------- Cambios que llegan de la nube ---------- */
  const seen = new Map(); // 'col:id' -> updatedAt que ya tiene la nube (para no volver a subir lo que ya está)
  function onRemote(col, docs) {
    let changed = false, tombChanged = false;
    applying = true;
    try {
      docs.forEach((r) => {
        if (!r || r.id == null) return;
        observe(r.updatedAt);
        const rts = +r.updatedAt || 0;
        seen.set(key(col, r.id), Math.max(rts, seen.get(key(col, r.id)) || 0));
        if (col === 'settings') {
          const S = D.data.settings;
          if (rts > (S.updatedAt || 0)) {
            SHARED.forEach((k) => { if (r[k] !== undefined && r[k] !== null) S[k] = r[k]; });
            S.updatedAt = rts;
            shadow.settings = shared(S);
            pending.delete(key('settings', 'main'));
            changed = true;
          } else if (rts < (S.updatedAt || 0)) pending.add(key('settings', 'main'));
          return;
        }
        const arr = D.data[col];
        const i = arr.findIndex((x) => x.id === r.id);
        const local = i >= 0 ? arr[i] : null;
        const lts = local ? local.updatedAt || 0 : tombAt(col, r.id);
        if (rts < lts && !pending.has(key(col, r.id))) pending.add(key(col, r.id)); // lo local es más nuevo: que suba
        if (rts <= lts) return;
        if (r.deleted) {
          if (i >= 0) { arr.splice(i, 1); shadow[col].delete(r.id); changed = true; }
          if (tombAt(col, r.id) < rts) { dropTomb(col, r.id); tombs().push({ col, id: r.id, at: rts }); tombChanged = true; }
        } else {
          const clean = JSON.parse(JSON.stringify(r));
          delete clean.deleted;
          if (i >= 0) arr[i] = clean; else arr.push(clean);
          shadow[col].set(clean.id, strip(clean));
          if (tombAt(col, r.id)) { dropTomb(col, r.id); tombChanged = true; }
          changed = true;
        }
        pending.delete(key(col, r.id));
      });
      if (changed || tombChanged) {
        D.store.commit(...[col].concat(tombChanged ? ['deleted'] : []));
        saveMeta();
      }
    } finally {
      applying = false;
    }
    emitStatus();
  }

  /* ---------- Envío ---------- */
  let pushing = false, pushTimer = 0, retryTimer = 0;
  function schedulePush(ms = 300) {
    if (!sync.adapter || sync.status === 'off') return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, ms);
  }
  // Sin conexión, las escrituras de Firestore se quedan esperando: se corta la espera para marcar «sin conexión» y reintentar.
  const withTimeout = (p, ms) =>
    new Promise((res, rej) => {
      const t = setTimeout(() => rej(Object.assign(new Error('offline: tiempo agotado'), { code: 'unavailable' })), ms);
      p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
    });
  async function push() {
    if (!sync.adapter || pushing || sync.status === 'off' || sync.status === 'connecting') return;
    if (pending.size && navigator.onLine === false) return fail(new Error('offline'));
    pushing = true;
    try {
      for (const k of Array.from(pending)) {
        const at = k.indexOf(':');
        const col = k.slice(0, at), id = k.slice(at + 1);
        const doc = docFor(col, id);
        if (!doc) { pending.delete(k); continue; }
        await withTimeout(sync.adapter.write(col, doc), 15000);
        const cur = docFor(col, id);
        if (!cur || cur.updatedAt === doc.updatedAt) pending.delete(k); // si cambió mientras subía, se queda para el próximo envío
        saveMeta();
        emitStatus();
      }
      setStatus('online');
    } catch (e) {
      fail(e);
    } finally {
      pushing = false;
    }
    if (pending.size && sync.status === 'online') schedulePush(300);
  }
  function fail(e) {
    sync.error = String((e && e.message) || e);
    setStatus(navigator.onLine === false || (e && (e.code === 'unavailable' || /offline|network|Failed to fetch/i.test(sync.error))) ? 'offline' : 'error');
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { if (sync.adapter && sync.status !== 'off') { if (sync.status !== 'connecting') setStatus('online'); push(); } }, 20000);
  }
  window.addEventListener('online', () => sync.adapter && push());

  /* ---------- Estado visible ---------- */
  const watchers = new Set();
  function setStatus(s) {
    if (sync.status !== s) {
      sync.status = s;
      if (s === 'online') sync.error = '';
    }
    emitStatus();
  }
  function emitStatus() {
    watchers.forEach((fn) => { try { fn(sync.status, pending.size); } catch (e) { console.error(e); } });
  }

  /* ---------- API ---------- */
  let unsubs = [], connectTimer = 0;
  const sync = (D.sync = {
    status: 'off', // off | connecting | online | offline | error
    error: '',
    adapter: null,
    COLS,
    SHARED,
    pendingCount: () => pending.size,
    linked: () => !!meta.linked,
    on(fn) { watchers.add(fn); return () => watchers.delete(fn); },

    /* Conecta una nube. La primera vez en este dispositivo, todo lo local se manda como estado inicial. */
    async start(adapter) {
      sync.stop(true);
      sync.adapter = adapter;
      setStatus('connecting');
      // si en 12 segundos no llega el estado inicial, se muestra «sin conexión» (la suscripción sigue esperando)
      clearTimeout(connectTimer);
      connectTimer = setTimeout(() => {
        if (sync.status === 'connecting') { sync.error = 'Sin conexión'; setStatus('offline'); }
      }, 12000);
      try {
        await adapter.open();
        const first = !meta.linked;
        const waiting = new Set(ALL);
        unsubs = ALL.map((col) =>
          adapter.subscribe(
            col,
            (docs) => {
              onRemote(col, docs);
              if (waiting.delete(col) && !waiting.size) {
                clearTimeout(connectTimer);
                if (first) { sync.markAll(); meta.linked = true; }
                meta.enabled = true;
                saveMeta();
                setStatus('online');
                schedulePush(0);
              } else if (!waiting.size) schedulePush(300);
            },
            fail
          )
        );
      } catch (e) {
        fail(e);
        throw e;
      }
    },
    stop(quiet) {
      unsubs.forEach((u) => { try { u(); } catch (e) {} });
      unsubs = [];
      clearTimeout(pushTimer);
      clearTimeout(retryTimer);
      clearTimeout(connectTimer);
      if (sync.adapter && sync.adapter.close) { try { sync.adapter.close(); } catch (e) {} }
      sync.adapter = null;
      if (!quiet) { meta.enabled = false; saveMeta(); }
      setStatus('off');
    },
    /* Desvincula este dispositivo (los datos locales se quedan, pero ya no se mandan) */
    unlink() {
      sync.stop();
      meta.linked = false;
      pending.clear();
      saveMeta();
    },
    /* Pone en la cola de envío todo lo que hay en el dispositivo */
    markAll() {
      const S = D.data.settings;
      const need = (k, at) => (seen.get(k) || 0) < at; // lo que la nube ya tiene igual o más nuevo no se vuelve a subir
      if (!S.updatedAt) S.updatedAt = clock();
      if (need(key('settings', 'main'), S.updatedAt)) pending.add(key('settings', 'main'));
      COLS.forEach((c) =>
        D.data[c].forEach((d) => {
          if (!d.updatedAt) d.updatedAt = clock();
          if (need(key(c, d.id), d.updatedAt)) pending.add(key(c, d.id));
        })
      );
      D.data.deleted.forEach((t) => { if (need(key(t.col, t.id), t.at)) pending.add(key(t.col, t.id)); });
      saveMeta();
      D.store.commit(...COLS);
    },
    /* Deja este dispositivo sin datos propios, sin avisar de «borrados» a la nube (para empezar con lo compartido) */
    discardLocal() {
      applying = true;
      try {
        COLS.forEach((c) => { D.data[c] = []; shadow[c] = new Map(); });
        D.data.deleted = [];
        pending.clear();
        saveMeta();
        D.store.commit(...COLS, 'deleted');
      } finally {
        applying = false;
      }
    },
    push,
    /* ¿Hay datos propios en este dispositivo? */
    hasLocalData: () => COLS.some((c) => D.data[c].length),
  });
})();
