// Firebase falso para probar js/cloud.js y js/sync.js en el navegador sin tocar el proyecto real.
// Uso (consola o javascript_tool, con la app abierta):  eval(await (await fetch('.dev/fake-firebase.js')).text()); __fake.install();
// Cuentas de mentira: rivcarii@dulza.app / Prueba-Falsa-1  y  anaparr@dulza.app / Prueba-Falsa-2.
// __fake.mem.docs[col] es la «nube» en memoria; __fake.mem.offlineAuth = true simula que no hay red para iniciar sesión.
(function () {
  const COLS = ['settings', 'customers', 'products', 'sales', 'suppliers', 'purchases'];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const mem = { docs: {}, subs: {}, writes: [], offlineAuth: false };
  COLS.forEach((c) => (mem.docs[c] = new Map()));
  const accounts = { 'rivcarii@dulza.app': 'Prueba-Falsa-1', 'anaparr@dulza.app': 'Prueba-Falsa-2' };
  let cur = null;
  const authObj = {
    get currentUser() { return cur; },
    onAuthStateChanged(cb) { setTimeout(() => cb(cur), 5); return () => {}; },
    async signInWithEmailAndPassword(email, pass) {
      if (mem.offlineAuth) throw { code: 'auth/network-request-failed' };
      if (accounts[email] !== pass) throw { code: 'auth/invalid-credential' };
      cur = { email, async reauthenticateWithCredential(c) { if (accounts[email] !== c.pass) throw { code: 'auth/invalid-credential' }; }, async updatePassword(p) { accounts[email] = p; } };
    },
    async signOut() { cur = null; },
  };
  const colRef = (name) => ({
    doc: (id) => ({
      async get() { return { exists: mem.docs[name].has(id) }; },
      async set(data) { mem.writes.push(name + ':' + id); mem.docs[name].set(id, clone(data)); },
    }),
    onSnapshot(cb) {
      mem.subs[name] = cb;
      setTimeout(() => cb({ docChanges: () => Array.from(mem.docs[name].entries()).map(([id, d]) => ({ type: 'added', doc: { id, data: () => clone(d) } })) }), 5);
      return () => {};
    },
  });
  window.__fake = {
    mem,
    accounts,
    install() {
      window.firebase = {
        apps: [{}],
        initializeApp() {},
        auth: Object.assign(() => authObj, { EmailAuthProvider: { credential: (email, pass) => ({ email, pass }) } }),
        firestore: () => ({ collection: () => ({ doc: () => ({ collection: colRef }) }) }),
      };
    },
    uninstall() { delete window.firebase; },
    live: (c) => Array.from(mem.docs[c].values()).filter((d) => !d.deleted).length,
  };
})();
