/*
 * 서버 함수 api 의 요청 처리 (index.ts 에 그대로 들어간다 · Node 시험에서도 같은 코드)
 *  deps = { core(): Promise<server>, db: { sync, commit, impBegin, impTabs, impRows, status, perf }, who(token): Promise<uid|null>, allowed(uid): Promise<bool>, origins: [..] }
 */
function sbMakeHandler(deps) {
  var allowCache = new Map();
  var cors = function (req) {
    var o = req.headers.get('origin') || '';
    return { 'Access-Control-Allow-Origin': deps.origins.indexOf(o) >= 0 ? o : deps.origins[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  };
  var json = function (req, status, body) { return new Response(JSON.stringify(body), { status: status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors(req)) }); };
  async function gate(req) {
    var tok = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!tok) return null;
    var hit = allowCache.get(tok);
    if (hit && hit.exp > Date.now()) return hit.uid;
    var uid = await deps.who(tok);
    if (!uid) return null;
    var ok = await deps.allowed(uid);
    if (!ok) return false;
    if (allowCache.size > 500) allowCache.clear();
    allowCache.set(tok, { uid: uid, exp: Date.now() + 300000 });
    return uid;
  }
  return async function (req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { ok: false, msg: 'POST 만 받습니다' });
    var uid;
    try { uid = await gate(req); } catch (e) { return json(req, 503, { ok: false, msg: '로그인 확인 실패: ' + String(e && e.message || e) }); }
    if (uid === null) return json(req, 401, { ok: false, msg: '로그인이 필요합니다' });
    if (uid === false) return json(req, 403, { ok: false, msg: '사용 승인이 되지 않은 계정입니다' });
    var body;
    try { body = await req.json(); } catch (e) { return json(req, 400, { ok: false, msg: '요청 형식이 다릅니다' }); }
    try {
      if (body && body.op) {
        var d = body.data || {};
        if (body.op === 'status') return json(req, 200, await deps.db.status());
        if (body.op === 'perf') { await deps.db.perf((Array.isArray(d) ? d : []).slice(0, 500)); return json(req, 200, { ok: true }); }
        var core = await deps.core();
        if (body.op === 'imp-begin') { await deps.db.impBegin(d.books || []); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-tabs') { await deps.db.impTabs(d.tabs || []); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-rows') { var n = await deps.db.impRows(d.rows || []); return json(req, 200, { ok: true, n: n }); }
        if (body.op === 'imp-end') { await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'stat') return json(req, 200, core.stat());
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      }
      var fn = String(body && body.fn || ''), args = Array.isArray(body && body.args) ? body.args : [];
      if (!/^(api|adm)_[A-Za-z0-9_]+$/.test(fn) || /_$/.test(fn)) return json(req, 200, { out: { ok: false, code: 'UNKNOWN_FN', msg: '알 수 없는 요청입니다. 화면을 새로고침해 주세요.' } });
      var c = await deps.core();
      var r = await c.call(fn, args, fn === 'adm_login' && !deps.realLogin ? 'login' : '');
      return json(req, 200, r);
    } catch (e) {
      return json(req, 500, { ok: false, msg: '서버 오류: ' + String(e && e.message || e) });
    }
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeHandler: sbMakeHandler };
