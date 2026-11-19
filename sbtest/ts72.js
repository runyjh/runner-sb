// S72 휴대폰 알림을 켜야 기사앱을 쓸 수 있게: 안 켬 · 거부함 · 아이폰 미설치 화면 (닫기 · 나중에 없음) · 상태를 서버에 알림 → 확인 기록에 꺼진 이유 (TZ=UTC)
//  사용: node sbtest/ts72.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=', SEEN_SCH_RESET: 'x', FK_SEEN_INIT: 'x' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T22:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); ['가','나','다','라'].forEach(function (n, i) { appendObj_(SH.DRIVERS, { id: 'D' + i, loginId: 'd' + i, name: n + '기사', status: ST.ACTIVE, schCamp: '안양1캠프', createdAt: nowText_() }); }); 1");
const tok = fresh().__sbLogin('boss', true).token, T = [0, 1, 2, 3].map((i) => ev("createSession_('D" + i + "', true).token"));
// ── 서버 ──
let r = call('api_pushState', [T[0], 'denied', '안드로이드 크롬']);
ok(r.ok, '1 기사앱 → 서버: 알림 상태 알림 (거부함)');
ok(!call('api_pushState', [T[0], 'hack', '']).ok && !call('api_pushState', ['nope', 'ask', '']).ok, '2 모르는 상태 · 로그인 안 한 요청은 안 받음');
ok(call('api_pushState', [T[0], 'denied', '안드로이드 크롬']).same, '3 같은 상태는 1시간에 한 번만 적음 (속성 쓰기 아낌)');
call('api_pushState', [T[1], 'ios', '아이폰 사파리']); call('api_pushState', [T[2], 'on', '안드로이드 크롬']);
ev("pmPushTokens_ = function (id) { return id === 'D2' ? ['tok'] : []; }; 1");
const off = JSON.parse(ev("pmPushTokens_ = function (id) { return id === 'D2' ? ['tok'] : []; }; JSON.stringify(pushOffMap_(['D0','D1','D2','D3']))"));
ok(off.D0.s === 'denied' && off.D1.s === 'ios' && !off.D2 && off.D3 && off.D3.s === '', '4 알림 못 받는 기사 + 이유: 가 = 거부함 · 나 = 아이폰 미설치 · 다(기기 등록됨) 빠짐 · 라 = 이유 모름 ' + JSON.stringify(off));
r = call('adm_seenList', [tok]);
ok(r.ok && r.pushOff && Object.keys(r.pushOff).length === 4, '5 확인 기록 목록에 알림 못 받는 기사 같이 내려줌 (에뮬레이터엔 등록 기기 없음 → 4명)');
// ── 기사앱 (휴대폰 흉내) ──
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const a = ix.indexOf('  const deviceName = () =>'), b = ix.indexOf('  // 알림을 눌러 앱이 열렸을 때');
const code = ix.slice(a, b);
function phone(o) {
  const el = {}, mk = () => { const cl = new Set(['hidden']); return { textContent: '', classList: { add: (...x) => x.forEach((y) => cl.add(y)), remove: (...x) => x.forEach((y) => cl.delete(y)), toggle: (x, v) => (v === undefined ? (cl.has(x) ? cl.delete(x) : cl.add(x)) : v ? cl.add(x) : cl.delete(x)), contains: (x) => cl.has(x) }, _h: {}, addEventListener(t, f) { this._h[t] = f; } }; };
  const $ = (q) => (el[q] = el[q] || mk());
  const said = [], toasts = [];
  let perm = o.perm;
  const env = {
    $, PVT: false, isIOS: !!o.ios, standalone: () => !!o.installed, pushCapable: () => o.capable !== false, store: { get: (k) => (k === 'TOKEN' ? 't' : '{"loginId":"d0"}') }, TOKEN: 'TOKEN', USER: 'USER',
    lsGet: () => '', lsSet: () => {}, PUSH_AT: 'a', PUSH_TOK: 'b', errAdd: () => {}, toast: (m) => toasts.push(m), loading: () => {},
    getPushCfg: () => Promise.resolve({ on: true }), fbToken: () => Promise.resolve('tok'),
    api: (fn, ...args) => { if (fn === 'api_pushState') said.push(args[1]); return Promise.resolve({ ok: true }); },
    Notification: { get permission() { return perm; }, requestPermission: () => Promise.resolve(perm = o.answer || perm) },
    navigator: { userAgent: o.ios ? 'iPhone Safari' : 'Android Chrome', serviceWorker: { getRegistration: () => Promise.resolve(null) } },
    document: { visibilityState: 'visible', addEventListener: () => {} }, setTimeout: (f) => f(), window: {}, localStorage: { getItem: () => '', setItem: () => {} }, console
  };
  env.window.Notification = env.Notification;
  const f = new Function(...Object.keys(env), code + '\n;return { pushAuto, PG, go: () => $("#pushPopGo")._h.click() };');
  const api = f(...Object.values(env));
  return { api, $, said, toasts, setPerm: (p) => { perm = p; } };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
(async () => {
  let p = phone({ perm: 'default', answer: 'granted' }); p.api.pushAuto(); await tick();
  const gate = p.$('#pushPop');
  ok(!gate.classList.contains('hidden') && gate.classList.contains('gate') && /알림을 켜야 러너 앱을/.test(p.$('#pushPopT').textContent) && p.$('#pushPopLater').classList.contains('hidden') && p.$('#pushPopNo').classList.contains('hidden'), '6 안 켠 휴대폰: 앱을 열면 알림 켜기 화면 · 닫기 · 나중에 없음');
  ok(p.said.indexOf('ask') >= 0, '7 서버에 「안 켬」 알림');
  p.api.go(); await tick(); await tick();
  ok(gate.classList.contains('hidden') && p.said.indexOf('on') >= 0, '8 [알림 켜기] → 「허용」 → 화면 닫히고 앱 사용 · 서버에 「켬」');
  p = phone({ perm: 'default', answer: 'denied' }); p.api.pushAuto(); await tick(); p.api.go(); await tick();
  ok(!p.$('#pushPop').classList.contains('hidden') && /설정에서 알림을 켜/.test(p.$('#pushPopT').textContent) && p.said.indexOf('denied') >= 0, '9 허용 창에서 「거부」 → 설정에서 켜는 방법 화면 (닫히지 않음) · 서버에 「거부함」');
  p = phone({ perm: 'denied' }); p.api.pushAuto(); await tick();
  ok(/설정에서 알림을 켜/.test(p.$('#pushPopT').textContent) && p.$('#pushPopGo').textContent === '켰어요, 다시 확인', '10 전에 거부한 휴대폰: 설정 안내 + [켰어요, 다시 확인]');
  p.api.go(); await tick();
  ok(!p.$('#pushPop').classList.contains('hidden') && /아직 알림이 꺼져/.test(p.toasts.join()), '11 설정에서 안 켜고 누르면 「아직 꺼져 있습니다」 · 화면 그대로');
  p.setPerm('granted'); p.api.go(); await tick(); await tick();
  ok(p.$('#pushPop').classList.contains('hidden') && p.said.indexOf('on') >= 0, '12 설정에서 켜고 누르면 바로 앱으로');
  p = phone({ perm: 'default', ios: true, installed: false }); p.api.pushAuto(); await tick();
  ok(!p.$('#pushPop').classList.contains('hidden') && /홈 화면에 러너 앱을 설치/.test(p.$('#pushPopT').textContent) && p.$('#pushPopGo').classList.contains('hidden') && p.said.indexOf('ios') >= 0, '13 아이폰 · 설치 안 함: 홈 화면 설치 안내 화면 · 서버에 「아이폰 미설치」');
  p = phone({ perm: 'default', capable: false }); p.api.pushAuto(); await tick();
  ok(p.$('#pushPop').classList.contains('hidden') && p.said.indexOf('nosup') >= 0, '14 알림 지원 안 되는 휴대폰: 막지 않음 · 서버에 「지원 안 됨」');
  p = phone({ perm: 'granted' }); p.api.pushAuto(); await tick();
  ok(p.$('#pushPop').classList.contains('hidden'), '15 이미 켠 휴대폰: 화면 안 뜸 (조용히 기기 등록)');
  const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
  ok(/휴대폰 알림 못 받는 기사/.test(ad) && /알림 거부함/.test(ad) && /아이폰 미설치/.test(ad) && /offTag\(x\.id\)/.test(ad), '16 관리자 확인 기록: 알림 못 받는 기사 명단 + 이름 옆 이유 꼬리표');
})();
