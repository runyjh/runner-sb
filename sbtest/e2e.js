const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const BASE = 'http://127.0.0.1:8765';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|pretendard|ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  page.on('dialog', (d) => { errs.push('dialog: ' + d.message().slice(0, 200)); d.accept(); });
  const pillOk = () => page.waitForFunction(() => /준비됨|ms/.test((document.querySelector("#sbPill") || {}).textContent || ''), null, { timeout: 30000 });
  await page.goto(BASE + '/runner-sb/admin/');
  await page.waitForSelector('#sbEm'); console.log('1 시험판 로그인 창');
  await page.fill('#sbEm', 'me@x'); await page.fill('#sbPw', 'bad'); await page.click('#sbBox button.pri');
  await page.waitForFunction(() => /맞지 않습니다/.test(document.querySelector('#sbBox .err').textContent)); console.log('2 틀린 비밀번호 안내');
  await page.fill('#sbPw', 'pw'); await page.click('#sbBox button.pri');
  await page.waitForSelector('#sbDrop'); console.log('3 자료 없음 → 가져오기 창');
  await page.setInputFiles('#sbDrop input', ['fx_main.xlsx', 'fx_sch.xlsx', 'fx_stl.xlsx'].map((f) => __dirname + '/' + f));
  console.log('   파일:', (await page.$$eval('#sbFl li', (l) => l.map((x) => x.textContent))).join(' / '));
  await page.click('#sbGo');
  await page.waitForFunction(() => /가져오기 끝|가져오지 못/.test((document.querySelector('#sbBox h2') || {}).textContent || ''), null, { timeout: 60000 });
  console.log('4', (await page.textContent('#sbBox p')).trim());
  await Promise.all([page.waitForNavigation(), page.click('#sbBox button.pri')]);
  await pillOk(); console.log('5 다시 열림:', await page.textContent('#sbPill'));
  // 관리자 로그인 (앱 화면 그대로)
  await page.fill('#lgId', 'boss'); await page.fill('#lgPw', 'anything1'); await page.check('#lgAuto'); await page.click('#lgBtn');
  await page.waitForFunction(() => { const n = document.querySelector('.nav a[data-view="dash"]'); return n && n.offsetParent; }, null, { timeout: 15000 });
  console.log('6 관리자 로그인 됨');
  // 자료 넣기 (앱이 서버를 부르는 길 그대로)
  const api = (fn, ...args) => page.evaluate(async ([fn, args]) => { const tok = localStorage.getItem('runner.admin.token') || sessionStorage.getItem('runner.admin.token'); const r = await fetch(window.RUNNER_CONFIG.api, { method: 'POST', body: JSON.stringify({ fn, args: [tok].concat(args) }) }); return r.json(); }, [fn, args]);
  const camp = await api('adm_campSave', { name: '군포1캠프', address: '경기 군포시', rot: 'D1,D2' }); console.log('7 캠프', camp.ok, camp.msg || '');
  const campId = (camp.camp && camp.camp.id) || camp.id || (camp.camps && camp.camps[0] && camp.camps[0].id);
  for (const code of ['212CD', '110AB']) { const r = await api('adm_routeSave', { campId, code }); if (!r.ok) console.log('   노선 실패', code, r.msg); }
  for (let i = 1; i <= 6; i++) { const r = await api('adm_createDriver', { name: '기사' + i, loginId: 'drv' + i + '@df', driverType: i < 5 ? '고정' : '백업', phone: '010-1234-56' + (10 + i), schCampId: campId, baseRoute: i % 2 ? '212CD' : '110AB' }); if (!r.ok) console.log('   기사 실패', i, r.msg); }
  const wk = await api('adm_schWeek', '2026-11-15'); console.log('8 스케줄 읽기', wk.ok, wk.msg || '', 'rows', (wk.rows || wk.drivers || []).length);
  // 메뉴 전부 눌러 보기
  const views = await page.$$eval('.nav a[data-view]', (l) => l.map((a) => a.dataset.view + (a.dataset.stGo ? ':' + a.dataset.stGo : '')));
  for (let i = 0; i < views.length; i++) {
    await page.evaluate((i) => document.querySelectorAll('.nav a[data-view]')[i].click(), i);
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(800);
  const log = await page.evaluate(() => window.__sbLog);
  const bad = log.filter((x) => !x.ok);
  console.log('9 메뉴 ' + views.length + '개 순회 · 호출 ' + log.length + '번 · 실패 ' + bad.length + (bad.length ? '\n   ' + bad.map((x) => x.fn + ': ' + x.msg).join('\n   ') : ''));
  const slow = log.slice().sort((a, b) => b.ms - a.ms).slice(0, 5).map((x) => x.fn + ' ' + Math.round(x.ms) + 'ms'); console.log('   느린 순:', slow.join(' · '));
  // 기사스케줄 화면에서 칸 저장 (앱 화면을 통한 저장은 실제 자료에서 확인 · 여기서는 서버 길로)
  await page.evaluate(() => document.querySelector('.nav a[data-view="sched"]').click()); await page.waitForTimeout(600);
  const rng = await api('adm_schRange', '2026-11-15', '2026-11-28');
  const rows = (rng.drivers || []);
  console.log('10 스케줄 범위', rng.ok, Object.keys(rng).join(','), 'drivers', rows.length);
  if (rows.length) { const id = rows[0].id || rows[0].row; const sv = await api('adm_schSave', [{ row: id, date: '2026-11-18', value: '휴무', old: '' }]); console.log('   칸 저장', JSON.stringify(sv).slice(0, 200)); const again = await api('adm_schRange', '2026-11-15', '2026-11-28'); console.log('   다시 읽은 칸:', JSON.stringify((again.cells || {})[id])); }
  console.log('11 알림 줄:', await page.textContent('#sbPill'));
  await page.screenshot({ path: 'e2e-2.png' });
  await page.click('#sbPill'); await page.waitForSelector('#sbBox table'); await page.screenshot({ path: 'e2e-3.png' });
  console.log('12 속도 창:', (await page.$$eval('#sbBox .sum div', (l) => l.map((x) => x.textContent))).join(' | '));
  await page.click('#sbOk');
  // 새로고침 → 자동 로그인 유지 · 방금 넣은 칸 그대로
  await page.reload(); await page.waitForTimeout(2500); await page.screenshot({ path: 'e2e-4.png' }); console.log('   새로고침 뒤 알림 줄:', await page.textContent('#sbPill').catch(() => '없음'), await page.evaluate(() => (document.querySelector('#sbBox') || {}).innerText || '')); await pillOk();
  await page.waitForFunction(() => { const n = document.querySelector('.nav a[data-view="dash"]'); return n && n.offsetParent; }, null, { timeout: 15000 });
  console.log('13 새로고침 뒤 자동 로그인 유지');
  // 운영 앱 보관함을 건드리지 않았는지
  const keys = await page.evaluate(() => { const f = document.createElement('iframe'); document.body.appendChild(f); const real = f.contentWindow.localStorage, o = []; for (let i = 0; i < real.length; i++) o.push(real.key(i)); f.remove(); return o; });
  console.log('14 실제 보관함 키:', keys.map((k) => k.slice(0, 28)).join(', '));
  const srv = await (await ctx.request.get(BASE + '/__db')).json(); console.log('15 DB: 탭 ' + srv.tabs + ' · 줄 ' + srv.rows + ' · 속도기록 ' + srv.perf + '\n   마지막 DB 부름:', srv.calls.join(' | '));
  // ── 기사앱 (수파베이스 로그인 없이 · 기사 아이디·비밀번호로) ──
  const mk = await api('adm_createDriver', { name: '김시험', loginId: 'kimtest@df', driverType: '고정', phone: '010-9999-1234', schCampId: campId, baseRoute: '212CD' }, 'Start1234');
  console.log('16 기사 계정 만들기', mk.ok, mk.msg || '');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } }); const dp = await ctx2.newPage();
  dp.on('pageerror', (e) => errs.push('기사앱 pageerror: ' + e.message));
  dp.on('console', (m) => { if (m.type() === 'error' && !/favicon|pretendard|ERR_|Failed to load resource|gstatic|Content Security/.test(m.text())) errs.push('기사앱 console: ' + m.text().slice(0, 200)); });
  await dp.goto(BASE + '/runner-sb/');
  await dp.waitForSelector('#lgId', { state: 'visible' });
  const dcall = (fn, ...args) => dp.evaluate(async ([fn, args]) => (await fetch(window.RUNNER_CONFIG.api, { method: 'POST', body: JSON.stringify({ fn, args }) })).json(), [fn, args]);
  const wrong = await dcall('api_login', 'kimtest@df', 'wrong1234', false); console.log('17 기사 틀린 비밀번호:', wrong.msg);
  const lg = await dcall('api_login', 'kimtest@df', 'Start1234', false); console.log('18 기사 로그인', lg.ok, '첫 로그인 비밀번호 바꾸기 =', !!lg.mustChange);
  const ch = await dcall('api_changePassword', lg.token, 'Start1234', 'Newpass5678'); console.log('19 비밀번호 바꾸기', ch.ok, ch.msg || '');
  await dp.fill('#lgId', 'kimtest@df'); await dp.fill('#lgPw', 'Newpass5678'); await dp.click('#lgBtn');
  await dp.waitForFunction(() => { const f = document.getElementById('loginForm'); return f && !f.offsetParent; }, null, { timeout: 15000 });
  await dp.waitForTimeout(1500);
  const tok2 = await dp.evaluate(() => localStorage.getItem('runner.token') || sessionStorage.getItem('runner.token'));
  const ms = await dcall('api_mySchedule', tok2, '2026-11'); console.log('20 화면으로 로그인 → 내 스케줄', ms.ok, ms.msg || '', '· 칸', Object.keys(ms.cells || ms.days || {}).length || (ms.rows || []).length);
  const adm = await dcall('adm_check', tok2); console.log('21 기사 토큰으로 관리자 기능 부르기 →', adm.ok === false ? '막힘: ' + adm.msg : '열림(문제)');
  await dp.screenshot({ path: 'e2e-5.png' });
  await browser.close();
  console.log('errors:', errs.length ? '\n  ' + errs.join('\n  ') : '없음');
})().catch((e) => { console.error('E2E FAIL', e.message.slice(0, 900)); process.exit(1); });
