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
    newId: function () { return replay('id', function () { var u = crypto.getRandomValues(new Uint8Array(31)), o = 'sb'; for (var i = 0; i < u.length; i++) o += ABC[u[i] & 63]; return o; }); }
  };
  var fileRec = function (x) { return { id: x[0], name: x[1], mime: x[2], size: +x[3] || 0, parent: x[4], folder: !!x[5], trashed: !!x[6], stored: !!x[7], created: +x[8], updated: +x[9] }; };
  // ── 외부 연결 (알림 서버 등): 엔진이 부르면 표시만 하고 멈춤 → 서버 함수가 실제로 한 뒤 결과를 넣고 다시 실행 ──
  //  같은 호출 안에서 n번째 외부 요청 = 같은 내용이면 받아 둔 결과를 돌려준다 (다시 실행해도 두 번 보내지 않음)
  //  같은 호출 안에서는 요청 내용이 같으면 받아 둔 결과를 돌려준다 (다시 실행해도 두 번 보내지 않음)
  //  한 번 실행에서 모자란 요청을 모두 모아 한꺼번에 보낸다 (알림 여러 건 = 한 번)
  var X = { memo: new Map(), need: new Map(), off: false, post: [] };
  // (S110) 휴대폰 알림(FCM 보내기)은 저장이 끝난 뒤에 실제로 보낸다: 실행 중에는 「보냄」으로 답만 하고 모아 둠 → 저장 성공 뒤 보내고 결과는 pmPushResult_ 로
  //  (예전: 실행 중 바로 보내서, 저장 충돌로 다시 실행해 취소된 「배차 확정」 알림도 나갔음) · 알림 시험(kind test)은 결과를 바로 봐야 해서 그대로
  var fcmLater = function (req) {
    if (!Array.isArray(req) || !req.length) return false;
    return req.every(function (q) { if (!/^https:\/\/fcm\.googleapis\.com\/v1\/projects\/[^/]+\/messages:send$/.test(String(q && q.url || ''))) return false; try { return JSON.parse(q.body).message.data.kind !== 'test'; } catch (e) { return false; } });
  };
  var extApi = env.ext ? function (kind, req) {
    if (X.off) throw new Error('점검 중에는 외부 연결을 하지 않습니다');
    if (kind === 'fetchAll' && fcmLater(req)) { X.post.push(req); return req.map(function () { return { code: 200, text: '{}', headers: { 'x-sb-later': '1' } }; }); }
    var key = kind + '\n' + JSON.stringify(req);
    if (X.memo.has(key)) return X.memo.get(key);
    if (!X.need.has(key)) X.need.set(key, { kind: kind, req: req });
    var e = new Error('외부 연결 기다리는 중'); e.sbExt = true; throw e;
  } : null;
  // ── 다시 실행해도 같은 결과: 난수(번호 만들기)와 시각을 첫 실행 것 그대로 되풀이 ──
  //  (새 품앗이 번호가 실행마다 달라지면 알림 내용이 달라져 외부 연결을 다시 하게 됨)
  // 종류별로 따로 되풀이 (S28): 예전엔 번호 · 난수 · uuid 가 한 줄에 섞여, 다시 실행할 때 부르는 순서가 바뀌면 uuid 자리에 난수(0.55…)가 들어가
  //  새 탭 번호가 'invalid input syntax for type uuid' 로 실패했다 (11/18 18:05 처음 가는 노선 알림)
  var RND = { pools: {}, idx: {}, t0: 0, s0: 0 };
  var rawUuid = S.uuid;
  var replay = function (k, make) { var p = RND.pools[k] || (RND.pools[k] = []), i = RND.idx[k] || 0; RND.idx[k] = i + 1; if (i < p.length) return p[i]; var v = make(); p.push(v); return v; };
  S.uuid = function () { return replay('uuid', rawUuid); };
  var MathR = Object.create(Math); MathR.random = function () { return replay('rnd', Math.random); };
  var realNow = function () { return Date.now(); };
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
  // (S37) 기록 탭 끝에 한 줄 붙이기: 아직 안 받은 탭이면 줄 전체(수천 줄)를 받지 않고 새 줄만 보낸다
  //  · 줄 순서(pos) = 지금 시각 기준 → 늘 맨 끝 · 탭을 받은 실행은 원래대로(appendRow) · 다시 실행되면 rebuild 가 버리고 새로 만든다
  var FAST_APPEND = ['main:admin_log'];
  S.appendFast = function (t, arr) {
    if (!t || t._rows || t.isNew || FAST_APPEND.indexOf(keyOf(t)) < 0) return false;
    R.fseq = ((R.fseq || 0) + 1) % 1000;
    // 순서 = 지금 시각(ms) × 1024 + 번호 → 탭을 받은 서버가 붙이는 줄(마지막 + 1024 = 1ms 뒤)과도 시간 순서가 맞는다 (2^53 안)
    var r = { id: S.uuid(), pos: realNow() * 1024 + R.fseq, c: (arr.length ? arr : ['']).slice(), fresh: true };
    S.markRow(t, r);
    t.maxRows += 1; if (arr.length > t.maxCols) t.maxCols = arr.length; S.markTab(t);
    return true;
  };
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
  var fresh = function () { return env.engine.apply(null, [{}].concat(env.gasNames.map(function (n) { return n === 'Math' ? MathR : G[n]; }))); };
  function runOnce(fn, args, mode) {
    C.ov = new Map(); R.touched.clear(); R.need.clear(); X.need = new Map(); X.post = [];
    // 시각: 한 호출 안에서는 호출을 시작한 시각 그대로 (다시 실행해도 같은 시각 → 같은 결과). 서버 코드 안의 '걸린 시간' 표시는 0 이 됨
    RND.idx = {}; if (S.DateCls.__setClock) S.DateCls.__setClock(function () { return RND.t0; });
    var out;
    try {
      var g = fresh();
      if (mode === 'login') out = g.__sbLogin(args[0], args[2]);
      else if (mode === 'eval' || mode === 'dry') out = g.__sbEval(args[0]);
      else if (mode === 'cron') { var r0 = g[fn](); out = r0 === undefined ? null : r0; }
      else out = JSON.parse(g.doPost({ postData: { contents: JSON.stringify({ fn: fn, args: args }) } }).getContent());
    } catch (e) { out = { ok: false, msg: '서버 오류: ' + String(e && e.message || e) }; }
    if (S.DateCls.__setClock) S.DateCls.__setClock(null);
    return out;
  }
  function opsOf() {
    var ops = S.takeDirty() || { rows: [], delRows: [], tabs: [], delTabs: [], props: [], delProps: [] };
    ops.props = ops.props.filter(function (x) { return !(x.k in secrets); });
    ops.delProps = ops.delProps.filter(function (k) { return !(k in secrets); });
    ops.files = Array.from(FS.ov.values()).map(function (r) { return { id: r.id, name: r.name, mime: r.mime, size: r.size, parent: r.parent || null, folder: !!r.folder, trashed: !!r.trashed, stored: !!r.stored }; });
    return ops.rows.length + ops.delRows.length + ops.tabs.length + ops.delTabs.length + ops.props.length + ops.delProps.length + ops.files.length ? ops : null;
  }
  // ── (S43) 기능별 필요한 탭 목록을 DB 에 기억 (설정값 __learn) ──
  //  서버 함수는 길어야 200초마다 새로 시작한다 → 그때마다 '실행 → 탭이 없네 → 받고 다시 실행' 을 되풀이하던 것을, 새 서버도 첫 실행 전에 한 번에 받게
  //  · 큰 기록 탭(4,000줄 넘음: 정산 원본 · 속도 기록 등)은 적지 않는다 (꼭 필요할 때만 받게) · 묶음 호출은 들어 있는 기능 이름으로 구분
  var LEARN_KEY = '__learn', LEARN_BIG = 4000, LEARN_MAX = 60000;
  var LP = { raw: null, obj: {}, dirty: false, at: 0 };
  var learnKey = function (fn, args) {
    if ((fn !== 'adm_batch' && fn !== 'api_batch') || !args || !Array.isArray(args[1])) return fn; // (S148) 기사앱 묶음(api_batch)도 같은 방식
    var names = {}; args[1].forEach(function (c) { if (c && c.fn) names[String(c.fn)] = 1; });
    return fn + ':' + Object.keys(names).sort().join(',');
  };
  /** DB 에 적힌 목록을 읽어 이 서버의 목록에 더한다 (다른 서버가 배운 것도 같이) */
  function learnPull() {
    var raw = R.props[LEARN_KEY] || '';
    if (raw === LP.raw) return;
    LP.raw = raw; LP.obj = {};
    try { var o = JSON.parse(raw || '{}'); if (o && typeof o === 'object') LP.obj = o; } catch (e) { LP.obj = {}; }
    Object.keys(LP.obj).forEach(function (k) {
      if (!Array.isArray(LP.obj[k])) return;
      var L = R.learn[k] || (R.learn[k] = []);
      LP.obj[k].forEach(function (t) { if (typeof t === 'string' && L.indexOf(t) < 0) L.push(t); });
    });
  }
  /** 새로 배운 것이 있으면 DB 에 적는다 (20초에 한 번 · 응답을 보낸 뒤 · 실패해도 그만) */
  async function learnPush() {
    if (!LP.dirty || realNow() - LP.at < 20000 || R.ver == null) return;
    LP.at = realNow(); LP.dirty = false;
    learnPull();
    var big = {}; R.tab.forEach(function (x) { if (x.maxRows > LEARN_BIG) big[keyOf(x)] = 1; });
    var out = {}, changed = false;
    Object.keys(R.learn).sort().forEach(function (k) {
      if (!k) return;
      var have = Array.isArray(LP.obj[k]) ? LP.obj[k] : [], list = have.slice();
      R.learn[k].forEach(function (t) { if (!big[t] && list.indexOf(t) < 0) { list.push(t); changed = true; } });
      if (list.length) out[k] = list;
    });
    if (!changed) return;
    var json = JSON.stringify(out);
    if (json.length > LEARN_MAX) { Object.keys(out).forEach(function (k) { if (k.indexOf('adm_batch:') === 0 || k.indexOf('api_batch:') === 0) delete out[k]; }); json = JSON.stringify(out); } // 너무 커지면 묶음 호출 것부터 버림
    if (json.length > LEARN_MAX) return;
    var c = null;
    try { c = await env.db.commit({ rows: [], delRows: [], tabs: [], delTabs: [], props: [{ k: LEARN_KEY, v: json }], delProps: [] }, R.ver); } catch (e) { c = null; }
    if (c && c.head) { R.props[LEARN_KEY] = json; R.ver = c.head; rebuild(); LP.raw = json; LP.obj = out; }
    else LP.dirty = true; // 다른 저장과 겹쳤으면 다음에 다시
  }
  /** 호출 하나 처리 (이 서버 함수 안에서는 한 번에 하나씩) */
  function call(fn, args, mode) {
    var post = null;
    var p = R.chain.then(function () { return call0(fn, args, mode); }).then(function (r) { if (r && r._post) { post = r._post; delete r._post; } return r; });
    R.chain = p.catch(function () {}).then(function () { return mode === 'dry' ? null : learnPush(); }).catch(function () {})
      .then(function () { if (post && post.length) return sendLater({}, post); }).catch(function () {}); // (S116) 휴대폰 알림은 답을 돌려준 뒤에 보냄 (다음 요청보다는 먼저)
    if (env.bg) { try { env.bg(R.chain); } catch (e) { /* 무시 */ } }
    return p;
  }
  async function call0(fn, args, mode) {
    var T = { db: 0, eng: 0, runs: 0, conflicts: 0 }, t;
    X.memo = new Map(); X.need = new Map(); X.off = mode === 'dry';
    RND.pools = {}; RND.idx = {}; RND.t0 = realNow();
    learnPull();
    var lk = learnKey(fn, args);
    (R.learn[lk] || []).forEach(function (k) { R.tab.forEach(function (x, u) { if (!x._rows && keyOf(x) === k) R.want.add(u); }); });
    for (var a = 0; a < 20; a++) {
      t = now(); await sync(); T.db += now() - t;
      t = now(); var out = runOnce(fn, args, mode); T.eng += now() - t; T.runs++;
      if (R.need.size || FS.need.size || X.need.size) {
        var xn = Array.from(X.need.entries());
        var L = R.learn[lk] || (R.learn[lk] = []);
        R.need.forEach(function (u) { R.want.add(u); var x = R.tab.get(u); if (x) (T.load = T.load || []).push(keyOf(x)); if (x && L.indexOf(keyOf(x)) < 0) { L.push(keyOf(x)); if (lk && mode !== 'dry') LP.dirty = true; } });
        var nf = Array.from(FS.need);
        rebuild();
        if (xn.length) { t = now(); await Promise.all(xn.map(function (x) { return Promise.resolve().then(function () { return env.ext(x[1].kind, x[1].req); }).catch(function (e) { return { code: 0, err: String(e && e.message || e), text: '', headers: {} }; }).then(function (res) { X.memo.set(x[0], res); }); })); T.ext = (T.ext || 0) + now() - t; T.extN = (T.extN || 0) + xn.length; }
        if (nf.length) { t = now(); await Promise.all(nf.map(function (id) { return env.storage.get(id).then(function (b) { if (b) keep(id, b); else FS.missing.add(id); }, function () { FS.missing.add(id); }); })); T.files = (T.files || 0) + now() - t; }
        continue;
      }
      // 점검(dry): 읽기만 — 실행 중 생긴 쓰기·임시 기억은 모두 버린다 (DB 에 아무것도 남기지 않음)
      if (mode === 'dry') { var dz = opsOf(); rebuild(); T.dropped = dz ? dz.rows.length + dz.delRows.length + dz.tabs.length + dz.props.length + dz.files.length : 0; return { out: out, T: T }; }
      var ops = opsOf();
      if (!ops) { await shipCache(accept(), T); return laterOut(out, T); }
      if (FS.up.size) { t = now(); var ups = []; FS.up.forEach(function (b, id) { var r = filesApi.get(id) || {}; ups.push(env.storage.put(id, b, r.mime || 'application/octet-stream')); }); await Promise.all(ups); T.files = (T.files || 0) + now() - t; }
      t = now(); var c = await env.db.commit(ops, R.ver); T.db += now() - t;
      if (c && c.conflict) { T.conflicts++; R.stat.conflicts++; rebuild(); continue; }
      R.ver = c.head; await shipCache(accept(), T); R.stat.runs++;
      T.saved = ops.rows.length + ops.delRows.length;
      return laterOut(out, T);
    }
    rebuild();
    return { out: { ok: false, code: 'BUSY', msg: '다른 저장 작업이 처리 중입니다. 잠시 후 다시 시도해 주세요.' }, T: T };
  }
  /** (S110) 저장이 끝난 뒤: 모아 둔 휴대폰 알림을 실제로 보내고, 결과(없어진 기기 · 마지막 전송 · 하루 합계)를 엔진에 넘겨 정리 */
  // (S116) 서버 함수가 답을 돌려준 뒤에도 일을 이어 갈 수 있으면(env.bg) 휴대폰 알림은 그때 보냄 → 일감 올리기 등이 알림 보내는 동안 기다리지 않음 · 없으면(시험) 그 자리에서
  async function laterOut(out, T) {
    var post = X.post; X.post = [];
    if (!post.length) return { out: out, T: T };
    if (env.bg) { T.pushLater = [].concat.apply([], post).length; return { out: out, T: T, _post: post }; }
    await sendLater(T, post);
    return { out: out, T: T };
  }
  async function sendLater(T, post) {
    if (!post || !post.length || !env.ext) return;
    var t = now(), list = [].concat.apply([], post), res = [];
    try { res = await env.ext('fetchAll', list); } catch (e) { res = []; }
    // (S116) 알림 서버가 401(열쇠 만료)이면 열쇠를 새로 받아 그 알림만 한 번 더 (예전: 그 묶음 전체 누락)
    var bad = []; (res || []).forEach(function (x, i) { if (x && x.code === 401) bad.push(i); });
    if (bad.length) {
      try {
        var tk = await call0('', ["cache_().remove('fcm:at'); pmFcmToken_(pmPushCfg_().sa)"], 'eval');
        var at = tk && typeof tk.out === 'string' ? tk.out : '';
        if (at) {
          var again = bad.map(function (i) { var q = JSON.parse(JSON.stringify(list[i])); q.headers = Object.assign({}, q.headers || {}, { Authorization: 'Bearer ' + at }); return q; });
          var r2 = await env.ext('fetchAll', again);
          bad.forEach(function (i, k) { if (r2 && r2[k]) res[i] = r2[k]; });
          T.retry401 = bad.length;
        }
      } catch (e) { /* 다음 기회에 */ }
    }
    T.push = (T.push || 0) + now() - t; T.pushN = list.length;
    var R = list.map(function (q, i) { var tok = '', mid = ''; try { var m = JSON.parse(q.body).message; tok = m.token; mid = (m.data && m.data.mid) || ''; } catch (e) { tok = ''; } var x = (res && res[i]) || { code: 0, text: '' }; return { token: tok, mid: mid, code: x.code || 0, text: String(x.text || x.err || '').slice(0, 300) }; });
    try { await call0('', ['JSON.stringify(pmPushResult_(' + JSON.stringify(R) + '))'], 'eval'); } catch (e) { /* 정리는 다음 기회에 */ }
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
