/*
 * 러너 올인원 기사앱 — 수파베이스판 (화면 쪽)
 *  - 기사앱 화면(Index.html)은 그대로. 서버(구글 앱스 스크립트)로 가던 호출만 수파베이스 서버 함수(api)로 보낸다.
 *  - 로그인은 원래대로 기사 아이디·비밀번호 (서버 코드가 확인). 이 화면은 표에 직접 닿지 않는다.
 *  - 같은 주소(runyjh.github.io)의 운영 앱과 보관함이 섞이지 않게 이름 앞에 'sbt:' 를 붙인다 (관리자 수파베이스판과는 함께 씀 · 원래 앱과 같은 방식)
 */
(function () {
  'use strict';
  var CFG = window.SB_CFG, API = 'https://sb.invalid/exec', FN = CFG.url + '/functions/v1/api';
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
  // 파이어베이스 읽기 사본은 쓰지 않는다 (수파베이스가 충분히 빠름) → 기사앱이 사본을 찾지 않게
  try { window.localStorage.setItem('runner.fs.d', JSON.stringify({ off: Date.now() + 365 * 864e5 })); } catch (e) { /* 무시 */ }
  window.RUNNER_CONFIG = { api: API, ver: CFG.ver, upd: CFG.upd };
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url !== API) return realFetch(input, init);
    var req = {}; try { req = JSON.parse((init && init.body) || '{}'); } catch (e) { req = {}; }
    return realFetch(FN, { method: 'POST', headers: { apikey: CFG.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: String(req.fn || ''), args: Array.isArray(req.args) ? req.args : [] }), credentials: 'omit', cache: 'no-store', signal: init && init.signal })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) { j = null; } var out = j && 'out' in j ? j.out : { ok: false, msg: (j && j.msg) || '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }; return new Response(JSON.stringify(out === undefined ? null : out), { status: 200, headers: { 'Content-Type': 'application/json' } }); }); });
  };
})();
