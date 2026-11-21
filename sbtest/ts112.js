// S112 · S113 기기 구분 · 들어가는 길: ① 알림 못 받음 판정 — 다른 기기(PC)의 「꺼짐」은 무시 · 꺼짐 뒤 전송 성공이면 켜짐 ② 안드로이드 앱 안 화면 → 크롬으로 열기 창 ③ 아이폰 다른 앱 안 화면 → 사파리로 열기 (TZ=UTC)
//  사용: node sbtest/ts112.js <runner-allinone 폴더> <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path'), http = require('http');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src'), OUT = process.argv[3] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
at('2026-11-21T10:00:00'); fresh().ensureColumns_();
ev("['A', 'B'].forEach(function (x) { appendObj_(SH.DRIVERS, { id: x, name: '기사' + x, status: ST.ACTIVE, createdAt: nowText_() }); }); appendObj_(SH.PPUSH, { driverId: 'A', token: 'tA', device: '안드로이드 크롬', createdAt: '2026-11-20 10:00:00' }); appendObj_(SH.PPUSH, { driverId: 'B', token: 'tB', device: '안드로이드 크롬', createdAt: '2026-11-20 10:00:00' }); 1");
const TA = ev("createSession_('A', true).token"), TB = ev("createSession_('B', true).token");
call('api_pushState', [TA, 'denied', 'PC 크롬']);
let PO = JSON.parse(ev("JSON.stringify(pushOffMap_(['A']))"));
ok(!PO.A, '1 폰은 받는 기사가 PC 에서 알림을 거부 → 「알림 못 받음」 아님 (예전: 꺼짐으로 보임)');
call('api_pushState', [TB, 'denied', '안드로이드 크롬']);
PO = JSON.parse(ev("JSON.stringify(pushOffMap_(['B']))"));
ok(PO.B && PO.B.s === 'denied', '2 등록된 그 폰에서 거부 → 꺼짐');
at('2026-11-21T12:00:00');
ev("var o = readAll_(SH.PPUSH).filter(function (x) { return x.driverId === 'B'; })[0]; writeFields_(SH.PPUSH, o._row, { lastOk: nowText_() }); 1");
PO = JSON.parse(ev("JSON.stringify(pushOffMap_(['B']))"));
ok(!PO.B, '3 꺼짐 신호 뒤에 그 폰으로 알림이 잘 감(마지막 전송) → 켜짐');
// ── 기사앱 (실제 브라우저) ──
const PORT = 8776;
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(PORT);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
async function phone(b, ua, noPush) {
  const ctx = await b.newContext({ userAgent: ua, viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((np) => { try { localStorage.setItem('sbt:runner.token', 'TOK_A'); localStorage.setItem('sbt:runner.user', JSON.stringify({ id: 'D1', name: '기사A', loginId: 'a' })); sessionStorage.setItem('runner.extOpen', '1'); sessionStorage.setItem('runner.instSkip', '1'); } catch (e) {} if (np) { try { delete window.PushManager; } catch (e) {} } }, !!noPush);
  await ctx.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(rt.request().postData() || '{}'); } catch (e) {} let out = { ok: true };
      if (bd.fn === 'api_checkSession') out = { ok: true, user: { id: 'D1', name: '기사A', loginId: 'a' }, menuOff: [] };
      if (bd.fn === 'api_notices') out = { ok: true, today: '2026-11-21', notices: [], seenIds: [] };
      if (bd.fn === 'api_pmAlerts') out = { ok: true, ver: 'v1', alerts: [], unread: 0 };
      if (bd.fn === 'api_pmPushConfig') out = { ok: true, on: true, web: { apiKey: 'k', projectId: 'p', messagingSenderId: '1', appId: 'a' }, vapidKey: 'v' };
      return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage(); await pg.goto('http://localhost:' + PORT + '/', { waitUntil: 'commit' }); await pg.waitForTimeout(5000);
  return { ctx, pg };
}
const gate = (pg) => pg.evaluate(() => { const g = document.getElementById('pushPop'); const b = document.getElementById('pushPopGo'); return { on: g && !g.classList.contains('hidden'), t: (document.getElementById('pushPopT') || {}).textContent, btn: b && !b.classList.contains('hidden') ? b.textContent : '' }; });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    let P = await phone(b, 'Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0 Mobile Safari/537.36', true);
    let g = await gate(P.pg);
    ok(g.on && /크롬으로 열어/.test(g.t) && /크롬으로 열기/.test(g.btn), '4 안드로이드 앱 안 화면(wv): 「크롬으로 열어 주세요」 + [크롬으로 열기] (예전: 아무 안내 없음) ' + JSON.stringify(g));
    await P.ctx.close();
    P = await phone(b, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0');
    g = await gate(P.pg);
    ok(g.on && /홈 화면에 러너 앱을/.test(g.t) && /사파리로 열기/.test(g.btn), '5 아이폰 카카오톡 안 화면: 설치 안내 + [🧭 사파리로 열기] ' + JSON.stringify(g));
    await P.ctx.close();
    P = await phone(b, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1');
    g = await gate(P.pg);
    ok(g.on && /홈 화면에 러너 앱을/.test(g.t) && !g.btn, '6 아이폰 사파리(설치 전): 설치 안내만 (사파리 버튼 없음) ' + JSON.stringify(g));
    await P.ctx.close();
  } finally { await b.close(); srv.close(); }
})();
