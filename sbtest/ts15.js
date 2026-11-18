// S21 관리자 앱 설치 버튼 (기사앱처럼): 로그인 화면 큰 버튼 · 휴대폰 화면 맨 위 큰 버튼(✕ 7일 숨김) · 메뉴 안 작은 버튼
//  사용: node sbtest/ts15.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
ok(/id="aInstL"[^>]*>[\s\S]{0,80}홈 화면에 관리자 앱 설치/.test(H) && H.indexOf('id="aInstL"') < H.indexOf('</form>', H.indexOf('id="loginForm"')), '1 로그인 화면에 큰 설치 버튼');
ok(/id="aInstM"/.test(H) && /html\.m \.ainst-m:not\(\.hidden\)/.test(H), '2 휴대폰 화면 맨 위 큰 설치 버튼 (휴대폰에서만)');
const i0 = H.indexOf('(function adminInstaller() {'), i1 = H.indexOf('})();', i0) + 5;
const code = H.slice(i0, i1);
function run(ua, store) {
  const els = {}, ev = {};
  const el = (id) => els[id] || (els[id] = { id, cls: new Set(['hidden']), on: {}, innerHTML: '', classList: { add: (c) => els[id].cls.add(c), remove: (c) => els[id].cls.delete(c), contains: (c) => els[id].cls.has(c) }, addEventListener: (t, f) => { els[id].on[t] = f; } });
  const $ = (q) => el(q.replace('#', ''));
  const timers = [];
  const win = { RUNNER_CONFIG: {}, matchMedia: () => ({ matches: false }), addEventListener: (t, f) => { ev[t] = f; } };
  const ls = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
  new Function('window', 'navigator', 'document', '$', 'toast', 'setTimeout', 'localStorage', 'matchMedia', code)(win, { userAgent: ua, standalone: false }, {}, $, () => {}, (f) => timers.push(f), ls, win.matchMedia);
  return { els, ev, timers, shown: (id) => !els[id].cls.has('hidden') };
}
const ip = run('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', {});
ok(ip.shown('aInst') && ip.shown('aInstL') && ip.shown('aInstM'), '3 아이폰: 세 버튼 바로 보임');
ip.els.aInstMb.on.click(); ok(ip.shown('aInstModal') && /공유 버튼/.test(ip.els.aInstSteps.innerHTML), '4 아이폰: 누르면 사파리 공유 → 홈 화면에 추가 안내');
const an = run('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', {});
ok(!an.shown('aInstL'), '5 안드로이드: 처음엔 숨김 (설치 창 준비 기다림)');
let prompted = 0; an.ev.beforeinstallprompt({ preventDefault() {}, prompt() { prompted++; }, userChoice: Promise.resolve() });
ok(an.shown('aInstL') && an.shown('aInstM'), '6 안드로이드: 설치 가능해지면 큰 버튼 보임');
an.els.aInstL.on.click(); ok(prompted === 1, '7 누르면 바로 설치 창');
const st = {}; const a2 = run('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', st); a2.els.aInstMx.on.click();
const a3 = run('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', st); a3.timers.forEach((f) => f());
ok(!a3.shown('aInstM') && a3.shown('aInstL'), '8 ✕ 누르면 휴대폰 맨 위 버튼은 7일 숨김 (로그인 화면 버튼은 그대로)');
