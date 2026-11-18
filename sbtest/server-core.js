/*
 * 러너 올인원 수파베이스 서버 실행기 — 서버 함수(api) 안에서 돈다.
 *  - 서버 코드(엔진)는 그대로. 시트 자리는 메모리의 표(store.js)이고, 표는 DB 에서 필요한 탭만 받아 온다.
 *  - 호출마다: ① DB 에서 '그 뒤로 바뀐 것' 받기 ② 엔진 실행 ③ 바뀐 줄을 한 번에 저장 (다른 곳이 먼저 저장했으면 되돌리고 ①부터 다시)
 *  - 엔진이 아직 안 받은 탭을 읽으면 표시만 해 두고 계속 돈 뒤, 결과를 버리고 그 탭을 받아 다시 실행한다 (쓰기·캐시도 같이 버림)
 *  - 임시 기억(CacheService 자리): 작은 값(4KB 이하)은 DB(sb_cache)로 서버끼리 함께 쓴다 → 로그인 실패 횟수·30분에 한 번 표시·버전 표시가 서버가 바뀌어도 이어진다.
 *    큰 값(계산 결과)은 이 서버 안에만 두고, 다른 곳에서 자료가 바뀌면 버린다.
 *  - 파일(드라이브 자리): 목록은 DB(sb_files), 내용은 저장소. 엔진이 아직 안 받은 파일 내용을 읽으면 탭과 같은 방식으로 받아 와 다시 실행. 새 파일은 저장 전에 저장소에 올린다.
 *  env = { engine, gasNames, db: { sync(ver, cver, loaded, want), commit(ops, base), cachePut(list) }, storage: { get(id) → Uint8Array|null, put(id, bytes, mime) }, secrets, Date, now() }
 */
function sbMakeServer(env) {
  var BOOKS = { main: '러너 올인원 DB', sch: '러너 올인원 스케줄 DB', stl: '러너 올인원 정산 DB' };
  var PRE = ['main:sessions', 'main:admins', 'main:drivers', 'main:app_settings', 'main:ui_text']; // 거의 모든 호출이 읽는 탭은 처음부터 받는다
  var DEL = {}, BIG = 4096;
  var small = function (e) { return e && typeof e.v === 'string' && e.v.length <= BIG; };
  var secrets = env.secrets || {};
  var now = env.now || function () { return Date.now(); };
  var S = sbMakeStore();
  S.DateCls = env.Date || Date;
  // ── 캐시: 실행 중 쓰기는 따로 모았다가 실행이 받아들여질 때만 반영 ──
  var C = { main: new Map(), ov: null };
  var cacheMap = {
    get: function (k) { if (C.ov && C.ov.has(k)) { var v = C.ov.get(k); return v === DEL ? undefined : v; } return C.main.get(k); },
    set: function (k, v) { (C.ov || C.main).set(k, v); return cacheMap; },
    delete: function (k) { if (C.ov) C.ov.set(k, DEL); else C.main.delete(k); return true; },
    has: function (k) { return cacheMap.get(k) !== undefined; },
    forEach: function (f) { C.main.forEach(f); },
    get size() { return C.main.size; }
  };
  // ── 파일 (드라이브 자리): 목록은 메모리(DB 와 맞춤) · 내용은 저장소에서 필요할 때 받아 이 서버에 잠깐 둔다 ──
  var FS = { db: new Map(), ov: new Map(), up: new Map(), cache: new Map(), bytes: 0, need: new Set(), missing: new Set(), idx: null };
  var CACHE_MAX = 40 * 1024 * 1024;
  var byParent = function () { if (FS.idx) return FS.idx; FS.idx = new Map(); FS.db.forEach(function (r, id) { var k = r.parent || ''; var a = FS.idx.get(k); if (!a) FS.idx.set(k, a = []); a.push(id); }); return FS.idx; };
  var keep = function (id, b) { if (!b) return; var old = FS.cache.get(id); if (old) { FS.bytes -= old.length; FS.cache.delete(id); } FS.cache.set(id, b); FS.bytes += b.length; FS.cache.forEach(function (v, k) { if (FS.bytes > CACHE_MAX && k !== id) { FS.bytes -= v.length; FS.cache.delete(k); } }); };
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  var filesApi = {
    get: function (id) { return FS.ov.has(id) ? FS.ov.get(id) : FS.db.get(id) || null; },
    put: function (r) { FS.ov.set(r.id, r); },
    children: function (pid) {
      var out = new Map();
      (byParent().get(pid || '') || []).forEach(function (id) { out.set(id, FS.db.get(id)); });
      FS.ov.forEach(function (r, id) { if ((r.parent || '') === (pid || '')) out.set(id, r); else out.delete(id); });
      return Array.from(out.values());
    },
    content: function (id) {
      if (FS.up.has(id)) return FS.up.get(id);
      var c = FS.cache.get(id); if (c) return c;
      if (FS.missing.has(id)) { var e = new Error('파일 내용이 저장소에 없습니다'); e.userMsg = '파일 내용을 저장소에서 찾지 못했습니다. 다시 옮겨 주세요.'; throw e; }
      FS.need.add(id); return null;
    },
    setContent: function (id, b) { FS.up.set(id, b); },
    newId: function () { var u = crypto.getRandomValues(new Uint8Array(31)), o = 'sb'; for (var i = 0; i < u.length; i++) o += ABC[u[i] & 63]; return o; }
  };
  var fileRec = function (x) { return { id: x[0], name: x[1], mime: x[2], size: +x[3] || 0, parent: x[4], folder: !!x[5], trashed: !!x[6], stored: !!x[7], created: +x[8], updated: +x[9] }; };
  // ── 외부 연결 (알림 서버 등): 엔진이 부르면 표시만 하고 멈춤 → 서버 함수가 실제로 한 뒤 결과를 넣고 다시 실행 ──
  //  같은 호출 안에서 n번째 외부 요청 = 같은 내용이면 받아 둔 결과를 돌려준다 (다시 실행해도 두 번 보내지 않음)
  var X = { done: [], need: null, i: 0 };
  var extApi = env.ext ? function (kind, req) {
    var key = kind + '\n' + JSON.stringify(req), i = X.i++;
    if (i < X.done.length) { if (X.done[i].key === key) return X.done[i].res; X.done.length = i; }
    if (!X.need) X.need = { i: i, kind: kind, req: req, key: key };
    var e = new Error('외부 연결 기다리는 중'); e.sbExt = true; throw e;
  } : null;
  var G = sbMakeGas(S, { cache: cacheMap, Date: S.DateCls, ref: env.ref || '', files: env.storage ? filesApi : null, ext: extApi });
  var R = {
    ver: null,             // DB 의 이 시점까지 반영됨 (자료)
    cver: null,            // 함께 쓰는 임시 기억은 이 시점까지
    meta: new Map(),       // DB 에 있는 탭: uid → [uid, book, tab, ord, max_rows, max_cols]
    props: {},             // DB 의 설정값
    tab: new Map(),        // 메모리의 탭 객체: uid → tab
    touched: new Map(),    // 이번 실행에서 손댄 탭
    need: new Set(),       // 이번 실행에서 읽으려 했는데 아직 안 받은 탭
    want: new Set(),       // 다음 받기 때 줄 전체를 받을 탭
    learn: {},             // 기능별로 필요했던 탭 (book:name) → 다음부터 한 번에
    chain: Promise.resolve(),
    stat: { runs: 0, conflicts: 0, loads: 0 }
  };
  S.onTouch = function (t) { R.touched.set(t.uid, t); };
  var keyOf = function (t) { return t.book + ':' + t.name; };
  function mkTab(m) {
    var t = { uid: m[0], book: m[1], name: m[2], ord: m[3], maxRows: m[4], maxCols: m[5], _rows: null, _tmp: null, lc: -1 };
    Object.defineProperty(t, 'rows', {
      get: function () { if (this._rows) return this._rows; R.need.add(this.uid); return this._tmp || (this._tmp = []); },
      set: function (v) { this._rows = v; }, enumerable: false, configurable: true
    });
    return t;
  }
  var loaded = function () { var o = []; R.tab.forEach(function (t, u) { if (t._rows && R.meta.has(u)) o.push(u); }); return o; };
  /** 메모리 모습을 DB 모습(meta·props)에 맞춘다. 손댄 탭은 줄을 버리고 다시 받게 한다 */
  function rebuild() {
    var books = {};
    R.meta.forEach(function (m, uid) {
      var t = R.tab.get(uid);
      if (!t || R.touched.has(uid)) {
        if (t && t._rows && !t.isNew) R.want.add(uid); // 손대기 전에 받아 둔 탭 → 다시 받기
        t = mkTab(m); R.tab.set(uid, t);
      } else { t.name = m[2]; t.ord = m[3]; t.maxRows = m[4]; t.maxCols = m[5]; }
      t._tmp = null;
      (books[m[1]] = books[m[1]] || []).push(t);
    });
    R.tab.forEach(function (t, uid) { if (!R.meta.has(uid)) R.tab.delete(uid); });
    Object.keys(S.books).forEach(function (b) { if (!books[b]) delete S.books[b]; });
    Object.keys(books).forEach(function (b) { S.book(b, BOOKS[b]).tabs = books[b].sort(function (x, y) { return x.ord - y.ord; }); });
    S.props = Object.assign({}, R.props, secrets);
    S.dirty = { rows: new Map(), tabs: new Map(), props: new Map() };
    R.touched.clear(); R.need.clear(); C.ov = null;
    FS.ov.clear(); FS.up.clear(); FS.need.clear();
  }
  /** DB 에서 받은 것 반영 */
  function apply(d, want) {
    var changed = d.head !== R.ver;
    (d.tabs || []).forEach(function (m) { R.meta.set(m[0], m); });
    var goneRows = new Set();
    (d.gone || []).forEach(function (g) { if (g[0] === 'tab') R.meta.delete(g[1]); else if (g[0] === 'prop') delete R.props[g[1]]; else goneRows.add(g[1]); });
    Object.keys(d.props || {}).forEach(function (k) { R.props[k] = d.props[k]; });
    var byTab = {};
    (d.rows || []).forEach(function (x) { (byTab[x[0]] = byTab[x[0]] || []).push(x); });
    rebuild();
    want.forEach(function (u) { var t = R.tab.get(u); if (t) { t._rows = (byTab[u] || []).map(function (x) { return { id: x[1], pos: x[2], c: S.decCells(x[3] || []) }; }); t.lc = -1; R.stat.loads++; } delete byTab[u]; });
    Object.keys(byTab).forEach(function (u) {
      var t = R.tab.get(u); if (!t || !t._rows) return;
      var idx = new Map(); t._rows.forEach(function (r, i) { idx.set(r.id, i); });
      var resort = false;
      byTab[u].forEach(function (x) {
        var i = idx.get(x[1]), cells = S.decCells(x[3] || []);
        if (i === undefined) { t._rows.push({ id: x[1], pos: x[2], c: cells }); resort = true; }
        else { var r = t._rows[i]; if (r.pos !== x[2]) { r.pos = x[2]; resort = true; } r.c = cells; }
      });
      if (resort) t._rows.sort(function (a, b) { return a.pos - b.pos; });
      t.lc = -1;
    });
    if (goneRows.size) R.tab.forEach(function (t) { if (t._rows) { var n = t._rows.length; t._rows = t._rows.filter(function (r) { return !goneRows.has(r.id); }); if (n !== t._rows.length) t.lc = -1; } });
    if (d.files && d.files.length) { d.files.forEach(function (x) { FS.db.set(x[0], fileRec(x)); FS.missing.delete(x[0]); }); FS.idx = null; }
    (d.cache || []).forEach(function (x) { if (x[1] == null) C.main.delete(x[0]); else C.main.set(x[0], { v: x[1], x: +x[2] }); });
    if (d.chead != null) R.cver = d.chead;
    // 다른 곳에서 자료가 바뀌었으면 이 서버에만 둔 큰 계산 결과는 버린다 (작은 값은 DB 와 함께 맞춰져 있음)
    if (changed && R.ver != null) C.main.forEach(function (e, k) { if (!small(e)) C.main.delete(k); });
    R.ver = d.head;
  }
  async function sync() {
    var want = Array.from(R.want); R.want.clear();
    var d = await env.db.sync(R.ver, R.cver, R.ver == null ? [] : loaded(), want);
    apply(d, want);
  }
  /** 이번 실행을 받아들임: 메모리 모습 = DB 모습 */
  function accept() {
    R.meta = new Map();
    Object.keys(S.books).forEach(function (b) {
      var list = S.books[b].tabs;
      list.forEach(function (t, i) {
        var m = [t.uid, t.book, t.name, t.ord, t.maxRows, t.maxCols];
        if (t.isNew) { var nt = mkTab(m); nt._rows = t.rows; list[i] = nt; t = nt; } // 이번에 새로 만든 탭 → 다른 탭과 같은 모양으로
        R.meta.set(t.uid, m); R.tab.set(t.uid, t);
      });
    });
    R.tab.forEach(function (t, u) { if (!R.meta.has(u)) R.tab.delete(u); });
    R.props = {}; Object.keys(S.props).forEach(function (k) { if (!(k in secrets)) R.props[k] = S.props[k]; });
    var ship = [];
    if (C.ov) {
      C.ov.forEach(function (v, k) {
        var had = C.main.get(k);
        if (v === DEL) { C.main.delete(k); if (small(had)) ship.push({ k: k, v: null, exp: Date.now() + 864e5 }); }
        else { C.main.set(k, v); if (small(v)) ship.push({ k: k, v: v.v, exp: v.x }); else if (small(had)) ship.push({ k: k, v: null, exp: Date.now() + 864e5 }); }
      });
      C.ov = null;
    }
    if (FS.ov.size) { FS.ov.forEach(function (r, id) { FS.db.set(id, r); }); FS.idx = null; }
    FS.up.forEach(function (b, id) { keep(id, b); });
    FS.ov.clear(); FS.up.clear(); FS.need.clear();
    R.touched.clear(); R.need.clear();
    S.dirty = { rows: new Map(), tabs: new Map(), props: new Map() };
    return ship;
  }
  async function shipCache(list, T) { if (!list.length || !env.db.cachePut) return; var t = now(); try { await env.db.cachePut(list); } catch (e) { /* 다음 기회에 */ } if (T) T.db += now() - t; }
  // ── 엔진 ──
  var fresh = function () { return env.engine.apply(null, [{}].concat(env.gasNames.map(function (n) { return G[n]; }))); };
  function runOnce(fn, args, mode) {
    C.ov = new Map(); R.touched.clear(); R.need.clear(); X.i = 0; X.need = null;
    var out;
    try {
      var g = fresh();
      if (mode === 'login') out = g.__sbLogin(args[0], args[2]);
      else if (mode === 'eval') out = g.__sbEval(args[0]);
      else if (mode === 'cron') { var r0 = g[fn](); out = r0 === undefined ? null : r0; }
      else out = JSON.parse(g.doPost({ postData: { contents: JSON.stringify({ fn: fn, args: args }) } }).getContent());
    } catch (e) { out = { ok: false, msg: '서버 오류: ' + String(e && e.message || e) }; }
    return out;
  }
  function opsOf() {
    var ops = S.takeDirty() || { rows: [], delRows: [], tabs: [], delTabs: [], props: [], delProps: [] };
    ops.props = ops.props.filter(function (x) { return !(x.k in secrets); });
    ops.delProps = ops.delProps.filter(function (k) { return !(k in secrets); });
    ops.files = Array.from(FS.ov.values()).map(function (r) { return { id: r.id, name: r.name, mime: r.mime, size: r.size, parent: r.parent || null, folder: !!r.folder, trashed: !!r.trashed, stored: !!r.stored }; });
    return ops.rows.length + ops.delRows.length + ops.tabs.length + ops.delTabs.length + ops.props.length + ops.delProps.length + ops.files.length ? ops : null;
  }
  /** 호출 하나 처리 (이 서버 함수 안에서는 한 번에 하나씩) */
  function call(fn, args, mode) {
    var p = R.chain.then(function () { return call0(fn, args, mode); });
    R.chain = p.catch(function () {});
    return p;
  }
  async function call0(fn, args, mode) {
    var T = { db: 0, eng: 0, runs: 0, conflicts: 0 }, t;
    X.done = []; X.need = null;
    (R.learn[fn] || []).forEach(function (k) { R.tab.forEach(function (x, u) { if (!x._rows && keyOf(x) === k) R.want.add(u); }); });
    for (var a = 0; a < 20; a++) {
      t = now(); await sync(); T.db += now() - t;
      t = now(); var out = runOnce(fn, args, mode); T.eng += now() - t; T.runs++;
      if (R.need.size || FS.need.size || X.need) {
        var xn = X.need;
        var L = R.learn[fn] || (R.learn[fn] = []);
        R.need.forEach(function (u) { R.want.add(u); var x = R.tab.get(u); if (x && L.indexOf(keyOf(x)) < 0) L.push(keyOf(x)); });
        var nf = Array.from(FS.need);
        rebuild();
        if (xn) { t = now(); var xr; try { xr = await env.ext(xn.kind, xn.req); } catch (e) { xr = { code: 0, err: String(e && e.message || e), text: '', headers: {} }; } X.done[xn.i] = { key: xn.key, res: xr }; T.ext = (T.ext || 0) + now() - t; }
        if (nf.length) { t = now(); await Promise.all(nf.map(function (id) { return env.storage.get(id).then(function (b) { if (b) keep(id, b); else FS.missing.add(id); }, function () { FS.missing.add(id); }); })); T.files = (T.files || 0) + now() - t; }
        continue;
      }
      var ops = opsOf();
      if (!ops) { await shipCache(accept(), T); return { out: out, T: T }; }
      if (FS.up.size) { t = now(); var ups = []; FS.up.forEach(function (b, id) { var r = filesApi.get(id) || {}; ups.push(env.storage.put(id, b, r.mime || 'application/octet-stream')); }); await Promise.all(ups); T.files = (T.files || 0) + now() - t; }
      t = now(); var c = await env.db.commit(ops, R.ver); T.db += now() - t;
      if (c && c.conflict) { T.conflicts++; R.stat.conflicts++; rebuild(); continue; }
      R.ver = c.head; await shipCache(accept(), T); R.stat.runs++;
      T.saved = ops.rows.length + ops.delRows.length;
      return { out: out, T: T };
    }
    rebuild();
    return { out: { ok: false, code: 'BUSY', msg: '다른 저장 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.' }, T: T };
  }
  /** 처음: 탭 목록·설정값 + 자주 쓰는 탭. 서버 설정값(DB_ID 등)이 없으면 넣는다 */
  async function init() {
    var d = await env.db.sync(null, null, [], []);
    apply(d, []);
    R.tab.forEach(function (x, u) { if (PRE.indexOf(keyOf(x)) >= 0) R.want.add(u); });
    var want = { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1' }, props = [];
    Object.keys(want).forEach(function (k) { if (R.props[k] !== want[k]) props.push({ k: k, v: want[k] }); });
    ['ENC_KEY', 'MAC_KEY', 'PEPPER'].forEach(function (k) { if (!(k in secrets) && !R.props[k]) props.push({ k: k, v: G.Utilities.base64Encode(Array.from(crypto.getRandomValues(new Uint8Array(32)))) }); });
    if (props.length) { var c = await env.db.commit({ rows: [], delRows: [], tabs: [], delTabs: [], props: props, delProps: [] }, R.ver); if (c && c.head) { props.forEach(function (x) { R.props[x.k] = x.v; }); R.ver = c.head; rebuild(); } }
  }
  var ready = null;
  return {
    call: function (fn, args, mode) { if (!ready) { ready = init(); ready.catch(function () { ready = null; }); } return ready.then(function () { return call(fn, args, mode); }); },
    reset: function () { R.chain = R.chain.then(function () { R.ver = null; R.cver = null; FS.db = new Map(); FS.idx = null; R.meta = new Map(); R.props = {}; R.tab = new Map(); R.want.clear(); C.main.clear(); Object.keys(S.books).forEach(function (b) { delete S.books[b]; }); ready = null; }); return R.chain; },
    stat: function () { var n = 0, rows = 0; R.tab.forEach(function (t) { if (t._rows) { n++; rows += t._rows.length; } }); return { ver: R.ver, tabs: R.meta.size, loadedTabs: n, rows: rows, runs: R.stat.runs, conflicts: R.stat.conflicts, loads: R.stat.loads, files: FS.db.size, fileCacheMB: Math.round(FS.bytes / 1048576 * 10) / 10 }; },
    _R: R, _S: S
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeServer: sbMakeServer };
