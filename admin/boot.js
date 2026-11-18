/*
 * 러너 올인원 관리자 — 수파베이스판 (화면 쪽)
 *  - 관리자 화면(Admin.html)은 그대로. 서버(구글 앱스 스크립트)로 가던 호출만 가로채 수파베이스 서버 함수(api)로 보낸다.
 *  - 계산·저장은 전부 수파베이스 서버에서 한다. 이 화면은 표를 직접 읽거나 쓰지 않는다. 구글 시트 원본에는 아무것도 쓰지 않는다.
 */
(function () {
  'use strict';
  var CFG = window.SB_CFG, API = 'https://sb.invalid/exec';
  // ── 운영 관리자앱과 같은 주소(runyjh.github.io)를 쓰므로 브라우저 보관함을 따로 쓴다 (운영 앱의 로그인·보관 내용을 건드리지 않게) ──
  var realLS = null, realSS = null;
  try { realLS = window.localStorage; realSS = window.sessionStorage; } catch (e) { /* 막혀 있으면 메모리로 */ }
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
  try {
    Object.defineProperty(window, 'localStorage', { value: fence(realLS, 'sbt:'), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: fence(realSS, 'sbt:'), configurable: true });
  } catch (e) { /* 바꿀 수 없는 브라우저면 그대로 */ }
  // 파이어베이스 읽기 사본은 쓰지 않는다 (수파베이스가 충분히 빠름) → 관리자 화면이 사본을 찾지 않게 (기사앱과 같음)
  try { window.localStorage.setItem('runner.fs.a', JSON.stringify({ off: Date.now() + 365 * 864e5 })); } catch (e) { /* 무시 */ }
  window.RUNNER_CONFIG = { api: API, ver: CFG.ver, upd: CFG.upd };

  // ── 수파베이스 로그인 ──
  var AUTH_KEY = 'sbtest.auth.' + CFG.ref, auth = null;
  try { auth = JSON.parse((realLS && realLS.getItem(AUTH_KEY)) || 'null'); } catch (e) { auth = null; }
  var keepAuth = function () { try { if (auth) realLS.setItem(AUTH_KEY, JSON.stringify(auth)); else realLS.removeItem(AUTH_KEY); } catch (e) { /* 무시 */ } };
  var realFetch = window.fetch.bind(window);
  function authCall(grant, body) {
    return realFetch(CFG.url + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error_description || j.msg || j.message || '로그인 실패'); e.status = r.status; throw e; } return j; }); })
      .then(function (j) { auth = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || (auth && auth.email) || '' }; keepAuth(); return auth; });
  }
  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    if (!auth || !auth.refresh_token) return Promise.reject(new Error('NO_AUTH'));
    refreshing = authCall('refresh_token', { refresh_token: auth.refresh_token }).then(function (a) { refreshing = null; return a; }, function (e) { refreshing = null; if (e.status === 400 || e.status === 401 || e.status === 403) { auth = null; keepAuth(); showLogin('로그인이 만료되었습니다. 다시 로그인해 주세요.'); } throw e; });
    return refreshing;
  }
  setInterval(function () { if (auth && auth.expires_at - Date.now() < 180000) refresh().catch(function () {}); }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && auth && auth.expires_at - Date.now() < 180000) refresh().catch(function () {}); });

  // ── 서버 함수 (수파베이스 api) ──
  var FN = CFG.url + '/functions/v1/api';
  var LOG = window.__sbLog = []; // 최근 호출 기록 (속도 창 · 확인용)
  var PQ = [], ST = { last: '', lastMs: 0, srv: null, ready: false, err: '' };
  var readyOk, readyP = new Promise(function (ok) { readyOk = ok; });
  function post(body, retried) {
    return realFetch(FN, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + (auth && auth.access_token || ''), 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 && !retried) return refresh().then(function () { return post(body, true); });
        return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) { j = null; } if (!r.ok) { var er = new Error((j && j.msg) || ('서버 ' + r.status)); er.status = r.status; throw er; } return j; });
      });
  }
  function op(name, data) { return post({ op: name, data: data }); }
  function call(fn, args) {
    var t0 = performance.now();
    return post({ fn: fn, args: args }).then(function (j) {
      var rt = performance.now() - t0, T = (j && j.T) || {};
      ST.last = fn; ST.lastMs = rt; ST.srv = T; ST.err = ''; paint();
      LOG.push({ fn: fn, ms: rt, eng: T.eng, db: T.db, runs: T.runs, ok: !(j && j.out && j.out.ok === false), msg: j && j.out && j.out.ok === false ? String(j.out.msg || '') : '' }); if (LOG.length > 500) LOG.shift();
      PQ.push({ sess: SESS, fn: fn, ms: Math.round(rt), save_ms: Math.round((T.db || 0) * 10) / 10, n: T.saved || null, note: 'eng ' + (Math.round((T.eng || 0) * 10) / 10) + ' · runs ' + (T.runs || 0) + (T.conflicts ? ' · retry ' + T.conflicts : '') });
      return j ? j.out : null;
    }, function (e) { ST.err = String(e && e.message || e); paint(); throw e; });
  }
  var SESS = Math.random().toString(36).slice(2, 10);
  function perfFlush() { if (!PQ.length || !auth) return; var rows = PQ.splice(0, 300); op('perf', rows).catch(function () { /* 기록 실패는 무시 */ }); }
  setInterval(perfFlush, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') perfFlush(); });
  // 서버로 가던 호출을 수파베이스 서버 함수로
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url !== API) return realFetch(input, init);
    var req = {}; try { req = JSON.parse((init && init.body) || '{}'); } catch (e) { req = {}; }
    return readyP.then(function () { return call(String(req.fn || ''), Array.isArray(req.args) ? req.args : []); })
      .then(function (out) { return new Response(JSON.stringify(out === undefined ? null : out), { status: 200, headers: { 'Content-Type': 'application/json' } }); });
  };
  // ── 화면 (알림 줄 · 로그인 · 가져오기) ──
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var css = '#sbPill{position:fixed;right:12px;bottom:12px;z-index:9000;display:flex;align-items:center;gap:8px;height:30px;padding:0 12px;border:1px solid #d9dee4;border-radius:15px;background:#fff;color:#333d4b;font:600 12px/1 Pretendard,-apple-system,"Malgun Gothic",sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer;white-space:nowrap}' +
    '#sbPill i{width:8px;height:8px;border-radius:50%;background:#12b886;flex:none}#sbPill.wait i{background:#f59f00}#sbPill.bad i{background:#f03e3e}#sbPill span{color:#6b7684;font-weight:500}' +
    'html.m #sbPill{right:auto;bottom:auto;top:8px;left:50%;transform:translateX(-50%);height:26px}' +
    '#sbOv{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(25,31,40,.45);padding:16px}' +
    '#sbBox{width:100%;max-width:440px;max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:24px;color:#191f28;font:400 14px/1.55 Pretendard,-apple-system,"Malgun Gothic",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.2)}' +
    '#sbBox h2{margin:0 0 6px;font-size:18px;font-weight:800}#sbBox p{margin:0 0 14px;color:#4e5968}#sbBox .tag{display:inline-block;margin-bottom:10px;padding:3px 8px;border-radius:6px;background:#eef3ff;color:#1b64da;font-size:12px;font-weight:700}' +
    '#sbBox input[type=email],#sbBox input[type=password]{display:block;width:100%;box-sizing:border-box;height:44px;margin:0 0 8px;padding:0 12px;border:1px solid #d9dee4;border-radius:10px;font:inherit}' +
    '#sbBox button{height:44px;padding:0 16px;border:1px solid #d9dee4;border-radius:10px;background:#fff;color:#333d4b;font:600 14px/1 inherit;cursor:pointer}#sbBox button.pri{border-color:#1b64da;background:#1b64da;color:#fff}#sbBox button:disabled{opacity:.5;cursor:default}' +
    '#sbBox .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}#sbBox .err{min-height:20px;color:#e03131;font-size:13px}' +
    '#sbBox .drop{display:block;padding:22px 12px;border:1.5px dashed #b0b8c1;border-radius:12px;text-align:center;color:#4e5968;cursor:pointer}#sbBox .drop.on{border-color:#1b64da;background:#f3f7ff}' +
    '#sbBox ul{margin:10px 0 0;padding:0;list-style:none}#sbBox li{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f0f2f5;font-size:13px}#sbBox li b{font-weight:600}#sbBox li em{font-style:normal;color:#12b886}#sbBox li em.no{color:#adb5bd}' +
    '#sbBox .bar{height:6px;border-radius:3px;background:#eef0f3;overflow:hidden;margin:12px 0 6px}#sbBox .bar div{height:100%;width:0;background:#1b64da;transition:width .2s}' +
    '#sbBox table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.5px}#sbBox th,#sbBox td{padding:6px 4px;border-bottom:1px solid #f0f2f5;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#sbBox th{color:#6b7684;font-weight:600;background:none}#sbBox th:first-child{width:46%}' +
    '#sbBox .sum{display:flex;gap:8px;margin:0 0 12px}#sbBox .sum div{flex:1;padding:10px;border:1px solid #e5e8eb;border-radius:10px;text-align:center}#sbBox .sum b{display:block;font-size:17px}#sbBox .sum span{font-size:12px;color:#6b7684}';
  var pill = null, ov = null;
  function ui() {
    if (pill || !document.body) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    pill = document.createElement('div'); pill.id = 'sbPill'; pill.title = '수파베이스 시험판 — 눌러서 속도 보기'; pill.addEventListener('click', showStats); document.body.appendChild(pill);
    paint();
  }
  function paint() {
    if (!pill) return;
    var ms = function (v) { return v == null ? '' : v < 10 ? (Math.round(v * 10) / 10) + 'ms' : Math.round(v) + 'ms'; };
    pill.className = ST.err ? 'bad' : '';
    pill.innerHTML = '<i></i>수파베이스' + (ST.last ? ' <span>' + esc(ST.last.replace(/^adm_/, '')) + ' ' + ms(ST.lastMs) + '</span>' : ' <span>' + (ST.ready ? '준비됨' : '연결 중') + '</span>') + (ST.err ? ' <span>오류</span>' : '');
  }
  function hide() { if (ov) { ov.remove(); ov = null; } }
  function box(html) {
    ui(); hide();
    ov = document.createElement('div'); ov.id = 'sbOv'; ov.innerHTML = '<div id="sbBox">' + html + '</div>'; document.body.appendChild(ov);
    return ov.firstChild;
  }
  function showMsg(title, html, btns) {
    var b = box('<span class="tag">수파베이스 시험판</span><h2>' + esc(title) + '</h2><p>' + html + '</p><div class="row"></div>');
    (btns || [['닫기', hide]]).forEach(function (x, i) { var bt = document.createElement('button'); bt.textContent = x[0]; if (i === 0) bt.className = 'pri'; bt.addEventListener('click', x[1]); b.querySelector('.row').appendChild(bt); });
  }
  function progress(msg, pct) {
    if (!ov || !ov.querySelector('.bar')) box('<span class="tag">수파베이스 시험판</span><h2>원본 자료 가져오는 중</h2><p id="sbPm"></p><div class="bar"><div></div></div><p style="font-size:12px;color:#8b95a1;margin:0">끝날 때까지 이 창을 닫지 마세요.</p>');
    ov.querySelector('#sbPm').textContent = msg; ov.querySelector('.bar div').style.width = (pct || 0) + '%';
  }
  function showLogin(note) {
    var b = box('<span class="tag">수파베이스 시험판</span><h2>시험판 로그인</h2><p>수파베이스에서 만든 계정으로 로그인합니다. 운영 중인 관리자앱·구글 시트와는 따로 움직입니다.</p>' +
      '<form><input type="email" id="sbEm" placeholder="이메일" autocomplete="username" required><input type="password" id="sbPw" placeholder="비밀번호" autocomplete="current-password" required><div class="err">' + esc(note || '') + '</div><div class="row"><button type="submit" class="pri">로그인</button></div></form>');
    var f = b.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var bt = f.querySelector('button'); bt.disabled = true; b.querySelector('.err').textContent = '';
      authCall('password', { email: b.querySelector('#sbEm').value.trim(), password: b.querySelector('#sbPw').value }).then(function () { hide(); begin(); }, function (er) { bt.disabled = false; b.querySelector('.err').textContent = /invalid/i.test(er.message) ? '이메일 또는 비밀번호가 맞지 않습니다.' : er.message; });
    });
    setTimeout(function () { var el = b.querySelector('#sbEm'); if (el) el.focus(); }, 50);
  }
  function logout() { auth = null; keepAuth(); location.reload(); }
  var NAMES = { main: '러너 올인원 DB', sch: '러너 올인원 스케줄 DB', stl: '러너 올인원 정산 DB' };
  function showImport(first) {
    var files = [];
    var b = box('<span class="tag">수파베이스 시험판</span><h2>원본 자료 가져오기</h2><p>구글 시트 3개를 각각 <b>파일 › 다운로드 › Microsoft Excel(.xlsx)</b>로 받아 여기에 올려 주세요. 원본 시트는 바뀌지 않습니다.' + (first ? '' : '<br>지금 시험판에 있는 내용은 올린 파일로 바뀝니다.') + '</p>' +
      '<label class="drop" id="sbDrop">여기에 파일 3개를 끌어다 놓거나 눌러서 고르기<input type="file" accept=".xlsx" multiple hidden></label><ul id="sbFl"></ul><div class="err"></div><div class="row">' + (first ? '' : '<button type="button" id="sbCx">취소</button>') + '<button type="button" class="pri" id="sbGo" disabled>가져오기</button></div>');
    var kindOf = function (n) { return /스케줄|sch/i.test(n) ? 'sch' : /정산|stl|settle/i.test(n) ? 'stl' : /올인원\s*DB|main/i.test(n) ? 'main' : ''; };
    var list = function () {
      var used = [];
      var rows = Object.keys(NAMES).map(function (k) { var f = files.filter(function (x) { return kindOf(x.name) === k; })[0]; if (f) used.push(f); return '<li><b>' + NAMES[k] + '</b>' + (f ? '<em>' + esc(f.name) + '</em>' : '<em class="no">아직 없음</em>') + '</li>'; });
      files.filter(function (x) { return used.indexOf(x) < 0; }).forEach(function (x) { rows.push('<li><b>' + esc(x.name) + '</b><em>파일 안의 탭으로 구분</em></li>'); });
      b.querySelector('#sbFl').innerHTML = rows.join('');
      b.querySelector('#sbGo').disabled = !files.length;
      b.querySelector('#sbGo').textContent = files.length && files.length < 3 ? '올린 ' + files.length + '개만 가져오기' : '가져오기';
    };
    var add = function (fl) {
      Array.prototype.forEach.call(fl, function (f) {
        if (!/\.xlsx$/i.test(f.name)) { b.querySelector('.err').textContent = '엑셀(.xlsx) 파일만 올릴 수 있습니다.'; return; }
        var k = kindOf(f.name);
        files = files.filter(function (x) { return x.name !== f.name && !(k && kindOf(x.name) === k); }); files.push({ name: f.name, file: f });
      });
      list();
    };
    var drop = b.querySelector('#sbDrop'), inp = drop.querySelector('input');
    inp.addEventListener('change', function () { add(inp.files); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('on'); if (ev === 'drop' && e.dataTransfer) add(e.dataTransfer.files); }); });
    if (!first) b.querySelector('#sbCx').addEventListener('click', hide);
    b.querySelector('#sbGo').addEventListener('click', function () {
      var pick = files.slice(); progress('파일 읽는 중…', 2);
      importRun(pick).then(function (r) {
        try { window.localStorage.clear(); window.sessionStorage.clear(); } catch (e) { /* 무시 */ }
        showMsg('가져오기 끝', r.rows.toLocaleString() + '줄을 수파베이스에 넣었습니다. 화면을 새로 엽니다.', [['확인', function () { location.reload(); }]]);
      }, function (e) { showMsg('가져오지 못했습니다', esc(e && e.message || e), [['다시', function () { showImport(first); }]]); });
    });
    list();
  }
  var SKIP_ROWS = ['perf_log', 'perf_daily', 'error_log', 'sessions', 'push_tokens', 'msg_log', 'mail_log']; // 기록·로그인 탭은 머리글만
  function loadXlsx() { return window.sbReadXlsx ? Promise.resolve() : new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'xlsx.js?v=' + CFG.xv; s.onload = ok; s.onerror = function () { no(new Error('엑셀 읽기 파일을 받지 못했습니다')); }; document.head.appendChild(s); }); }
  var uuid = function () { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); };
  var enc = function (c) { var n = c.length; while (n > 0 && (c[n - 1] === '' || c[n - 1] == null)) n--; var o = []; for (var i = 0; i < n; i++) { var v = c[i]; o.push(v instanceof Date ? { $d: v.getTime() } : v == null ? '' : v); } return o; };
  async function importRun(pick) {
    await loadXlsx();
    var got = {}, total = 0;
    for (var i = 0; i < pick.length; i++) {
      progress(pick[i].name + ' 읽는 중…', 5 + i * 3);
      var tabs = await window.sbReadXlsx(await pick[i].file.arrayBuffer()), names = tabs.map(function (t) { return t.name; });
      var k = names.indexOf('drivers') >= 0 ? 'main' : names.indexOf('schedule') >= 0 ? 'sch' : names.some(function (n) { return /^stl_/.test(n); }) ? 'stl' : '';
      if (!k) throw new Error(pick[i].name + ': 러너 올인원 DB · 스케줄 DB · 정산 DB 중 어느 것인지 알 수 없습니다 (탭 이름이 다름)');
      if (got[k]) throw new Error(NAMES[k] + ' 파일이 두 번 들어왔습니다');
      got[k] = tabs;
    }
    var books = Object.keys(got);
    progress('수파베이스의 이전 자료 비우는 중…', 15);
    await op('imp-begin', { books: books });
    var sent = 0;
    books.forEach(function (k) { got[k].forEach(function (x) { total += SKIP_ROWS.indexOf(x.name) >= 0 ? Math.min(1, x.rows.length) : x.rows.length; }); });
    for (var bi = 0; bi < books.length; bi++) {
      var k2 = books[bi], tl = got[k2].map(function (x, j) { return { uid: uuid(), book: k2, tab: x.name, ord: j, max_rows: x.maxRows, max_cols: x.maxCols, x: x }; });
      await op('imp-tabs', { tabs: tl.map(function (t) { return { uid: t.uid, book: t.book, tab: t.tab, ord: t.ord, max_rows: t.max_rows, max_cols: t.max_cols }; }) });
      var chunk = [], size = 0;
      var flush = async function () { if (!chunk.length) return; await op('imp-rows', { rows: chunk }); sent += chunk.length; chunk = []; size = 0; progress(NAMES[k2] + ' 올리는 중… ' + sent.toLocaleString() + ' / ' + total.toLocaleString() + '줄', 20 + Math.round(75 * sent / Math.max(total, 1))); };
      for (var ti = 0; ti < tl.length; ti++) {
        var t = tl[ti], rows = SKIP_ROWS.indexOf(t.tab) >= 0 ? t.x.rows.slice(0, 1) : t.x.rows;
        for (var ri = 0; ri < rows.length; ri++) {
          var cells = enc(rows[ri] || []); chunk.push({ id: uuid(), tab_uid: t.uid, pos: (ri + 1) * 1024, cells: cells }); size += 70 + JSON.stringify(cells).length;
          if (chunk.length >= 2500 || size > 1200000) await flush();
        }
      }
      await flush();
    }
    await op('imp-end', {});
    progress('가져오기 끝 — ' + total.toLocaleString() + '줄', 100);
    return { rows: total };
  }
  function showStats() {
    var by = {}; LOG.forEach(function (x) { var o = by[x.fn] || (by[x.fn] = { n: 0, rt: 0, mx: 0, eng: 0, db: 0 }); o.n++; o.rt += x.ms; o.mx = Math.max(o.mx, x.ms); o.eng += x.eng || 0; o.db += x.db || 0; });
    var ks = Object.keys(by).sort(function (a, b) { return by[b].rt - by[a].rt; });
    var f = function (v) { return v < 10 ? (Math.round(v * 10) / 10) : Math.round(v).toLocaleString(); };
    var all = LOG.reduce(function (o, x) { o.n++; o.rt += x.ms; o.eng += x.eng || 0; o.db += x.db || 0; return o; }, { n: 0, rt: 0, eng: 0, db: 0 });
    var b = box('<span class="tag">수파베이스</span><h2>속도</h2><div class="sum"><div><b>' + (all.n ? f(all.rt / all.n) + 'ms' : '-') + '</b><span>왕복 평균</span></div><div><b>' + (all.n ? f(all.eng / all.n) + 'ms' : '-') + '</b><span>서버 계산</span></div><div><b>' + (all.n ? f(all.db / all.n) + 'ms' : '-') + '</b><span>DB 읽기·저장</span></div></div>' +
      (ks.length ? '<table><thead><tr><th>기능</th><th>횟수</th><th>왕복 평균</th><th>최대</th></tr></thead><tbody>' + ks.slice(0, 40).map(function (k) { var o = by[k]; return '<tr><td>' + esc(k.replace(/^adm_/, '')) + '</td><td>' + o.n + '</td><td>' + f(o.rt / o.n) + '</td><td>' + f(o.mx) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p>아직 기록이 없습니다.</p>') +
      '<p style="margin:12px 0 0;font-size:12px;color:#8b95a1">계정 ' + esc(auth && auth.email || '') + ' · 왕복 = 이 기기 → 수파베이스 서버 → 이 기기' + (ST.err ? '<br>오류: ' + esc(ST.err) : '') + '</p>' +
      '<div class="row"><button type="button" id="sbIm">원본에서 다시 가져오기</button><button type="button" id="sbLo">수파베이스 로그아웃</button><button type="button" class="pri" id="sbOk">닫기</button></div>');
    b.querySelector('#sbOk').addEventListener('click', hide);
    b.querySelector('#sbIm').addEventListener('click', function () { showImport(false); });
    b.querySelector('#sbLo').addEventListener('click', logout);
  }
  function begin() {
    ui();
    if (!auth || !auth.refresh_token) return showLogin('');
    var go = function () {
      op('status', {}).then(function (st) {
        ST.ready = true; paint();
        if (!st || !st.tabs) { showImport(true); return; }
        readyOk();
      }, function (e) {
        if (e && e.status === 403) showMsg('사용 승인이 필요합니다', '이 계정(' + esc(auth && auth.email || '') + ')은 아직 승인되지 않았습니다.', [['다른 계정으로', logout]]);
        else showMsg('서버에 연결하지 못했습니다', esc(e && e.message || e), [['다시 시도', function () { location.reload(); }], ['다른 계정으로', logout]]);
      });
    };
    if (auth.expires_at - Date.now() < 120000) refresh().then(go, function () { if (auth) go(); }); else go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
