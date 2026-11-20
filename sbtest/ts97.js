// S97 확인 기록 「챙길 사람」 정리: 꼭 확인(스케줄 변경 · 허위배송 · 서류) / 참고(공지 7일 · 알림함 7일) · 품앗이 새 일감 · 게시판은 뺌 · 자동 다시 알림 하루 한 번 최대 3번 → 전화할 사람 (TZ=UTC)
//  사용: node sbtest/ts97.js <runner-allinone 폴더> [화면 그림 저장 경로.png]
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
at('2026-11-20T15:00:00');
fresh().ensureColumns_();
ev(['A', 'B', 'C', 'D'].map((x) => "appendObj_(SH.DRIVERS, { id: '" + x + "', name: '기사" + x + "', status: ST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.SEEN, { kind: 'open', driverId: '" + x + "', key: '', text: '1', at: nowText_(), ackAt: nowText_() });").join(' ') +
  // A: 오늘 바뀐 스케줄 (알림 받음) · B: 4일 전에 바뀐 스케줄 (알림 받음) · C: 스케줄 변경 + 알림 못 받음 · D: 참고만
  " appendObj_(SH.PPUSH, { driverId: 'A', token: 'tA' }); appendObj_(SH.PPUSH, { driverId: 'B', token: 'tB' }); appendObj_(SH.PPUSH, { driverId: 'D', token: 'tD' });" +
  " appendObj_(SH.SEEN, { kind: 'sch', driverId: 'A', key: '2026-11-21', old: '출근', text: '휴무', at: '2026-11-20 10:00:00', ackAt: '' });" +
  " appendObj_(SH.SEEN, { kind: 'sch', driverId: 'B', key: '2026-11-21', old: '출근', text: '휴무', at: '2026-11-16 10:00:00', ackAt: '' });" +
  " appendObj_(SH.SEEN, { kind: 'sch', driverId: 'C', key: '2026-11-21', old: '출근', text: '휴무', at: '2026-11-20 10:00:00', ackAt: '' });" +
  " appendObj_(SH.NOTICE, { id: 'N1', title: '옛 공지', body: 'x', status: NST.ON, start: '2026-11-04', createdAt: '2026-11-04 10:00:00' }); appendObj_(SH.NOTICE, { id: 'N2', title: '새 공지', body: 'x', status: NST.ON, start: '2026-11-19', createdAt: '2026-11-19 10:00:00' });" +
  " appendObj_(SH.PALERT, { id: 'P1', driverId: 'D', kind: 'newjob', jobId: 'J1', text: '📢 새 품앗이 일감 · x', createdAt: '2026-11-20 00:44:52', readAt: '' }); appendObj_(SH.PALERT, { id: 'P2', driverId: 'D', kind: 'reply', jobId: 'BD-1', text: '댓글', createdAt: '2026-11-20 01:00:00', readAt: '' });" +
  " appendObj_(SH.PALERT, { id: 'P3', driverId: 'D', kind: 'picked', jobId: 'J2', text: '🤝 배정됨 · x', createdAt: '2026-11-19 01:00:00', readAt: '' }); appendObj_(SH.PALERT, { id: 'P4', driverId: 'D', kind: 'picked', jobId: 'J3', text: '🤝 옛 배정 · x', createdAt: '2026-11-01 01:00:00', readAt: '' }); cache_().remove('nt:all'); 1");
const items = (raw) => JSON.parse(ev('JSON.stringify(seenItems_(' + (raw ? "'', true" : '') + '))'));
let I = items();
const tags = (id, g) => (I[id] ? I[id].items : []).filter((y) => !g || y.g === g).map((y) => y.m + ':' + y.t);
ok(tags('A', 'need').join() === 'sched:스케줄 11/21' && tags('A', 'info').join() === 'notice:공지 1', '1 스케줄 변경 = 꼭 확인 · 공지 = 참고 (7일 넘은 「옛 공지」는 빠짐) ' + tags('A').join(' / '));
ok(tags('D').join(' / ') === 'notice:공지 1 / pm:품앗이 알림 1', '2 품앗이 새 일감 · 게시판 댓글 · 7일 넘은 알림은 뺌 → 배정 알림 1건만 (' + tags('D').join(' / ') + ')');
ok(items(true).D.items.some((y) => y.m === 'board') && /공지 2/.test(items(true).A.items.map((y) => y.t).join()), '3 원래 목록(raw)에는 그대로 있음 (정리 표시 계산용)');
ok(!I.A.call && I.B.call === 1 && I.C.call === 1 && !I.D.call, '4 전화할 사람: B(고친 지 3일 넘음) · C(휴대폰 알림 못 받음) / A · D 는 아님');
// 자동 다시 알림: 하루 한 번 · 같은 내용 최대 3번
const run = () => JSON.parse(ev('JSON.stringify(seenAutoRemind_())'));
ok(run().target === 3 && run().target === 0, '5 저녁 자동 알림: 꼭 확인 남은 3명 · 같은 날 다시 돌려도 안 보냄');
at('2026-11-21T08:00:00'); ok(run().target === 3, '6 다음 날 한 번 더');
at('2026-11-21T09:00:00'); I = items(); ok(I.A.auto === 2 && !I.A.call, '7 A: 자동 알림 2번 · 아직 전화 대상 아님');
// 같은 내용이 계속 남아 있으려면 날짜가 지나지 않아야 함 → 날짜를 뒤로 민 줄로 바꿔 3번째 확인
ev("var r = readAll_(SH.SEEN).filter(function (o) { return o.kind === 'sch' && o.driverId === 'A'; })[0]; writeFields_(SH.SEEN, r._row, { key: '2026-11-22', at: '2026-11-21 08:30:00' }); 1");
I = items(); ok(I.A.auto === 0, '8 내용이 바뀌면(새 변경) 횟수는 처음부터');
ok(run().target === 1, '9 바뀐 내용으로 다시 알림 (A 만)');
const A = JSON.parse(S.props.SEEN_AUTO); ok(A.A.n === 1 && A.B.n === 2 && A.B.last === '2026-11-21', '10 횟수 · 마지막 보낸 날 저장');
// 꼭 확인만 정리 · 묶음 알림
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const L = call('adm_seenList', [tok]);
ok(L.ok && L.rule.autoMax === 3 && L.rule.noticeDays === 7 && L.items.A.items.every((y) => y.g && !y.sg), '11 화면에 묶음(g) · 규칙을 내려 줌');
const c1 = call('adm_seenClear', [tok, 'info']);
I = items(); ok(c1.ok && c1.n >= 4 && !tags('A', 'info').length && tags('A', 'need').length === 1, '12 참고만 정리 → 꼭 확인은 남음 (' + c1.n + '건)');
ok(/seenAutoRemind_\(\)/.test(fs.readFileSync(path.join(SRC, 'FirstRun.gs'), 'utf8')), '13 매일 저녁 정해진 시간 작업에서 자동 다시 알림');
// ── 화면: 요약 카드 4개 · 묶음별 목록 · 접는 칸 (브라우저에서 실제로 그림)
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const css = ad.slice(ad.indexOf('  .al-sum {'), ad.indexOf('  /* (S85) 입금확인 선택 합계'));
const code = ad.slice(ad.indexOf("  const AL = { d: null, tab: 'todo'"), ad.indexOf("  $('#alTabs').addEventListener('click'"));
const click = ad.slice(ad.indexOf("  $('#alBody').addEventListener('click', (e) => {\n    if (e.target.id === 'alPvBtn')"), ad.indexOf("    const rb = e.target.closest('[data-alrem]');"));
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.setContent('<style>:root{--line:#e5e8ee;--sub:#6b7280;--brand:#1b64da}body{font-family:sans-serif;background:#f3f5f8;margin:0;padding:18px;font-size:14px}.btn{border:1px solid #cfd6e2;background:#fff;border-radius:8px;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer}.btn.ghost{background:#f6f8fb}.empty{background:#fff;border-radius:14px;padding:28px;text-align:center;color:#6b7280}.sub{color:#6b7280}.inp{border:1px solid #cfd6e2;border-radius:8px;padding:5px 8px}' + css + '</style><div id="view-applog"><span id="alCount"></span><div id="alTabs" class="al-tabs"></div><div id="alBody"></div></div>');
  const mkD = () => { const drv = [], items = {}; const nm = ['강준길', '고광필', '김기화', '김도윤', '박성훈', '배만호', '유정근', '윤진', '이상윤', '이용석', '임동준', '정선철'];
    nm.forEach((n, i) => { drv.push({ id: 'D' + i, name: n, camp: i % 2 ? '안양1' : '군포1', title: '' }); });
    items.D0 = { name: '강준길', camp: '군포1', auto: 1, items: [{ m: 'sched', t: '스케줄 11/21, 11/22', d: '스케줄 변경 [확인] 안 누름', g: 'need' }, { m: 'notice', t: '공지 1', d: '품앗이 기능 사용설명', g: 'info' }] };
    items.D1 = { name: '고광필', camp: '안양1', auto: 3, call: 1, items: [{ m: 'fake', t: '허위배송 1', d: '11/18 3등급', g: 'need' }] };
    items.D2 = { name: '김기화', camp: '군포1', call: 1, auto: 0, items: [{ m: 'docs', t: '배번호 서류 2종', d: '보험증권 · 차량등록증 안 올림', g: 'need' }, { m: 'app', t: '앱 5일', d: '마지막으로 연 날 11/15', g: 'app' }] };
    items.D8 = { name: '이상윤', camp: '군포1', items: [{ m: 'app', t: '앱 기록 없음', d: '기사앱을 연 기록이 없습니다', g: 'app' }, { m: 'slip', t: '10월 정산서', d: '정산서를 아직 안 열었습니다', g: 'info' }] };
    items.D9 = { name: '이용석', camp: '안양1', items: [{ m: 'notice', t: '공지 1', d: '품앗이 기능 사용설명', g: 'info' }] };
    return { ok: true, today: '2026-11-20', drivers: drv, notices: [], rows: [], act: { D0: Date.now() - 20000 }, now: Date.now(), nowMs: 300000, remind: {}, pushOff: { D2: { s: 'denied', dev: '갤럭시' } }, appSt: { D0: { s: 'app' } }, items, menus: [], clr: { at: '2026-11-20 20:00:00', by: '대표', menu: '참고', n: 12, undo: true }, clrMenus: [], rule: { noticeDays: 7, autoMax: 3, callDays: 3, autoHour: 18 }, bak: null }; };
  await page.evaluate(({ code, click, D }) => {
    window.calls = [];
    const env = { $: (s) => document.querySelector(s), $$: (s) => Array.from(document.querySelectorAll(s)), esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), koSort: (a, b) => String(a).localeCompare(String(b), 'ko'),
      api: (fn, a) => { window.calls.push([fn, a]); return Promise.resolve(fn === 'adm_seenList' ? D : { ok: true, people: 1, n: 1 }); }, toast: () => {}, pvOpen: () => {}, confirm: () => true };
    new Function(...Object.keys(env), code + '\nAL.d = ' + JSON.stringify(D) + '; AL.at = Date.now(); window.AL = AL; window.alRender = alRender; alRender();\n' + click + '\n  });')(...Object.values(env));
  }, { code, click, D: mkD() });
  const num = async (g) => Number((await page.locator('.tdx-c.' + g + ' b').innerText()).replace(/\D/g, ''));
  ok(await num('need') === 3 && await num('call') === 2 && await num('app') === 2 && await num('info') === 3, '14 요약 카드: 꼭 확인 3 · 전화할 사람 2 · 앱 안 쓰는 기사 2 · 참고 3');
  ok(await page.locator('.tdx-list .td-row').count() === 3 && /자동 알림 1 \/ 3/.test(await page.locator('.tdx-list').innerText()) && !/공지 1/.test(await page.locator('.tdx-list').innerText()), '15 처음엔 꼭 확인 목록 (참고 꼬리표는 안 섞임) · 자동 알림 횟수');
  ok(!(await page.locator('.al-more').getAttribute('open')) && /접속 중 1/.test(await page.locator('.al-more summary').innerText()) && /알림 못 받음 1/.test(await page.locator('.al-more summary').innerText()), '16 기사앱 상태는 한 줄로 접힘 (접속 중 1 · 알림 못 받음 1)');
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  await page.click('.tdx-c.call');
  ok(await page.locator('.tdx-list .td-row').count() === 2 && /📞 전화/.test(await page.locator('.tdx-list').innerText()) && /자동 알림 3번 보냄/.test(await page.locator('.tdx-list').innerText()) && /알림 거부함/.test(await page.locator('.tdx-list').innerText()), '17 전화할 사람: 이유 표시 (자동 알림 3번 보냄 · 알림 거부함)');
  await page.click('.tdx-c.info');
  ok(await page.locator('[data-alclr="info"]').count() === 1 && await page.locator('[data-alclrundo]').count() === 1, '18 참고: 「🧹 정리」 · 「정리 되돌리기」가 목록 바로 위에');
  await page.click('[data-alclr="info"]'); await page.waitForTimeout(50);
  ok((await page.evaluate(() => window.calls)).some((c) => c[0] === 'adm_seenClear' && c[1] === 'info'), '19 정리는 고른 묶음(참고)만');
  await page.click('.tdx-c.app');
  ok(/앱 기록 없음/.test(await page.locator('.tdx-list').innerText()) && /한 번도 안 엶 1 · 3일 넘음 1/.test(await page.locator('.tdx-c.app').innerText()), '20 앱 안 쓰는 기사: 한 번도 안 엶 · 3일 넘음 나눠 셈');
  if (process.argv[3]) { await page.setViewportSize({ width: 390, height: 800 }); await page.evaluate(() => { document.documentElement.classList.add('m'); window.AL.grp = 'need'; window.alRender(); }); await page.screenshot({ path: process.argv[3].replace(/\.png$/, '_m.png'), fullPage: true }); }
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; }).finally(() => browser && browser.close());
