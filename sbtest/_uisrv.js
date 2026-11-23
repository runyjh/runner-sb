globalThis.__realDN = Date.now; globalThis.__OFF = 0; Date.now = () => globalThis.__realDN() + globalThis.__OFF;
// 브라우저 시험용: 깃허브 페이지(runner-sb) + 수파베이스(로그인 · 서버 함수 api)를 흉내 낸다. 서버 함수는 실제 engine.js 와 api-handler.js 그대로
const http = require('http'), fs = require('fs'), path = require('path');
const { makeFakeDb } = require('./fake-db.js'), { sbMakeHandler } = require('./api-handler.js');
const ROOT = process.env.SB_OUT, PORT = +process.env.PORT || 8765;
const fdb = makeFakeDb({ lag: +process.env.LAG || 2 }), D = fdb.DB; { const { seed } = require('./ts1.js'); fdb.seed(seed.S); }
const clone = (x) => JSON.parse(JSON.stringify(x));
const nv = () => ++D.seq;
const db = {
  sync: fdb.sync, commit: fdb.commit, cachePut: fdb.cachePut,
  impBegin: async (books) => { [...D.tabs.values()].forEach((t) => { if (books.includes(t.book)) { D.tabs.delete(t.uid); D.gone.push({ kind: 'tab', id: t.uid, ver: nv() }); [...D.rows.values()].forEach((r) => { if (r.tab_uid === t.uid) D.rows.delete(r.id); }); } }); },
  impTabs: async (tabs) => tabs.forEach((t) => D.tabs.set(t.uid, Object.assign({}, t, { ver: nv() }))),
  impRows: async (rows) => { rows.forEach((r) => D.rows.set(r.id, Object.assign(clone(r), { ver: nv() }))); return rows.length; },
  status: async () => ({ tabs: D.tabs.size, rows: D.rows.size }),
  perf: async (rows) => { D.perf = (D.perf || []).concat(rows); }
};
let coreP = null;
const core = () => coreP || (coreP = (async () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const m = new Function(src + '\n;return { sbMakeServer: sbMakeServer, sbMakeKDate: sbMakeKDate, __ENGINE: __ENGINE, __GAS_NAMES: __GAS_NAMES };')();
  return m.sbMakeServer({ engine: m.__ENGINE, gasNames: m.__GAS_NAMES, db, storage: fdb.storage, secrets: {}, Date: (globalThis.__KD = m.sbMakeKDate()) });
})());
const handler = sbMakeHandler({ core, db, who: async (t) => (/^at/.test(t) ? 'u1' : null), allowed: async () => true, origins: ['http://127.0.0.1:' + PORT] });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let body = '';
  req.on('data', (c) => { body += c; }); req.on('end', async () => {
    if (u.pathname.startsWith('/sbfake/auth/v1/token')) {
      const b = JSON.parse(body || '{}');
      if (u.searchParams.get('grant_type') === 'password' && b.password !== 'pw') { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"error_description":"Invalid login credentials"}'); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ access_token: 'at' + Date.now(), refresh_token: 'rt', expires_in: 3600, user: { email: b.email || 'me@x' } }));
    }
    if (u.pathname === '/sbfake/functions/v1/api') {
      const r = await handler({ method: req.method, headers: { get: (k) => req.headers[k.toLowerCase()] || null }, json: async () => JSON.parse(body) });
      res.writeHead(r.status, Object.fromEntries(r.headers.entries())); return res.end(await r.text());
    }
    if (u.pathname === '/__clock') { await core(); globalThis.__OFF = Date.parse(body) - globalThis.__realDN(); res.writeHead(200); return res.end('ok'); }
    if (u.pathname === '/__eval') { const c = await core(); const r = await c.call('', [body], 'eval'); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(r.out === undefined ? r : r.out)); }
    if (u.pathname === '/__db') { res.writeHead(200); return res.end(JSON.stringify({ tabs: D.tabs.size, rows: D.rows.size, perf: (D.perf || []).length, calls: D.calls.slice(-8) })); }
    const m = /^\/runner-sb\/(.*)$/.exec(u.pathname), f = m ? path.join(ROOT, (m[1] || '').replace(/(^|\/)$/, '$1index.html')) : null;
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  });
}).listen(PORT, '127.0.0.1', () => console.log('listening ' + PORT));
