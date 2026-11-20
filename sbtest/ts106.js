// S106 폰마다 다르게 보이던 것 맞추기: ① 화면(Index · Admin)만 바꿔도 버전 번호가 바뀜(→ 「새 버전」) ② 앱을 내려 뒀다 다시 열 때 새 버전이면 저절로 새 화면(입력 중 아님 · 한 번만)
//  ③ 공지 새 글 · 팝업 · 지시사항 팝업을 서버 확인 기록 기준으로 — 같은 기사라면 어느 폰 · 브라우저에서나 같게 (TZ=UTC)
//  사용: node sbtest/ts106.js <runner-allinone 폴더> <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path'), http = require('http');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const OUT = process.argv[3] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
// ① 빌드: 버전 번호에 화면도 들어감
const bj = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
ok(/ver: 'sb-' \+ h\(engine \+ boot \+ app \+ pagesSrc\)/.test(bj) && /\['Index\.html', 'Admin\.html'\]/.test(bj), '1 버전 번호 = 서버 코드 + 기사앱 · 관리자 화면 (화면만 고쳐도 새 버전)');
// ③ 서버: 본인 접속에도 본 공지 · 누른 지시사항 목록
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T22:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.DRIVERS, { id: 'A', name: '기사A', status: ST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.NOTICE, { id: 'N1', title: '본 공지', body: 'x', status: NST.ON, important: 'Y', start: '2026-11-19', createdAt: '2026-11-19 10:00:00' }); cache_().remove('nt:all'); " +
  "appendObj_(SH.SEEN, { kind: 'notice', driverId: 'A', key: 'N1', at: '2026-11-19 12:00:00' }); appendObj_(SH.SEEN, { kind: 'inst', driverId: 'A', key: '2026-11-21|7', at: '2026-11-20 12:00:00' }); 1");
const TA = ev("createSession_('A', true).token");
let r = call('api_notices', [TA]);
ok(r.ok && JSON.stringify(r.seenIds) === '["N1"]' && r.pvSeen === undefined, '2 기사 본인 접속에도 서버 확인 기록(본 공지)을 내려 줌 → 다른 폰 · 브라우저에서도 같게');
r = call('api_mySchedule', [TA, '2026-11']);
ok(JSON.stringify(r.instSeen) === '["2026-11-21|7"]', '3 누른 지시사항도 (다른 폰에서 다시 안 뜸)');
// ② · ③ 화면 (실제 브라우저)
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.json') ? 'application/json' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(8768);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
async function phone(b, o) {
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S936N) AppleWebKit/537.36 Chrome/136.0 Mobile Safari/537.36', viewport: { width: 412, height: 900 }, isMobile: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sbt:runner.token')) { localStorage.setItem('sbt:runner.token', 'TOK_A'); localStorage.setItem('sbt:runner.user', JSON.stringify({ name: '기사A', loginId: 'a' })); } } catch (e) {} });
  const st = { navs: [] };
  await ctx.route('**/*', (rt) => { const u = rt.request().url();
    if (/version\.json/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ver: o.newVer || 'sb-zzzzzzzz' }) });
    if (u.startsWith('http://localhost:8768')) return rt.continue();
    if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(rt.request().postData() || '{}'); } catch (e) {} let out = { ok: false };
      if (bd.fn === 'api_checkSession') out = { ok: true, user: { name: '기사A', loginId: 'a' }, slipClose: '', menuOff: [] };
      if (bd.fn === 'api_notices') out = Object.assign({ ok: true, today: '2026-11-20', notices: [{ id: 'N1', title: '앱 시행', body: 'b', important: true, date: '2026-11-04', updatedAt: '2026-11-04 10:00:00' }] }, o.seenIds ? { seenIds: o.seenIds } : {});
      return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage();
  pg.on('framenavigated', (f) => { if (f === pg.mainFrame()) st.navs.push(f.url()); });
  return { ctx, pg, st };
}
const hideShow = (pg, ms) => pg.evaluate((ms) => new Promise((res) => {
  const set = (v) => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
  const now = Date.now; set('hidden'); Date.now = () => now() + ms; set('visible'); setTimeout(() => { Date.now = now; res(); }, 50);
}), ms).catch(() => {}); // 새 화면으로 바뀌면 이 실행은 끊김 (정상)
const vNav = (st) => st.navs.filter((u) => /[?&]v=/.test(u));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    // 다른 폰(이 기기에는 본 표시 없음)이라도 서버에 본 기록이 있으면 팝업 안 뜸
    let P = await phone(b, { seenIds: ['N1'] });
    await P.pg.goto('http://localhost:8768/index.html', { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(await P.pg.locator('#v-home.on').count() === 1 && await P.pg.locator('#ntPop:not(.hidden)').count() === 0, '4 다른 폰에서 열어도 서버에 본 기록이 있는 중요 공지는 팝업 안 뜸');
    await P.ctx.close();
    P = await phone(b, {});
    await P.pg.goto('http://localhost:8768/index.html', { waitUntil: 'commit' }); await P.pg.waitForTimeout(3500);
    ok(await P.pg.locator('#ntPop:not(.hidden)').count() === 1, '5 (그대로) 본 기록이 없으면 팝업 뜸');
    await P.ctx.close();
    // 새 버전: 30초 넘게 내려 뒀다 다시 열면 저절로 새 화면 (?v=새 버전)
    P = await phone(b, { newVer: 'sb-newver01', seenIds: ['N1'] });
    await P.pg.goto('http://localhost:8768/index.html', { waitUntil: 'commit' }); await P.pg.waitForTimeout(3000);
    P.st.navs.length = 0;
    await hideShow(P.pg, 5000); await P.pg.waitForTimeout(1500);
    ok(!vNav(P.st).length, '6 잠깐(30초 안) 내렸다 열면 그대로 (기사 화면이 갑자기 안 바뀜)');
    await hideShow(P.pg, 45000); await P.pg.waitForTimeout(2500);
    ok(P.st.navs.some((u) => /[?&]v=sb-newver01/.test(u)), '7 30초 넘게 내렸다 열면 새 버전 화면으로 저절로 (주소 ?v=새 버전 · 휴대폰에 저장된 예전 화면 건너뜀) ' + JSON.stringify(P.st.navs.slice(0, 2)));
    await P.pg.waitForTimeout(2500); await P.pg.evaluate(() => { window.__same = 1; }); await hideShow(P.pg, 45000); await P.pg.waitForTimeout(2500);
    ok(await P.pg.evaluate(() => window.__same === 1) && await P.pg.locator('#verBar').count() === 1, '8 같은 버전은 한 번만 시도 → 그래도 예전이면(휴대폰이 예전 화면을 줌) 안내 띠 (새로고침 되풀이 안 함)');
    // 안내 띠가 먼저 떠 있었어도(앱을 연 채로 15초 지나 안내가 뜬 뒤 내려 둠) 다시 열 때 저절로 새 화면
    await P.ctx.close();
    P = await phone(b, { newVer: 'sb-newver03', seenIds: ['N1'] });
    await P.pg.goto('http://localhost:8768/index.html', { waitUntil: 'commit' }); await P.pg.waitForTimeout(2500);
    await P.pg.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); }); await P.pg.waitForTimeout(16000);
    const barFirst = await P.pg.locator('#verBar').count();
    P.st.navs.length = 0; await hideShow(P.pg, 45000); await P.pg.waitForTimeout(2500);
    ok(barFirst === 1 && P.st.navs.some((u) => /[?&]v=sb-newver03/.test(u)), '8b 안내 띠가 먼저 떠 있었어도(기사가 안 누름) 내려 뒀다 다시 열면 저절로 새 화면');
    await P.ctx.close();
    P = await phone(b, { newVer: 'sb-newver02', seenIds: ['N1'] });
    await P.pg.goto('http://localhost:8768/index.html', { waitUntil: 'commit' }); await P.pg.waitForTimeout(3000);
    await P.pg.evaluate(() => { const i = document.createElement('input'); i.id = 'typing'; document.body.appendChild(i); i.focus(); });
    P.st.navs.length = 0; await hideShow(P.pg, 45000); await P.pg.waitForTimeout(2000);
    ok(!vNav(P.st).length && await P.pg.locator('#verBar').count() === 1, '9 글을 입력하던 중이면 저절로 안 바꾸고 안내 띠만');
    await P.ctx.close();
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; srv.close(); });
