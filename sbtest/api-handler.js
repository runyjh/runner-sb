/*
 * 서버 함수 api 의 요청 처리 (index.ts 에 그대로 들어간다 · Node 시험에서도 같은 코드)
 *  deps = { core(): Promise<server>, db: { sync, commit, impBegin, impTabs, impRows, status, perf }, who(token): Promise<uid|null>, allowed(uid): Promise<bool>, origins: [..] }
 */
// 암호화 키 점검: 기사 정보의 암호화된 칸을 실제로 풀어 보고 개수만 돌려준다 (값은 돌려주지 않음)
var SB_KEYCHECK = "(function () { var n = 0, ok = 0, bad = 0; readAll_(SH.DRIVERS).slice(0, 60).forEach(function (d) { Object.keys(d).forEach(function (k) { var v = d[k]; if (typeof v === 'string' && v.indexOf('v1:') === 0) { n++; try { decrypt_(v); ok++; } catch (e) { bad++; } } }); }); return { n: n, ok: ok, bad: bad }; })()";
var CRON_FNS = ['cleanupSessions', 'firstRunNotify', 'pushQuietFlush']; // 원래 서버의 시간 트리거 (세션 정리 매일 4시 · 처음 가는 노선 알림 매일 18시)
var MAIL_FNS = ['api_mailFile', 'api_mailPing', 'api_mailBody']; // api_mailBody: 쿠팡 정산 일정 메일 본문 (S24)
// 기사앱 요청 제한: 같은 인터넷 주소에서 1분에 이만큼 넘게 오면 잠깐 막는다 (통신사 공용 주소로 여러 기사가 함께 써도 넉넉하게)
var RATE_MAX = 300;
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
    var body;
    try { body = await req.json(); } catch (e) { return json(req, 400, { ok: false, msg: '요청 형식이 다릅니다' }); }
    // 정해진 시간 작업(cron): DB 예약 작업(pg_cron)만 부른다 → 예약 작업 전용 열쇠 · 정해 둔 함수만
    if (body && body.op === 'cron') {
      var ck = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!deps.cronOk || !(await deps.cronOk(ck))) return json(req, 401, { ok: false, msg: '예약 작업 열쇠가 맞지 않습니다' });
      if (CRON_FNS.indexOf(String(body.fn)) < 0) return json(req, 400, { ok: false, msg: '예약 작업으로 부를 수 없는 기능입니다' });
      try { var cc = await deps.core(); var cr = await cc.call(String(body.fn), [], 'cron'); return json(req, 200, { ok: true, out: cr.out, T: cr.T }); }
      catch (e) {
        // (S38) 실패를 남긴다: 서버 오류 기록(sb_perf) + 대시보드 경고(HB.fail) — 기록에 실패해도 응답은 그대로
        var cm = String(e && e.message || e);
        try { if (deps.db && deps.db.errLog) await deps.db.errLog('cron:' + String(body.fn), cm, String(e && e.stack || '').slice(0, 600)); } catch (e2) { /* 무시 */ }
        try { var c2 = await deps.core(); await c2.call('', ['hbFail_(' + JSON.stringify(String(body.fn)) + ', ' + JSON.stringify(cm.slice(0, 200)) + ')'], 'eval'); } catch (e3) { /* 무시 */ }
        return json(req, 500, { ok: false, msg: '예약 작업 오류: ' + cm });
      }
    }
    // 파일 옮기기(mig-): 구글 쪽 복사용 스크립트가 부른다 → 옮기기 전용 열쇠로만 (다른 기능은 못 씀)
    if (body && typeof body.op === 'string' && body.op.indexOf('mig-') === 0) {
      var mk = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!deps.mig || !(await deps.mig.ok(mk))) return json(req, 401, { ok: false, msg: '옮기기 열쇠가 맞지 않거나 기한이 지났습니다' });
      try {
        var md = body.data || {};
        if (body.op === 'mig-have') return json(req, 200, { ok: true, files: await deps.mig.have() });
        if (body.op === 'mig-refs') return json(req, 200, { ok: true, ids: await deps.mig.refs() });
        if (body.op === 'mig-put') return json(req, 200, { ok: true, n: await deps.mig.put((md.files || []).slice(0, 2000)) });
        if (body.op === 'mig-blob') { await deps.mig.blob(md.meta || {}, String(md.b64 || '')); return json(req, 200, { ok: true }); }
        if (body.op === 'mig-props') return json(req, 200, { ok: true, set: await deps.mig.props(md.props || {}) });
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      } catch (e) { return json(req, 500, { ok: false, msg: '옮기기 오류: ' + String(e && e.message || e) }); }
    }
    // 기사앱(api_)은 서버 코드가 기사 아이디·비밀번호·세션으로 직접 확인한다 (원래 앱과 같음) → 수파베이스 로그인 문은 관리자 쪽(adm_ · 관리 작업)에만
    var driverCall = !(body && body.op) && /^api_[A-Za-z0-9_]+$/.test(String(body && body.fn || '')) && !/_$/.test(String(body.fn));
    if (driverCall && deps.rate && MAIL_FNS.indexOf(String(body.fn)) < 0) {
      var ip = String(req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || String(req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
      var hits = 0;
      try { hits = await deps.rate('ip:' + (ip || '?')); } catch (e) { hits = 0; } // 세기에 실패하면 막지 않는다
      if (hits > RATE_MAX) return json(req, 429, { out: { ok: false, code: 'BUSY', msg: '요청이 너무 많습니다. 1분 뒤에 다시 시도해 주세요.' } });
    }
    if (!driverCall) {
      var uid;
      try { uid = await gate(req); } catch (e) { return json(req, 503, { ok: false, msg: '로그인 확인 실패: ' + String(e && e.message || e) }); }
      if (uid === null) return json(req, 401, { ok: false, msg: '로그인이 필요합니다' });
      if (uid === false) return json(req, 403, { ok: false, msg: '사용 승인이 되지 않은 계정입니다' });
    }
    try {
      if (body && body.op) {
        var d = body.data || {};
        if (body.op === 'status') return json(req, 200, await deps.db.status());
        if (body.op === 'exp-tabs') return json(req, 200, await deps.db.expTabs());
        if (body.op === 'exp-rows') return json(req, 200, await deps.db.expRows(String(d.tab || ''), d.after == null ? null : Number(d.after)));
        if (body.op === 'exp-done') { await deps.db.expDone(); return json(req, 200, { ok: true }); }
        if (body.op === 'perf') { await deps.db.perf((Array.isArray(d) ? d : []).slice(0, 500)); return json(req, 200, { ok: true }); }
        // (S47) 같이 짜기: 바뀌면 그때 답하기 (서버 프로그램을 거치지 않음 · 최대 25초 쥐고 있음) / 보고 있는 칸 알리기
        if (body.op === 'live-wait' || body.op === 'live-here') {
          if (!deps.live) return json(req, 200, { ok: false, busy: true });
          return json(req, 200, await (body.op === 'live-wait' ? deps.live.wait(d) : deps.live.here(d)));
        }
        var core = await deps.core();
        if (body.op === 'imp-begin') { await deps.db.impBegin(d.books || []); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-tabs') { await deps.db.impTabs(d.tabs || []); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-rows') { var n = await deps.db.impRows(d.rows || []); return json(req, 200, { ok: true, n: n }); }
        if (body.op === 'imp-end') { if (deps.db.cacheClear) await deps.db.cacheClear(); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'stat') return json(req, 200, core.stat());
        // 전체 점검(7단계): 점검용 열쇠(sbtest_)로만 · 읽기만 하고 쓰기는 모두 버린다 · 외부 연결 안 함
        if (body.op === 'check') { if (uid !== 'test') return json(req, 403, { ok: false, msg: '점검용 열쇠로만 됩니다' }); var ck2 = await core.call('', [String(d.src || '')], 'dry'); return json(req, 200, ck2); }
        if (body.op === 'keycheck') { var kc = await core.call('', [SB_KEYCHECK], 'eval'); return json(req, 200, { names: deps.secretNames || [], realLogin: !!deps.realLogin, result: kc.out }); }
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      }
      var fn = String(body && body.fn || ''), args = Array.isArray(body && body.args) ? body.args : [];
      if (!/^(api|adm)_[A-Za-z0-9_]+$/.test(fn) || /_$/.test(fn)) return json(req, 200, { out: { ok: false, code: 'UNKNOWN_FN', msg: '알 수 없는 요청입니다. 화면을 새로고침해 주세요.' } });
      var c = await deps.core();
      var r = await c.call(fn, args, fn === 'adm_login' && !deps.realLogin ? 'login' : '');
      if (MAIL_FNS.indexOf(fn) >= 0) return json(req, 200, r.out); // 메일 수집기는 원래 서버와 같은 모양({ ok, … })을 읽는다
      return json(req, 200, r);
    } catch (e) {
      // 서버 오류는 원인을 찾을 수 있게 기록한다 (sb_perf · note 'ERR …' · 2026-11-18 S13)
      var em = String(e && e.message || e);
      try { if (deps.db && deps.db.errLog) await deps.db.errLog(String(body && (body.fn || body.op) || ''), em, String(e && e.stack || '').slice(0, 600)); } catch (e2) { /* 기록 실패는 무시 */ }
      return json(req, 500, { ok: false, msg: '서버 오류: ' + em });
    }
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeHandler: sbMakeHandler };
