/*
 * 러너 올인원 — 시험판 (실제 자료와 완전히 분리)
 *  - 서버(engine.js)를 이 브라우저 안에서 돌린다. 수파베이스·실제 자료에는 닿지 않는다 (요청은 이 파일이 가로챔).
 *  - 자료는 가짜(기사0~29 · 캠프 3개)로 시작하고, 이 브라우저에만 보관된다 (다른 기기와 공유 안 됨).
 *  - 같은 브라우저의 관리자 탭 ↔ 기사앱 탭은 같은 자료를 쓴다.
 *  - [처음 상태로] 를 누르면 가짜 자료로 되돌린다.
 */
(function () {
  'use strict';
  var BASE = 'https://test.invalid', ROOT = /\/admin\//.test(location.pathname) ? '../' : './', IS_ADMIN = /\/admin\//.test(location.pathname);
  var IDB = 'runner-test-db', BC = null;
  try { BC = new BroadcastChannel('runner-test'); } catch (e) { BC = null; }

  // ── 1) 보관함 분리: 운영 앱(같은 주소)의 로그인·보관 내용과 섞이지 않게 'tst:' 를 붙인다 ──
  var realLS = null, realSS = null;
  try { realLS = window.localStorage; realSS = window.sessionStorage; } catch (e) { /* 없음 */ }
  function fence(real, pre) {
    var mem = {};
    var keys = function () { var o = []; if (!real) return Object.keys(mem); for (var i = 0; i < real.length; i++) { var k = real.key(i); if (k && k.indexOf(pre) === 0) o.push(k.slice(pre.length)); } return o; };
    var api = {
      getItem: function (k) { if (!real) return k in mem ? mem[k] : null; return real.getItem(pre + k); },
      setItem: function (k, v) { if (!real) { mem[k] = String(v); return; } real.setItem(pre + k, String(v)); },
      removeItem: function (k) { if (!real) { delete mem[k]; return; } real.removeItem(pre + k); },
      clear: function () { keys().forEach(function (k) { api.removeItem(k); }); },
      key: function (i) { var ks = keys(); return i < ks.length ? ks[i] : null; }
    };
    return new Proxy(api, {
      get: function (t, k) { if (k === 'length') return keys().length; if (k in t) return t[k]; return typeof k === 'string' ? t.getItem(k) : undefined; },
      set: function (t, k, v) { t.setItem(k, v); return true; },
      deleteProperty: function (t, k) { t.removeItem(k); return true; },
      ownKeys: function () { return keys(); },
      has: function (t, k) { return k in t || t.getItem(k) !== null; },
      getOwnPropertyDescriptor: function (t, k) { var v = t.getItem(k); return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true }; }
    });
  }
  var LS = fence(realLS, 'tst:');
  try {
    Object.defineProperty(window, 'localStorage', { value: LS, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: fence(realSS, 'tst:'), configurable: true });
  } catch (e) { /* 바꿀 수 없는 브라우저 */ }
  try { var rOpen = indexedDB.open.bind(indexedDB); indexedDB.open = function (n, v) { return n === IDB ? rOpen(n, v) : rOpen('tst-' + n, v); }; } catch (e) { /* 무시 */ }

  // ── 2) 자료 보관 (IndexedDB · 이 브라우저에만) ──
  function idb() { return new Promise(function (ok, no) { var r = indexedDB.open(IDB, 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); }
  function idbGet(k) { return idb().then(function (d) { return new Promise(function (ok, no) { var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; }); }); }
  function idbPut(k, v) { return idb().then(function (d) { return new Promise(function (ok, no) { var tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function () { ok(); }; tx.onerror = function () { no(tx.error); }; }); }); }
  function idbDel(k) { return idb().then(function (d) { return new Promise(function (ok) { var tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = function () { ok(); }; }); }); }

  var maps = ['tabs', 'rows', 'props', 'cache', 'files', 'store'];
  function dump(D) { var o = { seq: D.seq, gone: D.gone }; maps.forEach(function (m) { o[m] = Array.from(D[m].entries()).map(function (e) { return m === 'store' ? [e[0], Array.from(e[1])] : e; }); }); return o; }
  function load(D, o) { D.seq = o.seq; D.gone = o.gone || []; maps.forEach(function (m) { D[m] = new Map((o[m] || []).map(function (e) { return m === 'store' ? [e[0], new Uint8Array(e[1])] : e; })); }); D.calls = []; }

  // ── 3) 서버 (engine.js 를 그대로) ──
  var S = null; // { fdb, core, handler, seq }
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error(src + ' 를 못 받음')); }; document.head.appendChild(s); }); }
  var ready = null;
  function boot() {
    if (ready) return ready;
    ready = Promise.all([script(ROOT + 'fake-db.js?v=' + (window.TST_V || '')), script(ROOT + 'api-handler.js?v=' + (window.TST_V || '')), script(ROOT + 'engine.js?v=' + (window.TST_V || ''))]).then(function () {
      return idbGet('db').then(function (snap) {
        if (snap && snap.v === window.TST_V) return snap.d;
        return fetch(ROOT + 'seed.json?v=' + (window.TST_V || '')).then(function (r) { return r.json(); }).then(function (d) { return idbPut('db', { v: window.TST_V, d: d }).then(function () { return d; }); });
      });
    }).then(function (d) {
      var fdb = window.makeFakeDb({ lag: 0 }); load(fdb.DB, d);
      var srv = null;
      var core = function () { return srv || (srv = Promise.resolve(window.sbMakeServer({ engine: window.__ENGINE, gasNames: window.__GAS_NAMES, db: db, storage: fdb.storage, secrets: {}, Date: window.sbMakeKDate() }))); };
      var db = {
        sync: fdb.sync, commit: fdb.commit, cachePut: fdb.cachePut,
        impBegin: function () { return Promise.reject(new Error('시험판에서는 원본 가져오기를 쓰지 않습니다')); },
        status: function () { return Promise.resolve({ tabs: fdb.DB.tabs.size, rows: fdb.DB.rows.size }); },
        perf: function () { return Promise.resolve(); }, errLog: function () { return Promise.resolve(); }
      };
      var handler = window.sbMakeHandler({ core: core, db: db, who: function (t) { return Promise.resolve(/^tst/.test(t) ? 'u1' : null); }, allowed: function () { return Promise.resolve(true); }, origins: [location.origin] });
      S = { fdb: fdb, core: core, handler: handler, seq: fdb.DB.seq, reset: function () { srv = null; } };
      return S;
    });
    ready.catch(function () { ready = null; });
    return ready;
  }
  // 다른 탭이 바꾼 자료 받기 (같은 브라우저의 관리자 ↔ 기사앱)
  var stale = false;
  if (BC) BC.onmessage = function (e) { if (e.data && e.data.seq && S && e.data.seq > S.fdb.DB.seq) stale = true; if (e.data && e.data.reset) location.reload(); };
  var chain = Promise.resolve();
  function serve(path, body) { return exec(function (s) {
    var req = { method: 'POST', headers: { get: function (k) { k = k.toLowerCase(); return k === 'authorization' ? (body.__auth || '') : k === 'origin' ? location.origin : null; } }, json: function () { return Promise.resolve(body.data); } };
    return s.handler(req);
  }); }
  // 한 번에 하나씩 · 다른 탭이 바꿨으면 먼저 받고 · 바뀌었으면 저장이 끝난 뒤에 답한다
  function exec(work) {
    var run = function () {
      return boot().then(function (s) {
        var pre = stale ? idbGet('db').then(function (snap) { if (snap && snap.d && snap.d.seq > s.fdb.DB.seq) { load(s.fdb.DB, snap.d); s.reset(); } stale = false; }) : Promise.resolve();
        return pre.then(function () {
          var before = s.fdb.DB.seq;
          return work(s).then(function (res) {
            if (s.fdb.DB.seq === before) return res;
            // 저장이 끝난 뒤에 답한다 (바로 새로고침해도 바뀐 자료가 남게)
            return idbPut('db', { v: window.TST_V, d: dump(s.fdb.DB) }).then(function () { if (BC) BC.postMessage({ seq: s.fdb.DB.seq }); return res; }, function () { return res; });
          });
        });
      });
    };
    var p = chain.then(run, run); chain = p.catch(function () {}); return p;
  }

  // ── 4) 요청 가로채기: 수파베이스 주소 대신 이 브라우저 안 서버로 ──
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(BASE) !== 0) return realFetch(input, init);
    var u = new URL(url), j = function (s, o) { return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } }); };
    var raw = (init && init.body) || '{}', b = {}; try { b = JSON.parse(raw); } catch (e) { b = {}; }
    if (u.pathname.indexOf('/auth/v1/token') === 0) return Promise.resolve(j(200, { access_token: 'tst' + Date.now(), refresh_token: 'tst-r', expires_in: 3600 * 24 * 30, user: { email: b.email || '시험@러너' } }));
    if (u.pathname.indexOf('/auth/v1/') === 0) return Promise.resolve(j(200, { id: 'u1', email: '시험@러너' }));
    if (u.pathname === '/functions/v1/api') {
      var h = (init && init.headers) || {}, auth = typeof h.get === 'function' ? h.get('authorization') : (h.Authorization || h.authorization || '');
      return serve(u.pathname, { data: b, __auth: auth || '' });
    }
    return Promise.resolve(j(404, { ok: false, msg: '시험판에 없는 주소' }));
  };

  // ── 5) 시험판 표시 · 기사로 바로 들어가기 · 처음 상태로 ──
  function evalSrv(src) { return exec(function (s) { return s.core().then(function (c) { return c.call('', [src], 'eval'); }); }).then(function (r) { return r.out; }); }
  function bar() {
    if (document.getElementById('tstBar')) return;
    var d = document.createElement('div'); d.id = 'tstBar';
    d.setAttribute('style', 'position:fixed;left:8px;bottom:8px;z-index:2147483000;font:12px/1.4 sans-serif;background:#d9480f;color:#fff;border-radius:10px;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,.3);max-width:92vw');
    d.innerHTML = '<b style="cursor:pointer" id="tstT">🧪 시험판 · 가짜 자료</b><div id="tstP" style="display:none;margin-top:6px"></div>';
    document.body.appendChild(d);
    var P = d.querySelector('#tstP');
    d.querySelector('#tstT').onclick = function () {
      if (P.style.display !== 'none') { P.style.display = 'none'; return; }
      P.style.display = 'block';
      P.innerHTML = '실제 자료와 분리된 시험판입니다. 이 브라우저에만 저장됩니다.<br>' +
        (IS_ADMIN ? '관리자: 로그인 창에 아무 메일·비밀번호 → 관리자 아이디 <b>boss</b> · 비밀번호 아무거나<br><a style="color:#fff" href="../">→ 기사앱 시험판</a>' : '<a style="color:#fff" href="admin/">→ 관리자 시험판</a>') +
        '<div style="margin-top:6px">기사로 들어가기: <select id="tstD" style="max-width:150px"><option>불러오는 중…</option></select> <button id="tstGo">열기</button></div>' +
        '<div style="margin-top:6px"><button id="tstReset">처음 상태로</button> <button id="tstX">닫기</button></div>';
      P.querySelector('#tstX').onclick = function () { P.style.display = 'none'; };
      P.querySelector('#tstReset').onclick = function () { if (!confirm('시험 자료를 처음 상태로 되돌릴까요?')) return; idbDel('db').then(function () { if (BC) BC.postMessage({ reset: 1 }); LS.clear(); location.reload(); }); };
      evalSrv("JSON.stringify(readAll_(SH.DRIVERS).filter(function (d) { return d.status === ST.ACTIVE; }).map(function (d) { return [d.id, d.name + ' (' + (d.workStatus || '') + ')']; }))").then(function (s) {
        var a = JSON.parse(s || '[]'), sel = P.querySelector('#tstD'); sel.innerHTML = a.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
      });
      P.querySelector('#tstGo').onclick = function () {
        var id = P.querySelector('#tstD').value; if (!id) return;
        evalSrv("JSON.stringify((function (d) { return { id: d.id, name: d.name, loginId: d.loginId, t: createSession_(d.id, true).token }; })(driverById_('" + id + "')))").then(function (s) {
          var w = JSON.parse(s); ['', 'sbt:'].forEach(function (p) { LS.setItem(p + 'runner.token', w.t); LS.setItem(p + 'runner.user', JSON.stringify({ id: w.id, name: w.name, loginId: w.loginId })); });
          location.href = (IS_ADMIN ? '../' : './') + '?tst=' + Date.now();
        });
      };
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
  window.__TST = { boot: boot, evalSrv: evalSrv, real: realLS, realS: realSS };
})();
