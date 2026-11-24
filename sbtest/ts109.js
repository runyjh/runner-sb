// S109 기사앱 마이페이지 묶음: 알림 · 품앗이(수수료 무료 띠 · 올린/도와준 숫자 · 하위 6개) · 내 라우트 성적 · 내 계정 · 로그아웃
//  큰 카드 · 아이콘|이름|숫자|› 네 칸 정렬 · 한 번에 하나만 펼침 · 마지막 펼친 것 기억 · 품앗이 끈 기사는 품앗이 묶음 숨김 · 실제 브라우저(빌드한 기사앱)
//  사용: node sbtest/ts109.js <빌드 폴더(sbout)> [화면 저장 경로]
const fs = require('fs'), path = require('path'), http = require('http');
const OUT = process.argv[2] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(8773);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
async function phone(b, o) {
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S936N) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136.0 Mobile Safari/537.36', viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('sbt:runner.token')) { localStorage.setItem('sbt:runner.token', 'TOK_A'); localStorage.setItem('sbt:runner.user', JSON.stringify({ name: '기사A', loginId: 'a' })); } } catch (e) {} });
  await ctx.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://localhost:8773')) return rt.continue();
    if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(rt.request().postData() || '{}'); } catch (e) {} CALLS.push(bd.fn); let out = { ok: true };
      if (bd.fn === 'api_checkSession') out = { ok: true, user: { name: '기사A', loginId: 'a' }, slipClose: '', menuOff: o.menuOff || [] };
      if (bd.fn === 'api_notices') out = { ok: true, today: '2026-11-21', notices: [], seenIds: [] };
      if (bd.fn === 'api_myInfo') out = { ok: true, postOn: o.postOn !== false, ext: o.ext !== false /* (S176) 예전 6줄은 외부용 · 내부용은 3줄 (아래 29) */, info: { name: '기사A', type: '6일', camp: '군포1' }, stats: { posted: 3, helped: 1, waiting: 2, giveDays: 0, offers: 0 } };
      if (bd.fn === 'api_myPerf') out = o.perf === false ? { ok: true, on: false } : { ok: true, on: true, camp: '군포1', routes: [{ camp: '군포1', code: '212A', weeks: [{ wk: '2026-W46', rate: 99, g: 1, t: 99 }] }], recent: [], weeks: [], campAll: [{ camp: '군포1', code: '212A', wk: '2026-W46', rate: 99, g: 1 }, { camp: '안양1', code: '110A', wk: '2026-W46', rate: 97, g: 1 }] };
      if (bd.fn === 'api_pmAlerts') out = { ok: true, ver: 'v1', alerts: o.alerts || [], unread: (o.alerts || []).length };
      if (bd.fn === 'api_myFake' && o.fk) out = { ok: true, on: true, routes: [{ camp: '군포1', code: '212A', weeks: [{ wk: '2026-W46', n: 1 }] }], campAll: [] };
      return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => ERRS.push(e.message));
  await pg.goto('http://localhost:8773/', { waitUntil: 'commit' }); await pg.waitForTimeout(3000);
  await pg.addStyleTag({ content: '#pushPop, #instPop, #ntPop, .ihelp { display: none !important; }' }); // 이 시험과 상관없는 첫 화면 안내 창
  await pg.evaluate(() => document.getElementById('mMy').click()); await pg.waitForTimeout(1500);
  return { ctx, pg };
}
const ERRS = [], CALLS = [];
const vis = (pg, sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); return !!(e && e.offsetParent !== null && e.getBoundingClientRect().height > 0); }, sel);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    let P = await phone(b, {});
    const pg = P.pg;
    ok(await vis(pg, '#v-mypage .myg[data-my="alerts"]') && await vis(pg, '#myPmGrp > .myg') && await vis(pg, '[data-grp="acc"] > .myg'), '1 처음 화면: 알림 · 품앗이 · 내 계정 묶음 줄이 보임');
    ok(!(await vis(pg, '[data-my="give"]')) && !(await vis(pg, '[data-my="info"]')) && !(await vis(pg, '#v-mypage .pmban')), '2 하위 메뉴 · 수수료 무료 띠는 처음엔 접혀 있음 (맨 위 띠 없음)');
    ok(!(await pg.locator('#myPosted').count()), '3 「내가 올린 일감」 빈 카드 없음');
    ok((await pg.locator('#myCard').innerText()).indexOf('올린 품앗이') < 0, '4 프로필 카드에는 이름 · 소속만 (품앗이 숫자는 품앗이 안으로)');
    ok(/^새 (지원|신청) 2$/.test((await pg.locator('#myPmCnt').innerText()).trim()), '5 품앗이 묶음 줄에 「새 지원 2」(내부용은 「새 신청 2」 · S186) (아래 「내가 올린 일감」 줄과 같은 말)');
    const h = await pg.evaluate(() => [document.querySelector('#myPmGrp > .myg').getBoundingClientRect().height, document.querySelector('[data-my="alerts"]').getBoundingClientRect().height]);
    ok(h[0] >= 74 && h[1] >= 74, '6 묶음 줄 높이 76 근처 (' + h.join(',') + ')');
    await pg.click('#myPmGrp > .myg'); await pg.waitForTimeout(300);
    ok(await vis(pg, '#myPmGrp .pmban') && /수수료 무료/.test(await pg.locator('#myPmGrp .pmban').innerText()), '7 품앗이를 펼치면 첫 줄에 수수료 무료 띠');
    ok(/3\s*올린 품앗이/.test(await pg.locator('#myPmStat').innerText()), '8 올린 · 도와준 숫자는 품앗이 안에');
    ok(await vis(pg, '[data-my="give"]') && await vis(pg, '[data-my="done"]'), '9 하위 6개 보임');
    const al = await pg.evaluate(() => { const L = (s) => Math.round(document.querySelector(s).getBoundingClientRect().left); return [L('#myPmGrp > .myg .tx'), L('[data-my="give"] .mylab'), L('[data-my="done"] .mylab'), L('[data-my="alerts"] .tx')]; });
    ok(new Set(al).size === 1, '10 묶음 이름과 하위 메뉴 글자가 같은 선에서 시작 (' + al.join(',') + ')');
    const ar = await pg.evaluate(() => [Math.round(document.querySelector('#myPmCnt').getBoundingClientRect().right), Math.round(document.querySelector('#myNew').getBoundingClientRect().right)]);
    ok(ar[0] === ar[1] && ar[0] > 330, '11 빨간 숫자는 묶음 줄 · 하위 줄 모두 같은 오른쪽 선 (› 앞) (' + ar.join(',') + ')');
    const sh = await pg.evaluate(() => Math.round(document.querySelector('[data-my="give"]').getBoundingClientRect().height));
    ok(sh >= 58, '12 하위 메뉴 줄 높이 60 근처 (' + sh + ')');
    if (process.argv[3]) await pg.screenshot({ path: process.argv[3], fullPage: true });
    await pg.click('[data-grp="acc"] > .myg'); await pg.waitForTimeout(300);
    ok(!(await vis(pg, '[data-my="give"]')) && await vis(pg, '[data-my="info"]'), '13 다른 묶음을 펼치면 앞 묶음은 접힘 (한 번에 하나)');
    await pg.click('[data-my="info"]'); await pg.waitForTimeout(300);
    ok(await vis(pg, '#v-myinfo'), '14 하위 메뉴(내 정보)는 지금처럼 그 화면으로');
    await pg.evaluate(() => document.getElementById('myBack') && 0); await pg.evaluate(() => { history.back(); }); await pg.waitForTimeout(400);
    await pg.evaluate(() => document.getElementById('mMy').click()); await pg.waitForTimeout(800);
    ok(await vis(pg, '[data-my="info"]'), '15 마이페이지를 다시 열면 마지막에 펼친 묶음(내 계정)이 펼쳐진 채');
    await pg.click('[data-grp="acc"] > .myg'); await pg.waitForTimeout(200);
    ok(!(await vis(pg, '[data-my="info"]')), '16 펼친 묶음을 다시 누르면 접힘');
    ok(await vis(pg, '#v-mypage .mylogout'), '17 로그아웃은 맨 아래 글자 버튼');
    await P.ctx.close();
    P = await phone(b, { menuOff: ['pm'] });
    ok(!(await vis(P.pg, '#myPmGrp')), '18 품앗이를 끈 기사: 품앗이 묶음째 숨김');
    await P.ctx.close();
    // 하위 메뉴마다 원래 화면으로 가는지 (마이페이지로 돌아와 다시 누름)
    P = await phone(b, {});
    const cur = () => P.pg.evaluate(() => { const v = [...document.querySelectorAll('section.view')].find((x) => x.offsetParent !== null && x.getBoundingClientRect().height > 0); return v ? v.id : ''; });
    const GO = { give: 'v-pmgive', find: 'v-pmgive', posted: 'v-pmmine', applied: 'v-pmmine', done: 'v-pmmine', alerts: 'v-pmalerts', info: 'v-myinfo', pw: 'v-changepw' };
    const got = {};
    for (const k of Object.keys(GO)) {
      await P.pg.evaluate(() => document.getElementById('mMy').click()); await P.pg.waitForTimeout(500);
      const grp = ['info', 'pw'].includes(k) ? 'acc' : k === 'alerts' ? '' : 'pm';
      if (grp) await P.pg.evaluate((g) => { const el = document.querySelector('#v-mypage .mygrp[data-grp="' + g + '"]'); if (!el.classList.contains('open')) el.querySelector('.myg').click(); }, grp);
      await P.pg.waitForTimeout(200);
      await P.pg.click('#v-mypage [data-my="' + k + '"]'); await P.pg.waitForTimeout(500);
      got[k] = await cur();
    }
    await P.pg.evaluate(() => document.getElementById('mMy').click()); await P.pg.waitForTimeout(500); await P.pg.evaluate(() => { const el = document.querySelector('#myPmGrp'); if (!el.classList.contains('open')) el.querySelector('.myg').click(); }); CALLS.length = 0;
    await P.pg.click('#v-mypage [data-my="new"]'); await P.pg.waitForTimeout(500);
    ok(CALLS.includes('api_pmForm') || CALLS.includes('api_pmQuick'), '20b 일감 올리기 → 올리기 화면 자료 요청(api_pmForm · 내부용은 api_pmQuick 코드별 맡기기 S165) · 화면은 이 시험의 가짜 자료로는 못 그림');
    const bad = Object.keys(GO).filter((k) => got[k] !== GO[k]);
    ok(!bad.length, '20 하위 메뉴 8개가 모두 원래 화면으로 감 ' + (bad.length ? JSON.stringify(bad.map((k) => k + '→' + got[k])) : ''));
    await P.pg.evaluate(() => document.getElementById('mMy').click()); await P.pg.waitForTimeout(1200);
    ok(await vis(P.pg, '#myStatMenu > .myg'), '21 내 라우트 자료가 있으면 「내 라우트 성적」 묶음이 보임');
    await P.pg.click('#myStatMenu > .myg'); await P.pg.waitForTimeout(200);
    ok(await vis(P.pg, '#myPerfBtn') && !(await vis(P.pg, '#myPerf')), '22 펼치면 「수행률」 줄 · 내용은 접힌 채');
    await P.pg.click('#myPerfBtn'); await P.pg.waitForTimeout(300);
    ok(await vis(P.pg, '#myPerf') && /212A/.test(await P.pg.locator('#myPerf').innerText()), '23 수행률을 누르면 내용이 그 아래 펼쳐짐');
    ok(await vis(P.pg, '#myCaBtn'), '23b 우리 캠프 자료가 있으면 「우리 캠프 라우트」 줄은 「내 라우트 성적」 안에');
    await P.pg.click('#myCaBtn'); await P.pg.waitForTimeout(300);
    const cs = await P.pg.evaluate(() => [...document.querySelectorAll('#myCa .ca-sel button')].map((b) => Math.round(b.getBoundingClientRect().height) + '|' + getComputedStyle(b, '::after').content + '|' + Math.round(b.getBoundingClientRect().width)));
    ok(cs.length === 2 && cs.every((x) => +x.split('|')[0] < 40 && +x.split('|')[2] < 200), '23c 펼친 내용 안 작은 버튼(캠프 고르기)은 큰 메뉴 줄 모양으로 바뀌지 않음 (' + cs.join(' , ') + ')');
    if (process.argv[4]) await P.pg.screenshot({ path: process.argv[4], fullPage: true });
    await P.ctx.close();
    P = await phone(b, { perf: false });
    ok(!(await vis(P.pg, '#myStatMenu')), '24 내 라우트 자료(수행률 · 가중요인 · 허위배송 · 우리 캠프)가 하나도 없으면 「내 라우트 성적」 묶음째 숨김 (예전: 우리 캠프 라우트가 빈 안내로 늘 보임)');
    await P.ctx.close();
    // 일감 올리기를 끈 때(제안만): 일감 올리기 줄 숨김 · 이름과 아이콘이 제안에 맞게
    P = await phone(b, { postOn: false });
    await P.pg.evaluate(() => { const el = document.querySelector('#myPmGrp'); if (!el.classList.contains('open')) el.querySelector('.myg').click(); }); await P.pg.waitForTimeout(300);
    const off = await P.pg.evaluate(() => ({ nw: !!document.querySelector('[data-my="new"]').offsetParent, ps: document.querySelector('[data-my="posted"]').innerText.replace(/\s+/g, ' ').trim(), ap: document.querySelector('[data-my="applied"]').innerText.replace(/\s+/g, ' ').trim() }));
    ok(!off.nw && /^📤 보낸 제안/.test(off.ps) && /^📥 받은 제안/.test(off.ap), '26 일감 올리기를 끈 때: 올리기 줄 숨김 · 「📤 보낸 제안」 「📥 받은 제안」 ' + JSON.stringify(off));
    await P.ctx.close();
    // 수행률은 없고 우리 캠프만 있을 때: 맨 위 줄에 선이 겹치지 않음
    P = await phone(b, { perf: false, fk: true });
    await P.pg.evaluate(() => { const g = document.querySelector('#myStatMenu'); if (!g.classList.contains('hidden') && !g.classList.contains('open')) g.querySelector('.myg').click(); }); await P.pg.waitForTimeout(300);
    const bt = await P.pg.evaluate(() => { const v = [...document.querySelectorAll('#myStatMenu .mylist > button')].filter((x) => x.offsetParent); return v.map((x) => x.id + ':' + getComputedStyle(x).borderTopWidth); });
    ok(bt.length >= 1 && /:0px$/.test(bt[0]) && bt.slice(1).every((x) => /:1px$/.test(x)), '27 앞 줄(수행률)이 숨겨져도 첫 줄 위에 선이 겹치지 않고 그다음 줄부터 선 ' + JSON.stringify(bt));
    await P.ctx.close();
    // 허위배송 알림을 누르면: 마이페이지 → 「내 라우트 성적」 펼침 → 허위 배송완료 내용 펼침
    P = await phone(b, { fk: true, alerts: [{ id: 'A1', jobId: 'FK-1', title: '허위 배송완료 안내', text: '212A', at: Date.now(), read: false }] });
    await P.pg.evaluate(() => document.querySelector('[data-my="alerts"]').click()); await P.pg.waitForTimeout(800);
    await P.pg.evaluate(() => { const b2 = document.querySelector('#paList [data-pj="FK-1"]'); if (b2) b2.click(); }); await P.pg.waitForTimeout(1200);
    ok(await vis(P.pg, '#myFkBtn') && await vis(P.pg, '#myFk') && await P.pg.evaluate(() => document.querySelector('#myStatMenu').classList.contains('open')), '28 허위배송 알림 → 「내 라우트 성적」이 펼쳐지고 허위 배송완료 내용까지 보임');
    await P.ctx.close();
    // (S176) 내부용(기본): 품앗이 묶음은 일감 주기 · 일감 받기 · 품앗이 확인 3줄 · 예전 6줄은 숨김 · 각각 그 칸으로
    P = await phone(b, { ext: false });
    await P.pg.evaluate(() => { const el = document.querySelector('#myPmGrp'); if (!el.classList.contains('open')) el.querySelector('.myg').click(); }); await P.pg.waitForTimeout(300);
    const rows = await P.pg.evaluate(() => [...document.querySelectorAll('#myPmGrp .mylist > button')].filter((x) => x.offsetParent).map((x) => x.dataset.my));
    ok(rows.join(',') === 'pmgive,pmtake,pmchk', '29 내부용: 품앗이 3줄만 보임 (' + rows.join(',') + ')');
    const GO2 = { pmtake: 'v-pumasi', pmchk: 'v-pmmine' }, got2 = {};
    for (const k of Object.keys(GO2)) {
      await P.pg.evaluate(() => document.getElementById('mMy').click()); await P.pg.waitForTimeout(500);
      await P.pg.evaluate(() => { const el = document.querySelector('#myPmGrp'); if (!el.classList.contains('open')) el.querySelector('.myg').click(); }); await P.pg.waitForTimeout(200);
      await P.pg.click('#v-mypage [data-my="' + k + '"]'); await P.pg.waitForTimeout(600);
      got2[k] = await cur();
    }
    ok(got2.pmtake === 'v-pumasi' && got2.pmchk === 'v-pmmine', '30 일감 받기 → 품앗이 목록 · 품앗이 확인 → 확인 화면 ' + JSON.stringify(got2));
    await P.ctx.close();
    // 기사앱 문구 바꾸기(관리자)에서 묶음 이름도 고칠 수 있게: 같은 규칙에 .mygrp .tx
    const ix = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
    ok(/\.mygrp \.tx, \.pmban/.test(ix), '25 기사앱 문구 바꾸기 대상에 묶음 이름');
    ok(!ERRS.length, '19 화면 스크립트 오류 없음 (예: 없앤 카드를 찾다 멈추는 것) ' + ERRS.slice(0, 2).join(' / '));
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; srv.close(); });
