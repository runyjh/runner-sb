// S104 기사앱 미리 보기 단계별 점검에서 나온 것: ① 미리 보기 창을 새로고침(또는 [새 버전 · 새로고침])하면 관리자 본인 로그인으로 열리던 것 → 열쇠를 이 탭에 기억
//  ② 미리 보기 주소인데 열쇠가 없으면 본인 로그인 대신 「미리 보기가 끝났습니다」 ③ 임시 비밀번호를 안 바꾼 기사 → 실제처럼 비밀번호 변경 화면
//  ④ 휴대폰 알림을 못 받는 기사 → 「실제로는 알림 켜기 창이 먼저 뜹니다」 (TZ=UTC)
//  사용: node sbtest/ts104.js <runner-allinone 폴더> <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path'), http = require('http');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const OUT = process.argv[3] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
// ── 서버: 미리 보기 정보에 비밀번호 안 바꿈 · 알림 못 받는 이유
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T22:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D9', loginId: 'boss', name: '유대표', title: '대표', status: ST.ACTIVE, createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'A', name: '기사A', status: ST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'B', name: '기사B', status: ST.ACTIVE, pwMustChange: 'Y', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'C', name: '기사C', status: ST.ACTIVE, createdAt: nowText_() }); " +
  "appendObj_(SH.PPUSH, { driverId: 'A', token: 'tA', device: '안드로이드 크롬', createdAt: '2026-11-19 10:00:00' }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const pvOf = (id) => call('api_checkSession', [call('adm_previewStart', [tok, id]).pv]).pv || {};
const a = pvOf('A'), b = pvOf('B'), c = pvOf('C');
ok(a.mc === false && a.push === null, '1 알림 받는 보통 기사: 안내 없음 ' + JSON.stringify({ mc: a.mc, push: a.push }));
ok(b.mc === true, '2 임시 비밀번호를 안 바꾼 기사: mc (실제로는 비밀번호 변경 화면만 보임)');
ok(c.push === '', '3 기기가 없는 기사: 알림 못 받음 (이유 모름 → 「알림 켜기 창이 먼저 뜸」)');
// ── 화면 (실제 브라우저 · 갤럭시 삼성 인터넷 흉내 · 관리자 본인 로그인이 이 브라우저에 저장돼 있는 상태)
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(8767);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const KEY = 'PV' + 'a'.repeat(64);
async function phone(b, o) {
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S936N) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136.0 Mobile Safari/537.36', viewport: { width: 412, height: 900 }, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sbt:runner.token')) { localStorage.setItem('sbt:runner.token', 'OWNTOK_boss'); localStorage.setItem('sbt:runner.user', JSON.stringify({ name: '유정훈', loginId: 'boss' })); } } catch (e) {} });
  const calls = [];
  await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('http://localhost:8767')) return r.continue(); if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(r.request().postData() || '{}'); } catch (e) {} const t = String((bd.args || [])[0] || ''); calls.push(bd.fn + ' ' + t.slice(0, 6)); let out = { ok: false };
      if (bd.fn === 'api_checkSession') out = t === KEY ? { ok: true, user: { name: '한민석', loginId: 'h' }, slipClose: '', menuOff: [], pv: Object.assign({ name: '한민석', until: Date.now() + 600000, online: false, lastAt: 0, mc: false, push: null }, o.pv || {}) } : t.indexOf('PV') === 0 ? { ok: false, code: 'EXPIRED' } : { ok: true, user: { name: '유정훈', loginId: 'boss' }, menuOff: [] };
      if (bd.fn === 'api_notices') out = { ok: true, today: '2026-11-20', notices: [] };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); } return r.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage();
  return { ctx, pg, calls };
}
const own = (calls) => calls.filter((x) => / OWNTOK/.test(x));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    let P = await phone(b, {});
    await P.pg.goto('http://localhost:8767/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(!own(P.calls).length && P.calls.some((x) => x === 'api_checkSession PVaaaa'), '4 미리 보기를 열면 그 기사 열쇠로');
    P.calls.length = 0; await P.pg.reload({ waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(!own(P.calls).length && P.calls.some((x) => x === 'api_checkSession PVaaaa') && await P.pg.locator('#pvBar').count() === 1, '5 새로고침해도 그 기사 미리 보기 그대로 (예전에는 관리자 본인 로그인으로 열림) ' + JSON.stringify(P.calls.slice(0, 3)));
    await P.ctx.close();
    P = await phone(b, {});
    await P.pg.goto('http://localhost:8767/?pvt=1', { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(!own(P.calls).length && await P.pg.locator('.pv-end').count() === 1, '6 열쇠 없는 미리 보기 주소(다른 탭에 붙여 넣기 등) → 본인 로그인 대신 「미리 보기가 끝났습니다」 ' + JSON.stringify(P.calls.slice(0, 2)));
    await P.ctx.close();
    P = await phone(b, { pv: { mc: true } });
    await P.pg.goto('http://localhost:8767/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(await P.pg.locator('#v-changepw.on').count() === 1 && /임시 비밀번호를 안 바꿔/.test(await P.pg.locator('#pvBar').innerText()), '7 임시 비밀번호를 안 바꾼 기사 → 실제처럼 비밀번호 변경 화면 + 미리 보기 띠에 안내');
    await P.ctx.close();
    P = await phone(b, { pv: { push: 'denied' } });
    await P.pg.goto('http://localhost:8767/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(/실제로는 「알림 켜기」 창이 먼저 뜹니다 \(알림 거부함\)/.test(await P.pg.locator('#pvBar').innerText()) && await P.pg.locator('#v-home.on').count() === 1, '8 알림을 거부한 기사 → 띠에 「실제로는 알림 켜기 창이 먼저 뜹니다 (알림 거부함)」 · 화면은 홈');
    if (process.argv[4]) await P.pg.screenshot({ path: process.argv[4] });
    await P.ctx.close();
    P = await phone(b, {});
    await P.pg.goto('http://localhost:8767/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(3000);
    await P.pg.click('#pvX').catch(() => {}); await P.pg.waitForTimeout(800);
    ok(await P.pg.evaluate(() => { try { return sessionStorage.getItem('runner.pvKey'); } catch (e) { return 'x'; } }) === null || /admin/.test(P.pg.url()), '9 [닫기] 누르면 이 탭의 열쇠도 지움');
    await P.ctx.close();
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; srv.close(); });
