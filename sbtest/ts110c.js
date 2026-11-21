// 알림 진단 시험 C (고치기 전 상태 확인용): 빌드한 기사앱을 실제 브라우저로 열어 알림 · 팝업 동작 확인 + 서비스 워커(sw.js) 흉내
//  사용: node sbtest/ts110c.js <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path'), http = require('http');
const OUT = process.argv[2] || path.join(__dirname, '..');
const R = [];
const rep = (good, id, m) => { R.push([good, id, m]); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const PORT = 8775;
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(OUT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.json') ? 'application/json' : 'application/javascript' }); fs.createReadStream(f).pipe(s); }).listen(PORT);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
async function phone(b, o) {
  const CALLS = [];
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Mobile Safari/537.36', viewport: { width: 412, height: 900 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('sbt:runner.token', 'TOK_A'); localStorage.setItem('sbt:runner.user', JSON.stringify({ id: 'D1', name: '기사A', loginId: 'a' })); sessionStorage.setItem('runner.instSkip', '1'); } catch (e) {} });
  if (o.granted !== false) await ctx.addInitScript(() => { try { Object.defineProperty(Notification, 'permission', { get: () => 'granted' }); } catch (e) {} });
  await ctx.route('**/*', (rt) => { const u = rt.request().url();
    if (/version\.json/.test(u) && o.newVer) return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ver: 'sb-NEW' }) });
    if (u.startsWith('http://localhost:' + PORT)) return rt.continue();
    if (/functions\/v1\/api/.test(u)) { let bd = {}; try { bd = JSON.parse(rt.request().postData() || '{}'); } catch (e) {} CALLS.push({ fn: bd.fn, args: bd.args }); let out = { ok: true };
      if (bd.fn === 'api_checkSession') out = { ok: true, user: { id: 'D1', name: '기사A', loginId: 'a' }, slipClose: '', menuOff: [] };
      if (bd.fn === 'api_notices') out = { ok: true, today: '2026-11-21', notices: o.notices || [], seenIds: [] };
      if (bd.fn === 'api_mySchedule') out = { ok: true, today: '2026-11-21', month: '2026-11', cells: { '2026-11-22': '군포1 212A' }, inst: o.inst || {}, instSeen: [] };
      if (bd.fn === 'api_pmAlerts') out = { ok: true, ver: 'v1', alerts: o.alerts || [], unread: (o.alerts || []).filter((a) => !a.readAt).length };
      if (bd.fn === 'api_pmJob') out = { ok: true, job: { id: 'J1', date: '2026-11-24', camp: '군포1캠프', route: '212A', status: '모집 중', kind: '주간', poster: '기사P' }, apps: [], mine: null };
      if (bd.fn === 'api_pmForm') out = { ok: true, camps: [{ id: 'C1', name: '군포1캠프' }], pays: ['계좌이체'], kinds: ['주간'] };
      if (bd.fn === 'api_pmPushConfig') out = { ok: true, on: true, web: { apiKey: 'k', projectId: 'p', messagingSenderId: '1', appId: 'a' }, vapidKey: 'v' };
      return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ out }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:' + PORT + '/' + (o.q || ''), { waitUntil: 'commit' }); await pg.waitForTimeout(o.wait || 4500);
  return { ctx, pg, CALLS };
}
const shown = (pg) => pg.evaluate(() => [...document.querySelectorAll('.ihelp, #pushPop, #dirPop')].filter((e) => !e.classList.contains('hidden') && e.getBoundingClientRect().height > 0).map((e) => (e.id || '?') + ':' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40)));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  try {
    // 1) 내일 지시사항 팝업 (#1 · #21)
    let P = await phone(b, { inst: { '2026-11-22': '반품 3건 회수해 주세요' } });
    await P.pg.addStyleTag({ content: '#pushPop { display: none !important; }' });
    let S0 = (await shown(P.pg)).filter((t) => !/^pushPop/.test(t));
    if (S0.some((t) => /^instPop/.test(t))) { await P.pg.click('#instSkip').catch(() => {}); await P.pg.waitForTimeout(3500); } // 설치 창이 먼저 뜨면 [브라우저로 계속 쓰기] → 그 뒤 지시사항
    let S1 = (await shown(P.pg)).filter((t) => !/^pushPop/.test(t));
    console.log('   처음 뜬 창 ' + JSON.stringify(S0.map((t) => t.slice(0, 12))) + ' → 닫은 뒤 ' + JSON.stringify(S1.map((t) => t.slice(0, 20))));
    const nInst = await P.pg.evaluate(() => document.querySelectorAll('#instPop').length);
    const instSeen = S1.some((t) => /^dirPop.*반품 3건/.test(t));
    rep(nInst === 1 && instSeen, '#1', '내일 지시사항이 있는 날 앱을 엶: 이름이 같은 창 ' + nInst + '개 · 화면에 뜬 창 ' + JSON.stringify(S1) + (instSeen ? '' : ' → 지시사항 글이 안 보임'));
    await P.ctx.close();
    P = await phone(b, { q: '?pm=SC-CHK', wait: 7000, inst: { '2026-11-22': '반품 3건 회수해 주세요' } });
    await P.pg.addStyleTag({ content: '#pushPop { display: none !important; }' });
    const w2 = await P.pg.evaluate(() => ['#instPop', '#dirPop'].map((q) => { const e = document.querySelector(q); return e ? (e.classList.contains('hidden') ? '닫힘' : '열림') + ' 「' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 60) + '」' : '없음'; }));
    rep(/^열림/.test(w2[1] || '') && /^닫힘/.test(w2[0]) && /반품 3건/.test(w2[1]), '#1b', '「확인할 것」 휴대폰 알림을 눌러 들어옴 → 지시사항 창 대신 뜬 창: 설치 창 ' + w2[0] + ' · 지시사항 창 ' + w2[1]);
    await P.ctx.close();
    // 2) 중요 공지 팝업 → 휴대폰 뒤로가기 (#53)
    P = await phone(b, { notices: [{ id: 'N1', title: '중요 공지 시험', body: '꼭 읽어 주세요', important: true, start: '2026-11-21', createdAt: '2026-11-21 09:00:00' }] });
    S1 = await shown(P.pg);
    const ntUp = S1.some((t) => /^ntPop/.test(t));
    const c0 = P.CALLS.length;
    await P.pg.goBack().catch(() => {}); await P.pg.waitForTimeout(2500);
    const acked = P.CALLS.slice(c0).filter((c) => c.fn === 'api_seen').map((c) => JSON.stringify(c.args && c.args[1])).join(' ');
    const ntStill = (await shown(P.pg)).some((t) => /^ntPop/.test(t));
    rep(!(ntUp && /notice|N1/.test(acked)), '#53', '중요 공지 창' + (ntUp ? '이 뜸' : ' 안 뜸') + ' → 휴대폰 뒤로가기: 창 ' + (ntStill ? '그대로' : '닫힘') + ' · 「확인함」 기록 ' + (/notice|N1/.test(acked) ? '보냄 (안 읽고 뒤로만 눌러도 읽음 처리)' : '안 보냄'));
    await P.ctx.close();
    // 3) 알림 켜기 창 → 뒤로가기 (#54)
    P = await phone(b, { granted: false });
    await P.pg.evaluate(() => { try { if (typeof pushGate === 'function') pushGate('ask'); } catch (e) {} });
    S1 = await shown(P.pg);
    const gUp = S1.some((t) => /^pushPop/.test(t));
    await P.pg.goBack().catch(() => {}); await P.pg.waitForTimeout(1200);
    const gStill = (await shown(P.pg)).some((t) => /^pushPop/.test(t));
    rep(!gUp || gStill, '#54', '「알림을 켜 주세요」 창' + (gUp ? '이 뜸' : ' 안 뜸 (이 브라우저는 시험 못 함)') + ' → 뒤로가기: ' + (gUp ? (gStill ? '그대로 (정상)' : '닫힘 → 알림 안 켠 채 앱을 씀') : ''));
    await P.ctx.close();
    // 4) 휴대폰 알림을 눌러 일감으로 들어옴 (?pm=J1) → 알림함 읽음 (#49)
    P = await phone(b, { q: '?pm=J1', alerts: [{ id: 'N9', jobId: 'J1', kind: 'newjob', text: '📢 새 품앗이 일감 · 11/24 군포1 212A', createdAt: '2026-11-21 09:00:00', readAt: '' }], wait: 6000 });
    const read = P.CALLS.filter((c) => c.fn === 'api_pmAlertsRead');
    const onDetail = await P.pg.evaluate(() => { const v = document.getElementById('v-pmdetail'); return !!(v && v.classList.contains('on')); });
    rep(read.length > 0 && JSON.stringify(read[0].args).indexOf('job:J1') >= 0, '#49', '휴대폰 알림을 눌러 일감 화면으로: 일감 화면 ' + (onDetail ? '열림' : '안 열림') + ' · 그 알림 읽음 처리 ' + (read.length ? '함' : '안 함 (알림함 빨간 숫자 · 확인 기록에 「안 읽음」으로 남음)'));
    await P.ctx.close();
    // 5) 일감 올리기 쓰다가 앱을 내렸다 30초 뒤 돌아옴 + 그 사이 새 버전 (#64)
    P = await phone(b, { newVer: true });
    await P.pg.evaluate(() => { try { openPmForm('', 'pumasi'); } catch (e) {} }); await P.pg.waitForTimeout(1500);
    await P.pg.evaluate(() => { const t = document.getElementById('pfDesc'); if (t) { t.value = '쓰던 상세 설명 (긴 글)'; t.dispatchEvent(new Event('input', { bubbles: true })); t.blur(); } });
    const urlA = P.pg.url();
    await P.pg.evaluate(() => {
      const set = (v) => { Object.defineProperty(document, 'visibilityState', { get: () => v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
      set('hidden'); const n0 = Date.now; Date.now = () => n0() + 45000; set('visible');
    });
    await P.pg.waitForTimeout(3500);
    const urlB = P.pg.url(), kept = await P.pg.evaluate(() => { const t = document.getElementById('pfDesc'); return t ? t.value : ''; }).catch(() => '');
    rep(urlA === urlB && /쓰던/.test(kept), '#64', '일감 올리기 쓰다가 잠깐 나갔다 옴(그 사이 새 버전): 화면 ' + (urlA === urlB ? '그대로' : '저절로 새로 열림 (' + urlB.replace(/^.*\//, '') + ')') + ' · 쓰던 글 ' + (/쓰던/.test(kept) ? '남음' : '사라짐'));
    await P.ctx.close();
  } finally { await b.close(); srv.close(); }
  // 6) 서비스 워커 흉내: 앱을 보고 있을 때 온 알림 · 같은 일감 알림 두 개 · 알림 누름
  const code = fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8');
  const sim = (front) => { const H = {}, NOTI = [], MSG = [];
    const client = { visibilityState: front ? 'visible' : 'hidden', focused: !!front, url: 'https://runyjh.github.io/runner-sb/index.html', postMessage: (m) => MSG.push(m), focus: async () => {} };
    const self = { addEventListener: (k, f) => { H[k] = f; }, skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => [client], openWindow: async (u) => { MSG.push({ open: u }); } }, registration: { scope: 'https://runyjh.github.io/runner-sb/', showNotification: async (t, o) => NOTI.push({ t, tag: o.tag }), getNotifications: async () => NOTI }, navigator: {} };
    new Function('self', 'fetch', 'Response', code)(self, () => {}, function () {});
    const push = async (d) => { let w; H.push({ data: { json: () => ({ data: d }) }, waitUntil: (p) => { w = p; } }); await w; };
    return { H, NOTI, MSG, push };
  };
  let W = sim(true);
  await W.push({ title: '✅ 배차 확정', body: 'x', jobId: 'J1', kind: 'accept' });
  rep(W.NOTI.length === 0, '#29', '안드로이드 · 앱을 보고 있을 때 온 알림: 알림 창 ' + W.NOTI.length + '개 (앱 안 띠로 보여 줌 · 정상)');
  W = sim(false);
  await W.push({ title: '🙋 새 지원', body: 'B 지원', jobId: 'J1', kind: 'apply' });
  await W.push({ title: '🙋 새 지원', body: 'C 지원', jobId: 'J1', kind: 'apply' });
  await W.push({ title: '⚠️ 확정 기사 취소', body: 'B 취소', jobId: 'J1', kind: 'cancelOk' });
  const tags = W.NOTI.map((n) => n.tag), uniq = new Set(tags).size;
  rep(uniq === tags.length, '#7', '같은 일감 알림 3개 (지원 2 · 확정 기사 취소): 알림 창에 남는 것 ' + uniq + '개 (같은 이름표 ' + tags[0] + ' → 앞 것이 덮여 「B 지원」「C 지원」은 안 보임)');
  W = sim(false);
  await W.push({ title: '🔔 확인할 것이 1건', body: 'x', jobId: 'SC-CHK', kind: 'seen' });
  let w; W.H.notificationclick({ notification: { close() {}, data: { jobId: 'SC-CHK' } }, waitUntil: (p) => { w = p; } }); await w;
  rep(W.MSG.some((m) => m.type === 'pm-open' && m.jobId === 'SC-CHK'), '#49b', '알림을 누르면 앱에 넘겨주는 것: ' + JSON.stringify(W.MSG.filter((m) => m.type === 'pm-open')[0] || {}) + ' (앱이 그 일감의 알림을 읽음 처리)');
  // 아이폰: 앱을 보고 있어도 알림 창
  const simIos = () => { const H = {}, NOTI = []; const client = { visibilityState: 'visible', focused: true, url: 'https://runyjh.github.io/runner-sb/index.html', postMessage: () => {}, focus: async () => {} };
    const self = { addEventListener: (k, f) => { H[k] = f; }, skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => [client] }, registration: { scope: 'https://runyjh.github.io/runner-sb/', showNotification: async (t, o) => NOTI.push({ t, tag: o.tag }), getNotifications: async () => NOTI }, navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' } };
    new Function('self', 'fetch', 'Response', code)(self, () => {}, function () {}); return { H, NOTI }; };
  const I = simIos(); let wi; I.H.push({ data: { json: () => ({ data: { title: 'x', body: 'y', jobId: 'J1', kind: 'accept' } }) }, waitUntil: (p) => { wi = p; } }); await wi;
  rep(I.NOTI.length === 1, '#29i', '아이폰 · 앱을 보고 있을 때 온 알림: 알림 창 ' + I.NOTI.length + '개');
  console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
})();
