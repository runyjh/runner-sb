// S78 앱 설치 창: 로그인 뒤 브라우저로 열면 설치 창 · 누르면 '잠시만 기다려 주세요' (설치 창 뜨기 전 · 설치 중) · 설치 상태를 서버에 → 확인 기록에 설치 안 한 기사 (TZ=UTC)
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T02:30:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); ['가','나','다'].forEach(function (n, i) { appendObj_(SH.DRIVERS, { id: 'D' + i, loginId: 'd' + i, name: n + '기사', status: ST.ACTIVE, createdAt: nowText_() }); }); 1");
const tok = fresh().__sbLogin('boss', true).token, T = [0, 1].map((i) => ev("createSession_('D" + i + "', true).token"));
// ── 서버 ──
ok(call('api_appState', [T[0], 'web', '안드로이드 삼성인터넷']).ok && call('api_appState', [T[1], 'app', '안드로이드 크롬']).ok, '1 기사앱 → 서버: 브라우저 / 설치 앱 알림');
ok(!call('api_appState', [T[0], 'hack', '']).ok && !call('api_appState', ['nope', 'web', '']).ok, '2 모르는 상태 · 로그인 안 한 요청은 안 받음');
ok(call('api_appState', [T[0], 'web', '']).same, '3 같은 상태는 6시간에 한 번만 적음');
const r = call('adm_seenList', [tok]);
ok(r.ok && r.appSt && r.appSt.D0.s === 'web' && r.appSt.D1.s === 'app' && !r.appSt.D2, '4 확인 기록 목록에 설치 상태 (가 = 브라우저 · 나 = 앱 · 다 = 기록 없음)');
ok(ev("JSON.stringify(PVW.WRITE.indexOf('api_appState') >= 0)") === 'true', '5 미리 보기 창에서는 적지 않음 (쓰기 함수 목록)');
// ── 기사앱 (휴대폰 흉내) ──
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const code = ix.slice(ix.indexOf('  (function installer() {'), ix.indexOf('  // ───── 공지사항'));
function phone(o) {
  const el = {}, mk = () => { const cl = new Set(['hidden']); return { textContent: '', innerHTML: '', disabled: false, h: {}, classList: { add: (...x) => x.forEach((y) => cl.add(y)), remove: (...x) => x.forEach((y) => cl.delete(y)), toggle: (x, v) => { if (v === undefined ? !cl.has(x) : v) cl.add(x); else cl.delete(x); }, contains: (x) => cl.has(x) }, addEventListener(k, f) { this.h[k] = f; } }; };
  const $ = (q) => (el[q] = el[q] || mk());
  let now = 0; const timers = [];
  const setT = (f, ms) => { timers.push({ at: now + ms, f }); return timers.length; };
  const tick = (ms) => { const end = now + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; timers.shift(); now = t.at; t.f(); } now = end; };
  const setI = (f, ms) => { let on = true; const loop = () => { if (!on) return; f(); setT(loop, ms); }; setT(loop, ms); return { stop: () => { on = false; } }; };
  const winH = {}, ss = Object.assign({}, o.ss || {}), ls = {}, toasts = [], loads = [];
  const win = { RUNNER_CONFIG: {}, addEventListener: (k, f) => { (winH[k] = winH[k] || []).push(f); }, matchMedia: () => ({ matches: !!o.standalone }) };
  const env = { $, window: win, navigator: { userAgent: o.ua, standalone: false }, document: {}, store: { get: () => 't' }, TOKEN: 'TOKEN', PVT: '', setTimeout: setT, setInterval: (f, ms) => setI(f, ms), clearInterval: (h) => h && h.stop && h.stop(), clearTimeout: () => {},
    matchMedia: win.matchMedia, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; }, removeItem: (k) => { delete ls[k]; } }, sessionStorage: { getItem: (k) => ss[k] || null, setItem: (k, v) => { ss[k] = v; } },
    location: o.loc || { href: 'https://x/runner-sb/', search: '' }, loading: (on, t) => loads.push(on ? t : ''), toast: (t) => toasts.push(t) };
  new Function(...Object.keys(env), code)(...Object.values(env));
  const fire = (k, e) => (winH[k] || []).forEach((f) => f(e));
  return { $, tick, fire, win, ss, toasts, loads, loc: env.location };
}
const AND = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/148.0 Mobile Safari/537.36';
// 안드로이드 크롬: 설치 창 신호가 1.5초 늦게 옴
let p = phone({ ua: AND }); p.win.instAuto();
ok(!p.$('#instPop').classList.contains('hidden') && /설치하기/.test(p.$('#instGo').textContent), '6 로그인 뒤 브라우저로 열면 설치 창');
let prompted = 0, choose; const ev1 = { preventDefault() {}, prompt() { prompted++; }, userChoice: new Promise((res) => { choose = res; }) };
p.$('#instGo').h.click();
ok(!p.$('#instWait').classList.contains('hidden') && /준비하는 중.*잠시만 기다려/.test(p.$('#instWaitT').textContent) && p.$('#instGo').disabled, '7 누르자마자 「설치를 준비하는 중입니다… 잠시만 기다려 주세요」 (버튼 잠금 · 반응 없는 것처럼 안 보이게)');
p.tick(1500); p.fire('beforeinstallprompt', ev1); p.tick(600);
ok(prompted === 1 && /설치 창을 여는 중.*잠시만/.test(p.$('#instWaitT').textContent), '8 신호가 오면 바로 휴대폰 설치 창 + 「설치 창을 여는 중입니다… 잠시만 기다려 주세요」');
(async () => {
  choose({ outcome: 'accepted' }); await new Promise((r) => setImmediate(r));
  ok(/설치하고 있습니다.*잠시만/.test(p.$('#instWaitT').textContent), '9 「설치」를 누른 뒤: 「설치하고 있습니다… 잠시만 기다려 주세요 (5~10초)」');
  p.fire('appinstalled');
  ok(/설치가 끝났습니다/.test(p.$('#instWaitT').textContent) && p.$('#instWait').classList.contains('done') && p.$('#instGo').textContent === '확인', '10 설치 완료 → 「설치가 끝났습니다 ✅ 홈 화면의 러너 아이콘으로 열어 주세요」');
  // 설치 창에서 취소
  const q = phone({ ua: AND }); let ch2; q.fire('beforeinstallprompt', { preventDefault() {}, prompt() {}, userChoice: new Promise((r) => { ch2 = r; }) }); q.win.instAuto(); q.$('#instGo').h.click();
  ch2({ outcome: 'dismissed' }); await new Promise((r) => setImmediate(r));
  ok(q.$('#instWait').classList.contains('hidden') && !q.$('#instGo').disabled, '11 설치 창에서 취소하면 기다림 문구 없어지고 다시 누를 수 있음');
  // 삼성인터넷: 신호 안 옴 → 4초 뒤 방법 안내
  const s = phone({ ua: AND.replace('Chrome', 'SamsungBrowser/31.0 Chrome'), loc: { href: 'https://x/runner-sb/?nochrome=1', search: '?nochrome=1' } }); s.win.instAuto(); /* 크롬이 없는 휴대폰 */ s.$('#instGo').h.click(); s.tick(4100);
  ok(!s.$('#instHelp').classList.contains('hidden') && /현재 페이지 추가/.test(s.$('#instSteps').innerHTML) && s.$('#instWait').classList.contains('hidden'), '12 삼성인터넷처럼 설치 창이 없으면 4초 기다렸다가 「현재 페이지 추가 → 홈 화면」 안내');
  // 브라우저로 계속 → 이번에는 다시 안 뜸
  s.$('#instSkip').h.click(); s.$('#instPop').classList.add('hidden'); s.win.instAuto();
  ok(s.$('#instPop').classList.contains('hidden') && s.ss['runner.instSkip'], '13 「브라우저로 계속 쓰기」 → 이번에 연 동안은 다시 안 뜸 (다음에 열면 또 뜸)');
  // 설치 앱으로 열었거나 아이폰(알림 화면이 대신) → 안 뜸
  const a2 = phone({ ua: AND, standalone: true }); ok(!a2.win.instAuto, '14 설치한 앱으로 열면 설치 창 없음');
  const i2 = phone({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1' }); i2.win.instAuto(); ok(i2.$('#instPop').classList.contains('hidden'), '15 아이폰은 알림 화면의 설치 안내가 대신 (겹치지 않음)');
  // 마이페이지 설치 버튼도 같은 기다림 문구 (전체 화면 로딩)
  const m = phone({ ua: AND }); m.$('#instBtn').h.click();
  ok(m.loads.some((t) => /잠시만 기다려/.test(t || '')), '16 마이페이지 「홈 화면에 러너 앱 설치」 버튼도 누르면 「잠시만 기다려 주세요」');
  // (S78b) 안드로이드는 처음부터 크롬으로
  const SAMU = AND.replace('Chrome', 'SamsungBrowser/31.0 Chrome');
  const c1 = phone({ ua: SAMU });
  ok(/^intent:\/\/x\/runner-sb\/#Intent;scheme=https;package=com\.android\.chrome;/.test(c1.loc.href) && /S\.browser_fallback_url=https%3A%2F%2Fx%2Frunner-sb%2F%3Fnochrome%3D1;end$/.test(c1.loc.href), '18 삼성 인터넷으로 열면 바로 크롬으로 다시 열기 (크롬이 없으면 ?nochrome=1 로 돌아옴)');
  const c2 = phone({ ua: SAMU, ss: { 'runner.toChrome': '1' } });
  ok(c2.loc.href === 'https://x/runner-sb/', '19 한 번 넘긴 뒤 다시 삼성 인터넷이면 되풀이하지 않음');
  c2.win.instAuto();
  ok(!c2.$('#instPop').classList.contains('hidden') && c2.$('#instPopT').textContent === '크롬으로 열어 주세요' && c2.$('#instGo').textContent === '크롬으로 열기', '20 휴대폰이 막아서 못 넘어갔으면 로그인 뒤 [크롬으로 열기] 창');
  c2.$('#instGo').h.click();
  ok(/package=com\.android\.chrome/.test(c2.loc.href) && /크롬을 여는 중.*잠시만/.test(c2.$('#instWaitT').textContent), '21 누르면 「크롬을 여는 중입니다… 잠시만 기다려 주세요」 + 크롬으로');
  const c3 = phone({ ua: SAMU, loc: { href: 'https://x/runner-sb/?nochrome=1', search: '?nochrome=1' } }); c3.win.instAuto();
  ok(c3.loc.href === 'https://x/runner-sb/?nochrome=1' && c3.$('#instPopT').textContent !== '크롬으로 열어 주세요', '22 크롬이 없는 휴대폰(?nochrome=1)은 삼성 인터넷 그대로 · 설치 창만');
  const k1 = phone({ ua: AND.replace('Chrome', 'NAVER(inapp; search) Chrome') });
  ok(/package=com\.android\.chrome/.test(k1.loc.href), '23 네이버 앱 안 브라우저 → 크롬으로');
  const ch = phone({ ua: AND }); ok(ch.loc.href === 'https://x/runner-sb/', '24 크롬으로 열면 그대로');
  // 관리자 화면
  const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
  ok(/📲 앱 설치 안 한 기사/.test(ad) && /D\.appSt/.test(ad), '17 관리자 확인 기록에 「📲 앱 설치 안 한 기사」 칸');
})();
