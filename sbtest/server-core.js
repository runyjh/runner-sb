/*
 * 러너 올인원 수파베이스 서버 실행기 — 서버 함수(api) 안에서 돈다.
 *  - 서버 코드(엔진)는 그대로. 시트 자리는 메모리의 표(store.js)이고, 표는 DB 에서 필요한 탭만 받아 온다.
 *  - 호출마다: ① DB 에서 '그 뒤로 바뀐 것' 받기 ② 엔진 실행 ③ 바뀐 줄을 한 번에 저장 (다른 곳이 먼저 저장했으면 되돌리고 ①부터 다시)
 *  - 엔진이 아직 안 받은 탭을 읽으면 표시만 해 두고 계속 돈 뒤, 결과를 버리고 그 탭을 받아 다시 실행한다 (쓰기·캐시도 같이 버림)
 *  env = { engine, gasNames, db: { sync(ver, loaded, want), commit(ops, base) }, secrets: {이름: 값}, Date, now(), log(msg) }
 */
function sbMakeServer(env) {
  var BOOKS = { main: '러너 올인원 DB', sch: '러너 올인원 스케줄 DB', stl: '러너 올인원 정산 DB' };
  var PRE = ['main:sessions', 'main:admins', 'main:drivers', 'main:app_settings', 'main:ui_text']; // 거의 모든 호출이 읽는 탭은 처음부터 받는다
  var DEL = {};
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
  var G = sbMakeGas(S, { cache: cacheMap, Date: S.DateCls, ref: env.ref || '' });
  var R = {
    ver: null,             // DB 의 이 시점까지 반영됨
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
    R.ver = d.head;
    if (changed) C.main.clear(); // 다른 곳에서 바뀐 게 있으면 캐시에 남은 계산 결과는 버린다
  }
  async function sync() {
    var want = Array.from(R.want); R.want.clear();
    var d = await env.db.sync(R.ver, R.ver == null ? [] : loaded(), want);
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
    if (C.ov) { C.ov.forEach(function (v, k) { if (v === DEL) C.main.delete(k); else C.main.set(k, v); }); C.ov = null; }
    R.touched.clear(); R.need.clear();
    S.dirty = { rows: new Map(), tabs: new Map(), props: new Map() };
  }
  // ── 엔진 ──
  var fresh = function () { return env.engine.apply(null, [{}].concat(env.gasNames.map(function (n) { return G[n]; }))); };
  function runOnce(fn, args, mode) {
    C.ov = new Map(); R.touched.clear(); R.need.clear();
    var out;
    try {
      var g = fresh();
      if (mode === 'login') out = g.__sbLogin(args[0], args[2]);
      else if (mode === 'eval') out = g.__sbEval(args[0]);
      else out = JSON.parse(g.doPost({ postData: { contents: JSON.stringify({ fn: fn, args: args }) } }).getContent());
    } catch (e) { out = { ok: false, msg: '서버 오류: ' + String(e && e.message || e) }; }
    return out;
  }
  function opsOf() {
    var ops = S.takeDirty(); if (!ops) return null;
    ops.props = ops.props.filter(function (x) { return !(x.k in secrets); });
    ops.delProps = ops.delProps.filter(function (k) { return !(k in secrets); });
    return ops.rows.length + ops.delRows.length + ops.tabs.length + ops.delTabs.length + ops.props.length + ops.delProps.length ? ops : null;
  }
  /** 호출 하나 처리 (이 서버 함수 안에서는 한 번에 하나씩) */
  function call(fn, args, mode) {
    var p = R.chain.then(function () { return call0(fn, args, mode); });
    R.chain = p.catch(function () {});
    return p;
  }
  async function call0(fn, args, mode) {
    var T = { db: 0, eng: 0, runs: 0, conflicts: 0 }, t;
    (R.learn[fn] || []).forEach(function (k) { R.tab.forEach(function (x, u) { if (!x._rows && keyOf(x) === k) R.want.add(u); }); });
    for (var a = 0; a < 12; a++) {
      t = now(); await sync(); T.db += now() - t;
      t = now(); var out = runOnce(fn, args, mode); T.eng += now() - t; T.runs++;
      if (R.need.size) {
        var L = R.learn[fn] || (R.learn[fn] = []);
        R.need.forEach(function (u) { R.want.add(u); var x = R.tab.get(u); if (x && L.indexOf(keyOf(x)) < 0) L.push(keyOf(x)); });
        rebuild(); continue;
      }
      var ops = opsOf();
      if (!ops) { accept(); return { out: out, T: T }; }
      t = now(); var c = await env.db.commit(ops, R.ver); T.db += now() - t;
      if (c && c.conflict) { T.conflicts++; R.stat.conflicts++; rebuild(); continue; }
      R.ver = c.head; accept(); R.stat.runs++;
      T.saved = ops.rows.length + ops.delRows.length;
      return { out: out, T: T };
    }
    rebuild();
    return { out: { ok: false, code: 'BUSY', msg: '다른 저장 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.' }, T: T };
  }
  /** 처음: 탭 목록·설정값 + 자주 쓰는 탭. 서버 설정값(DB_ID 등)이 없으면 넣는다 */
  async function init() {
    var d = await env.db.sync(null, [], []);
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
    reset: function () { R.chain = R.chain.then(function () { R.ver = null; R.meta = new Map(); R.props = {}; R.tab = new Map(); R.want.clear(); C.main.clear(); Object.keys(S.books).forEach(function (b) { delete S.books[b]; }); ready = null; }); return R.chain; },
    stat: function () { var n = 0, rows = 0; R.tab.forEach(function (t) { if (t._rows) { n++; rows += t._rows.length; } }); return { ver: R.ver, tabs: R.meta.size, loadedTabs: n, rows: rows, runs: R.stat.runs, conflicts: R.stat.conflicts, loads: R.stat.loads }; },
    _R: R, _S: S
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeServer: sbMakeServer };
