// S107 ② 실제 브라우저 · 빌드한 기사앱(sbout): 알림 못 받는 기사 미리 보기 → 「알림 켜기」 창이 뜨고, 누르면 닫히며 알림 등록 · 상태 기록 호출 없음
//  사용: node sbtest/ts107b.js <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path'), http = require('http');
const OUT = process.argv[2] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(8771);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const KEY = 'PV' + 'b'.repeat(64);
async function phone(b, pv) {
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S936N) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136.0 Mobile Safari/537.36', viewport: { width: 412, height: 900 }, isMobile: true });
  const calls = [];
  await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('http://localhost:8771')) return r.continue();
    if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(r.request().postData() || '{}'); } catch (e) {} calls.push(bd.fn); let out = { ok: true };
      if (bd.fn === 'api_checkSession') out = { ok: true, user: { name: '유지호', loginId: 'y' }, slipClose: '', menuOff: [], pv: Object.assign({ name: '유지호', until: Date.now() + 600000, online: false, lastAt: 0, mc: false, push: '' }, pv) };
      if (bd.fn === 'api_notices') out = { ok: true, today: '2026-11-21', notices: [], seenIds: [] };
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); }
    return r.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage(); return { ctx, pg, calls };
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    let P = await phone(b, {});
    await P.pg.goto('http://localhost:8771/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(4500);
    const vis = await P.pg.locator('#pushPop:not(.hidden)').count(), t = vis ? (await P.pg.locator('#pushPop').innerText()).replace(/\s+/g, ' ') : '';
    ok(vis === 1 && /알림을 켜야 러너 앱을 쓸 수 있습니다/.test(t) && /미리 보기 · 기사 휴대폰에서는 이 창이 먼저 뜹니다/.test(t), '1 알림 등록 없는 기사(유지호) 미리 보기 → 실제처럼 「알림 켜기」 창 (' + t.slice(0, 60) + '…)');
    if (process.argv[3]) await P.pg.screenshot({ path: process.argv[3] });
    await P.pg.click('#pushPopGo'); await P.pg.waitForTimeout(600);
    ok(await P.pg.locator('#pushPop.hidden').count() === 1, '2 [알림 켜기] 누르면 창 닫힘');
    ok(!P.calls.some((f) => /api_pushState|api_pmPushSave|api_pmPushConfig|api_appState/.test(f)), '3 알림 설정 · 기기 등록 · 상태 기록 호출 없음 (' + P.calls.join(',') + ')');
    await P.ctx.close();
    P = await phone(b, { push: 'ios' });
    await P.pg.goto('http://localhost:8771/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(4500);
    ok(/홈 화면에 러너 앱을 설치/.test(await P.pg.locator('#pushPop').innerText()) && /닫기 \(미리 보기\)/.test(await P.pg.locator('#pushPopGo').innerText()), '4 아이폰 미설치 기사 → 설치 안내 창 · [닫기 (미리 보기)]');
    await P.pg.click('#pushPopGo'); await P.pg.waitForTimeout(500);
    ok(await P.pg.locator('#pushPop.hidden').count() === 1, '5 닫기로 닫힘');
    await P.ctx.close();
    P = await phone(b, { push: null });
    await P.pg.goto('http://localhost:8771/?pvt=1#pv=' + KEY, { waitUntil: 'commit' }); await P.pg.waitForTimeout(4500);
    ok(await P.pg.locator('#pushPop:not(.hidden)').count() === 0, '6 알림 받는 기사 → 창 안 뜸');
    await P.ctx.close();
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; srv.close(); });
