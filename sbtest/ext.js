/*
 * 서버 코드의 외부 연결(UrlFetchApp) · 서명(computeRsaSha256Signature)을 실제로 하는 곳 — 서버 함수 안에서만.
 *  - 갈 수 있는 곳은 정해 둔다: 구글 로그인 토큰(oauth2) · 휴대폰 알림(FCM). 그 밖의 주소는 막는다.
 *  - 서명 열쇠(서비스 계정 개인 키)는 메모리에서만 쓰고 어디에도 남기지 않는다.
 *  sbMakeExt({ fetch, hosts }) → async (kind, req) → 결과
 */
function sbMakeExt(o) {
  o = o || {};
  var doFetch = o.fetch || fetch;
  var HOSTS = o.hosts || ['oauth2.googleapis.com', 'fcm.googleapis.com'];
  var keys = new Map();
  var signedArr = function (u) { var a = new Array(u.length); for (var i = 0; i < u.length; i++) a[i] = u[i] > 127 ? u[i] - 256 : u[i]; return a; };
  async function one(r) {
    var u;
    try { u = new URL(String(r.url || '')); } catch (e) { return { code: 0, err: '주소가 이상합니다', text: '', headers: {} }; }
    if (u.protocol !== 'https:' || HOSTS.indexOf(u.hostname) < 0) return { code: 0, err: '수파베이스판에서 막아 둔 주소입니다: ' + u.hostname, text: '', headers: {} };
    var h = Object.assign({}, r.headers || {});
    if (r.contentType) h['Content-Type'] = r.contentType;
    try {
      var res = await doFetch(u.href, { method: r.method || 'GET', headers: h, body: r.method === 'GET' || r.body == null ? undefined : r.body, redirect: 'manual' });
      var text = await res.text(), hd = {};
      res.headers.forEach(function (v, k) { hd[k] = v; });
      return { code: res.status, text: text.length > 2000000 ? text.slice(0, 2000000) : text, headers: hd };
    } catch (e) { return { code: 0, err: String(e && e.message || e).slice(0, 200), text: '', headers: {} }; }
  }
  async function sign(req) {
    var pem = String(req.key || ''), k = keys.get(pem);
    if (!k) {
      var b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
      var bin = atob(b64), der = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
      k = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      if (keys.size > 4) keys.clear();
      keys.set(pem, k);
    }
    var sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(String(req.input)));
    return signedArr(new Uint8Array(sig));
  }
  return async function (kind, req) {
    if (kind === 'fetch') return one(req);
    if (kind === 'fetchAll') return Promise.all((req || []).slice(0, 500).map(one));
    if (kind === 'sign') { try { return { sig: await sign(req) }; } catch (e) { return { err: '서명 실패: ' + String(e && e.message || e).slice(0, 120) }; } }
    return { code: 0, err: '알 수 없는 외부 작업', text: '', headers: {} };
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeExt: sbMakeExt };
