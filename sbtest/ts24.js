// S32 앱 설치: 카톡 등 앱 안 브라우저 → 기본 브라우저로 다시 열기 · 삼성 인터넷도 설치 버튼 + 삼성 인터넷 설치 안내 (기사앱 · 관리자앱)
//  사용: node sbtest/ts24.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const load = (file, start) => { const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', file), 'utf8'); const i0 = H.indexOf(start); return H.slice(i0, H.indexOf('})();', i0) + 5); };
const codes = { 기사앱: [load('Index.html', '(function installer() {'), 'instBtn', 'instSteps', 'instHelp'], 관리자앱: [load('Admin.html', '(function adminInstaller() {'), 'aInstL', 'aInstSteps', 'aInstModal'] };
function run(code, ua, ss, ls, sa, q) {
  const els = {}, el = (id) => els[id] || (els[id] = { id, cls: new Set(['hidden']), on: {}, innerHTML: '', classList: { add: (c) => els[id].cls.add(c), remove: (c) => els[id].cls.delete(c), contains: (c) => els[id].cls.has(c) }, addEventListener: (t, f) => { els[id].on[t] = f; } });
  const timers = [], loc = { href: 'https://runyjh.github.io/runner-sb/', search: q != null ? q : sa ? '?app=1' : '' }, store = ss || {};
  const lst = ls || {}, ev = {};
  const win = { RUNNER_CONFIG: {}, matchMedia: () => ({ matches: !!sa }), addEventListener: (t, f) => { ev[t] = f; } };
  new Function('window', 'navigator', 'document', '$', 'toast', 'setTimeout', 'localStorage', 'sessionStorage', 'location', 'matchMedia', 'loading', 'store', 'TOKEN', 'PVT', 'setInterval', 'clearInterval', 'clearTimeout', code)(
    win, { userAgent: ua, standalone: false }, {}, (q) => el(q.replace('#', '')), () => {}, (f) => timers.push(f),
    { getItem: (k) => lst[k] || null, setItem: (k, v) => { lst[k] = v; }, removeItem: (k) => { delete lst[k]; } }, { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, loc, win.matchMedia,
    () => {}, { get: () => '' }, 'TOKEN', '', (f) => { timers.push(() => { for (let i = 0; i < 9; i++) f(); }); return 0; }, () => {}, () => {}); // (S78) 설치 기다림 문구 · 4초 기다림(바로 돌림)
  return { els, timers, loc, store, lst, ev };
}
Object.keys(codes).forEach((app) => {
  const [code, btn, steps, box] = codes[app];
  const k = run(code, 'Mozilla/5.0 (Linux; Android 14) KAKAOTALK 10.8');
  ok(/^kakaotalk:\/\/web\/openExternal\?url=https%3A%2F%2Frunyjh\.github\.io/.test(k.loc.href), app + ' 1 카톡에서 열면 → 기본 브라우저로 다시 열기 (' + k.loc.href.slice(0, 40) + '…)');
  const k2 = run(code, 'Mozilla/5.0 (Linux; Android 14) KAKAOTALK 10.8', k.store);
  ok(k2.loc.href === 'https://runyjh.github.io/runner-sb/' && !k2.els[btn].cls.has('hidden'), app + ' 2 한 번 넘긴 뒤 다시 오면 넘기지 않고 안내 버튼 (되풀이 안 함)');
  const n = run(code, 'Mozilla/5.0 (Linux; Android 14) NAVER(inapp; search; 1000)');
  ok(/^intent:\/\/runyjh\.github\.io\/runner-sb\/#Intent;scheme=https;/.test(n.loc.href), app + ' 3 안드로이드 네이버 앱 → intent 로 기본 브라우저');
  const s = run(code, 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 SamsungBrowser/27.0 Chrome/125 Mobile Safari/537.36');
  ok(s.els[btn].cls.has('hidden'), app + ' 4 삼성 인터넷: 처음엔 설치 창을 기다림');
  s.timers.forEach((f) => f());
  ok(!s.els[btn].cls.has('hidden'), app + ' 5 삼성 인터넷: 설치 창이 안 와도 설치 버튼이 보임');
  (s.els[btn].on.click || s.els['aInst'].on.click)(); s.timers.splice(0).forEach((f) => f()); // (S78) 기사앱은 설치 창을 4초 기다린 뒤 안내
  ok(/현재 페이지 추가/.test(s.els[steps].innerHTML) && !s.els[box].cls.has('hidden'), app + ' 6 누르면 삼성 인터넷 설치 방법 (≡ → 현재 페이지 추가 → 홈 화면)');
  // 7~9. 설치했다고 본 기기는 브라우저로 열어도 버튼 안 보임
  const L = {}, SAM = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) SamsungBrowser/27.0 Chrome/125 Mobile';
  run(code, SAM, {}, L, true);
  const key = app === '기사앱' ? 'runner.appInstalled' : 'runner.admInstalled2';
  ok(L[key] === '1', app + ' 7 설치한 앱으로 열면 이 기기를 설치함으로 기억 (' + key + ')');
  const g = run(code, SAM, {}, L); g.timers.forEach((f) => f());
  ok(g.els[btn].cls.has('hidden'), app + ' 8 그 뒤 브라우저로 열어도 설치 버튼 안 보임');
  g.ev.beforeinstallprompt({ preventDefault() {}, prompt() {}, userChoice: Promise.resolve() });
  ok(!g.els[btn].cls.has('hidden') && !L[key], app + ' 9 브라우저가 다시 설치 가능하다고 하면(앱을 지움) 버튼 다시 보임');
  if (app === '관리자앱') { const L3 = {}; run(code, SAM, {}, L3, true, ''); ok(!L3[key], app + ' 10 기사앱 창 안에서 열린 관리자 화면(아이콘으로 연 게 아님)은 설치로 기억하지 않음'); }
  if (app === '관리자앱') { const w = run(code, SAM, {}, {}, true, ''); ok(!w.els.aInstL.cls.has('hidden'), app + ' 11 기사앱 창 안에서 열렸으면 설치 버튼 → 누르면 브라우저로'); w.els.aInstL.on.click(); ok(/^intent:\/\//.test(w.loc.href), app + ' 12 (' + w.loc.href.slice(0, 30) + '…)'); }
});
