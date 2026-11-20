// S101 확인 기록 표시 · 관리: ① 알림을 거부한 기사는 기기가 있어도 「꺼짐」 ② 확인 기록 초기화 뒤 기사앱 '보냄' 표시도 새로
//  ③ 같은 휴대폰 기기 등록이 쌓이지 않게 · 한 번 정리 ④ 「꼭 확인」 · 「참고」 이름 ⑤ 「N명에게 보냄」 · 기기별 마지막 전송
//  ⑥ 지시사항 [확인했습니다]를 챙길 사람 · 메뉴별 기록에 ⑦ 관리자 홈 이름 · 숫자를 확인 기록과 같게 ⑧ 마지막 로그인 · 비밀번호 안 바꿈
//  ⑨ 기사앱 화면 버전 ⑩ 제목이 같은 공지 둘도 따로 셈 (TZ=UTC)
//  사용: node sbtest/ts101.js <runner-allinone 폴더> [화면 그림 저장 경로.png]
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
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
at('2026-11-20T15:00:00');
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D9', loginId: 'boss', name: '유대표', title: '대표', status: ST.ACTIVE, schCamp: '운영자', createdAt: nowText_() }); schSheet_(); " +
  ['A', 'B', 'C'].map((x) => "appendObj_(SH.DRIVERS, { id: '" + x + "', name: '기사" + x + "', status: ST.ACTIVE, createdAt: nowText_() });").join(' ') + " 1");
const tok = fresh().__sbLogin('boss', true).token;
const TA = ev("createSession_('A', true).token"), TB = ev("createSession_('B', true).token");
const rows = (sh) => JSON.parse(ev("JSON.stringify(readAll_(SH." + sh + "))"));

// ① 알림 거부 (기기는 있음)
ev("appendObj_(SH.PPUSH, { driverId: 'A', token: 'tokA1', device: '안드로이드 크롬', createdAt: '2026-11-19 10:00:00' }); appendObj_(SH.PPUSH, { driverId: 'B', token: 'tokB1', device: '안드로이드 삼성인터넷', createdAt: '2026-11-19 10:00:00' }); 1");
call('api_pushState', [TA, 'denied', '안드로이드 크롬']);
let PO = JSON.parse(ev("JSON.stringify(pushOffMap_(['A', 'B', 'C']))"));
ok(PO.A && PO.A.s === 'denied' && PO.A.has === 1 && !PO.B && PO.C && PO.C.has === 0, '1 기기 등록 뒤 알림을 거부한 기사(A)는 「꺼짐」 · 기기 있는 B 는 켜짐 · 기기 없는 C 는 꺼짐 ' + JSON.stringify(PO));
at('2026-11-20T17:00:00'); call('api_pushState', [TA, 'on', '안드로이드 크롬']);
PO = JSON.parse(ev("JSON.stringify(pushOffMap_(['A']))"));
ok(!PO.A, '2 다시 켜면 켜짐');

// ③ 같은 기사 · 같은 기기 이름은 최근 등록만 · 다른 기기는 그대로
call('api_pmPushSave', [TA, 'tokA2_' + 'x'.repeat(20), '안드로이드 크롬']);
call('api_pmPushSave', [TA, 'tokA3_' + 'x'.repeat(20), '안드로이드 크롬']);
call('api_pmPushSave', [TA, 'tokA4_' + 'x'.repeat(20), 'PC 크롬']);
call('api_pmPushSave', [TA, 'tokA5_' + 'x'.repeat(20), 'PC 크롬']);
let P = rows('PPUSH').filter((o) => o.driverId === 'A').map((o) => o.token.slice(0, 5)).sort();
ok(P.join() === 'tokA3,tokA4,tokA5', '3 한 휴대폰에서 여러 번 등록해도 하나만 남음 · PC 는 여러 대일 수 있어 그대로 (' + P.join() + ')');
ev("appendObj_(SH.PPUSH, { driverId: 'B', token: 'tokB2', device: '안드로이드 삼성인터넷', createdAt: '2026-11-19 10:01:00' }); appendObj_(SH.PPUSH, { driverId: 'B', token: 'tokB3', device: '안드로이드 삼성인터넷', createdAt: '2026-11-19 10:02:00' }); 1");
call('adm_seenList', [tok]);
P = rows('PPUSH').filter((o) => o.driverId === 'B').map((o) => o.token);
ok(P.join() === 'tokB3' && /· 2$/.test(S.props.PUSH_DEDUP_S101 || ''), '4 한 번 정리: 예전에 쌓인 것도 최근 것만 (확인 기록 화면을 열 때 · ' + S.props.PUSH_DEDUP_S101 + ')');
call('adm_seenList', [tok]);
ok(rows('PPUSH').length === 4, '4b 두 번째 열 때는 다시 안 함');

// ⑤ 받은 기사 수 (기기가 여러 대여도 한 명) · 기기별 마지막 전송
ev("appendObj_(SH.PPUSH, { driverId: 'C', token: 'tokC1', device: 'PC 크롬', createdAt: '2026-11-19 10:00:00' }); appendObj_(SH.PPUSH, { driverId: 'C', token: 'tokC2', device: 'PC 크롬', createdAt: '2026-11-19 11:00:00' }); 1");
delete S.props.PUSH_DEDUP_S101; call('adm_seenList', [tok]);
ok(rows('PPUSH').filter((o) => o.driverId === 'C').length === 2, '4c 한 번 정리에서도 PC 는 그대로 (사무실 · 집 PC)');
ev("var r = readAll_(SH.PPUSH).filter(function (o) { return o.driverId === 'C'; }).map(function (o) { return o._row; }).sort(function (a, b) { return b - a; }); delRows_(sheet_(SH.PPUSH), r); 1");
const sent = JSON.parse(ev("pmPushCfg_ = function () { return { sa: { project_id: 'p' }, web: { projectId: 'p' } }; }; pmFcmToken_ = function () { return 'at'; }; UrlFetchApp = { fetchAll: function (rq) { return rq.map(function () { return { getResponseCode: function () { return 200; }, getContentText: function () { return ''; } }; }); } }; " +
  "var n = pmPushSend_([{ driverId: 'A', title: 't', text: 'x', jobId: '', kind: 'seen' }, { driverId: 'B', title: 't', text: 'x', jobId: '', kind: 'seen' }]); JSON.stringify({ n: n, people: pmPushPeople_() })"));
const lastOk = rows('PPUSH').filter((o) => o.lastOk).length;
ok(sent.n === 4 && sent.people === 2 && lastOk === 4, '5 기기 4대 · 받은 기사 2명 · 기기마다 마지막 전송 시각 남김 ' + JSON.stringify(sent) + ' · ' + lastOk);

// ④ 「꼭 확인」 이름 (작업 기록 · 메뉴 이름)
ev("appendObj_(SH.SEEN, { kind: 'sch', driverId: 'A', name: '기사A', key: '2026-11-21', old: '출근', text: '휴무', at: '2026-11-20 10:00:00', ackAt: '' }); 1");
const rm = call('adm_seenRemind', [tok, { kind: 'menu', key: 'need' }]);
const lg = rows('ALOG').filter((o) => /확인 다시 알림/.test(o.action || o.job || '') || /확인 다시 알림/.test(JSON.stringify(o))).pop() || {};
ok(rm.ok && rm.target === 1 && /꼭 확인/.test(JSON.stringify(lg)) && !/· 전체/.test(JSON.stringify(lg)), '6 「꼭 확인」 알림은 작업 기록에 「꼭 확인」으로 (예전엔 「전체」) ' + JSON.stringify(lg).slice(0, 160));
ok(rm.people != null, '6b 결과에 받은 기사 수 (people)');

// ⑦ 관리자 홈: 이름 · 정리한 것 빼기 · 알림 거부
ev("appendObj_(SH.SEEN, { kind: 'sch', driverId: 'B', name: '', key: '2026-11-21', old: '출근', text: '휴무', at: '2026-11-20 10:00:00', ackAt: '' }); 1");
let H = call('adm_home', [tok, true]);
const td = (k) => ((H.todo || []).filter((x) => x.k === k)[0] || {});
ok(td('unseen').n === 2 && /기사A/.test(JSON.stringify(td('unseen'))) && /기사B/.test(JSON.stringify(td('unseen'))), '7 관리자 홈 「스케줄 변경 미확인 기사」 이름이 나옴 (기록에 이름이 비어 있어도) ' + JSON.stringify(td('unseen')).slice(0, 120));
call('adm_seenClear', [tok, 'need']);
H = call('adm_home', [tok, true]);
ok(!td('unseen').n, '8 확인 기록에서 「정리」한 것은 관리자 홈에서도 빠짐');
call('api_pushState', [TB, 'denied', '안드로이드 삼성인터넷']);
H = call('adm_home', [tok, true]);
ok(/기사B/.test(JSON.stringify(td('nopush'))) && /기사C/.test(JSON.stringify(td('nopush'))) && !/기사A/.test(JSON.stringify(td('nopush'))), '9 「휴대폰 알림 못 받는 기사」: 거부한 B · 기기 없는 C (확인 기록과 같은 판정) ' + JSON.stringify(td('nopush')).slice(0, 120));

// ② 초기화 뒤 기사앱 '보냄' 표시도 새로
let r0 = call('api_seen', [TA, [{ k: 'open', key: '' }]]);
const rs = call('adm_seenReset', [tok, '초기화']);
let r1 = call('api_seen', [TA, []]);
ok(rs.ok && !r0.ep && r1.ep && r1.ep !== r0.ep, '10 초기화하면 표시(ep)가 바뀜 → 기사앱이 보냄 표시를 비우고 본 것을 다시 보냄');
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/seenEp/.test(ix) && /ntPut\(dk, \[\]\); store\.del\(dk\.replace\('seenDone', 'seenSync2'\)\)/.test(ix), '10b 기사앱: 표시가 바뀌면 보냄 표시 비우고 다시 맞춤');
ok(/if \(pushBusy\) return; \/\/ \(S101\)/.test(ix), '10c [알림 허용] 여러 번 눌러도 등록은 한 번');

// ⑥ 지시사항: 내일 지시 → 꼭 확인 · 누르면 빠짐 · 내용이 바뀌면 다시
const hash = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; };
const addInst = (reason) => call('adm_schIssueSave', [tok, { driverId: 'A', date: '2026-11-21', end: '2026-11-21', kind: '지시', reason: reason }]);
const ia = addInst('헬멧 꼭 쓰기');
let I = JSON.parse(ev("JSON.stringify(seenItems_())"));
const inst = (I.A ? I.A.items : []).filter((y) => y.m === 'inst');
ok(ia.ok !== false && inst.length === 1 && inst[0].g === 'need' && inst[0].t === '지시사항 11/21' && /헬멧/.test(inst[0].d), '11 내일 지시사항을 안 누른 기사 → 꼭 확인 ' + JSON.stringify(inst));
call('api_seen', [TA, [{ k: 'inst', key: '2026-11-21|' + hash('헬멧 꼭 쓰기') }]]);
I = JSON.parse(ev("JSON.stringify(seenItems_())"));
ok(!(I.A && I.A.items.some((y) => y.m === 'inst')), '12 기사가 누르면 빠짐');
call('adm_schIssueSave', [tok, Object.assign({}, ia.issue, { id: ia.issue.id, driverId: 'A', date: '2026-11-21', end: '2026-11-21', kind: '지시', reason: '헬멧 꼭 쓰기 · 7시까지' })]);
I = JSON.parse(ev("JSON.stringify(seenItems_())"));
ok(I.A && I.A.items.some((y) => y.m === 'inst' && /7시/.test(y.d)), '13 지시 내용이 바뀌면 다시 꼭 확인');
call('api_seen', [TA, [{ k: 'inst', key: '2026-11-21|' + hash('헬멧 꼭 쓰기 · 7시까지') }]]);
ok(rows('SEEN').filter((o) => o.kind === 'inst' && o.driverId === 'A').length === 2, '14 바뀐 뒤 다시 누른 것도 기록 (예전에는 날짜만이라 두 번째가 안 남았음)');
ok(/el\.dataset\.d \+ '\|' \+ String\(k \|\| ''\)\.split\('\|'\)\.pop\(\)/.test(ix), '14b 기사앱: 지시사항 확인을 날짜|글 지문으로 보냄');

// ⑧ 마지막 로그인 · 비밀번호 안 바꿈
ev("var r = findRow_(SH.DRIVERS, 'id', 'C'); writeFields_(SH.DRIVERS, r, { pwMustChange: 'Y' }); loginMark_('A'); 1");
let L = call('adm_seenList', [tok]);
const dC = L.drivers.find((d) => d.id === 'C'), dA = L.drivers.find((d) => d.id === 'A');
ok(dC.mc === 1 && !dC.lg && dA.lg > 0 && !dA.mc, '15 화면에 비밀번호 안 바꿈(mc) · 마지막 로그인(lg)을 내려 줌');
ok(L.items.C && L.items.C.items.some((y) => y.g === 'app' && y.t === '비밀번호 안 바꿈'), '16 챙길 사람 「앱 안 쓰는 기사」에 이유: 비밀번호 안 바꿈');
ok(/loginMark_\(o\.id\)/.test(fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8')), '17 로그인할 때 마지막 로그인 시각을 남김');

// ⑨ 기사앱 화면 버전
call('api_appState', [TA, 'app', '안드로이드 크롬', 'sb-old1']);
let s1 = call('api_appState', [TA, 'app', '안드로이드 크롬', 'sb-old1']), s2 = call('api_appState', [TA, 'app', '안드로이드 크롬', 'sb-new2']);
ok(s1.same && !s2.same && JSON.parse(S.props.APP_STATE).A.ver === 'sb-new2', '18 같은 버전은 6시간에 한 번 · 버전이 바뀌면 바로 남김');
ok(/api\('api_appState', tk, st, deviceName\(\), String\(\(window\.RUNNER_CONFIG && window\.RUNNER_CONFIG\.ver\)/.test(ix), '18b 기사앱: 화면 버전을 같이 보냄 · 6시간마다 다시');

// ⑩ 제목이 같은 공지 둘
ev("appendObj_(SH.NOTICE, { id: 'N1', title: '안전 교육', body: 'x', status: NST.ON, start: '2026-11-19', createdAt: '2026-11-19 10:00:00' }); appendObj_(SH.NOTICE, { id: 'N2', title: '안전 교육', body: 'y', status: NST.ON, start: '2026-11-20', createdAt: '2026-11-20 10:00:00' }); cache_().remove('nt:all'); 1"); // 시험에서 시트에 바로 넣었으므로 공지 목록 임시 기억을 비움 (실제 저장은 저절로 비움)
I = JSON.parse(ev("JSON.stringify(seenItems_())"));
const nt = (I.B ? I.B.items : []).filter((y) => y.m === 'notice')[0] || {};
ok(nt.t === '공지 2' && nt.d === '안전 교육 · 안전 교육', '19 제목이 같은 공지 둘도 2건으로 셈 (' + nt.t + ')');

// ── 화면 (브라우저): 지시사항 메뉴 · 비밀번호 안 바꿈 카드 · 예전 화면 표시 · 꼭 확인 묶음 이름
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const css = ad.slice(ad.indexOf('  .al-sum {'), ad.indexOf('  /* (S85) 입금확인 선택 합계'));
const code = ad.slice(ad.indexOf("  const AL = { d: null, tab: 'todo'"), ad.indexOf("  $('#alTabs').addEventListener('click'"));
const click = ad.slice(ad.indexOf("  $('#alBody').addEventListener('click', (e) => {\n    if (e.target.id === 'alPvBtn')"), ad.indexOf("    const n = e.target.closest('[data-alnudge]');"));
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.setContent('<style>:root{--line:#e5e8ee;--sub:#6b7280;--brand:#1b64da}body{font-family:sans-serif;background:#f3f5f8;margin:0;padding:18px;font-size:14px}.btn{border:1px solid #cfd6e2;background:#fff;border-radius:8px;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer}.btn.ghost{background:#f6f8fb}.empty{background:#fff;border-radius:14px;padding:28px;text-align:center;color:#6b7280}.sub{color:#6b7280}' + css + '</style><div id="view-applog"><span id="alCount"></span><div id="alTabs" class="al-tabs"></div><div id="alBody"></div></div>');
  const D = { ok: true, today: '2026-11-20', drivers: [{ id: 'D0', name: '강준길', camp: '군포1', title: '' }, { id: 'D1', name: '고광필', camp: '안양1', title: '', mc: 1 }, { id: 'D2', name: '김기화', camp: '군포1', title: '', mc: 1, lg: Date.now() - 3600000 }, { id: 'D3', name: '박성훈', camp: '군포1', title: '' }],
    notices: [], rows: [{ k: 'inst', d: 'D3', key: '2026-11-20|123', at: '2026-11-19 19:00:00' }, { k: 'sch', d: 'D0', key: '2026-11-24', old: '출근', text: '휴무', at: '2026-11-20 10:00:00', ack: '', skip: 1 }],
    act: {}, now: Date.now(), nowMs: 300000, remind: {}, pushOff: {}, appSt: { D0: { s: 'app', at: Date.now() - 60000, dev: '안드로이드 크롬', app: { at: Date.now() - 60000, dev: '안드로이드 크롬' }, ver: 'sb-old' }, D3: { s: 'app', at: Date.now() - 60000, dev: '안드로이드 삼성인터넷', app: { at: Date.now() - 60000, dev: 'x' }, ver: 'sb-cur' } },
    items: { D0: { name: '강준길', camp: '군포1', items: [{ m: 'inst', t: '지시사항 11/21', d: '헬멧 꼭 쓰기', g: 'need', j: 'SC-CHK' }] } }, menus: [], clr: null, clrMenus: [], rule: { noticeDays: 7, autoMax: 3, callDays: 3, autoHour: 18 } };
  await page.evaluate(({ code, click, D }) => {
    window.calls = []; window.RUNNER_CONFIG = { ver: 'sb-cur' };
    const env = { $: (s) => document.querySelector(s), $$: (s) => Array.from(document.querySelectorAll(s)), esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), koSort: (a, b) => String(a).localeCompare(String(b), 'ko'),
      api: (fn, a) => { window.calls.push([fn, a]); return Promise.resolve(fn === 'adm_seenList' ? D : { ok: true, target: 2, people: 1, pushed: 3, off: [] }); }, toast: (m) => { window.lastToast = m; }, pvOpen: () => {}, confirm: (m) => { window.lastConfirm = m; return true; } };
    new Function(...Object.keys(env), code + '\nAL.d = ' + JSON.stringify(D) + '; AL.at = Date.now(); window.AL = AL; window.alRender = alRender; alRender();\n' + click + '\n  });')(...Object.values(env));
  }, { code, click, D });
  ok(/스케줄 변경 · 지시사항 · 허위배송 · 서류/.test(await page.locator('.tdx-c.need').innerText()) && /지시사항 11\/21/.test(await page.locator('.tdx-list').innerText()), '20 챙길 사람 「꼭 확인」에 지시사항');
  await page.click('[data-alrem="menu"][data-alkey="need"]'); await page.waitForTimeout(50);
  ok(/「꼭 확인」이 남은 기사/.test(await page.evaluate(() => window.lastConfirm)) && /2명 중 1명에게 보냈습니다/.test(await page.evaluate(() => window.lastToast)), '21 확인 창에 「꼭 확인」 (예전엔 need) · 결과는 「N명 중 M명에게 보냈습니다」 → ' + (await page.evaluate(() => window.lastToast)));
  await page.evaluate(() => { window.AL.tab = 'log'; window.AL.sub = 'inst'; window.alRender(); });
  const it = (await page.locator('#alBody').innerText()).replace(/\s+/g, ' ');
  ok(await page.locator('[data-alsub="inst"]').count() === 1 && /내일 지시사항 안 누른 사람 1명/.test(it) && /강준길/.test(it) && /11\/20 · 박성훈/.test(it), '22 메뉴별 기록 › 지시사항: 안 누른 사람 · 누른 기록');
  await page.evaluate(() => { window.AL.sub = 'sch'; window.AL.only = false; window.alRender(); });
  ok(/아직 안 보냄 그 주 일요일부터 기사앱에 뜸/.test((await page.locator('#alBody').innerText()).replace(/\s+/g, ' ')), '23 다음 주 변경: 「아직 안 보냄 · 그 주 일요일부터」');
  await page.evaluate(() => { window.AL.tab = 'app'; window.alRender(); });
  const n2 = async (k) => Number((await page.locator('.tdx-c.aps-' + k + ' b').innerText()).replace(/\D/g, ''));
  const rowOf = async (nm) => (await page.locator('.aps-row', { hasText: nm }).innerText()).replace(/\s+/g, ' ');
  ok(await n2('pw') === 2 && await n2('app') === 2 && /로그인 기록 없음/.test(await rowOf('고광필')) && /로그인 · 변경 안 함/.test(await rowOf('김기화')), '24 기사앱 상태: 「비밀번호 안 바꿈」 2명 (로그인 기록 없음 · 들어왔지만 변경 안 함)');
  ok(/예전 화면/.test(await rowOf('강준길')) && /최신 화면/.test(await rowOf('박성훈')), '25 기기 칸에 「예전 화면」 · 「최신 화면」');
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; }).finally(() => browser && browser.close());
