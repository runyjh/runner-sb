// S102 기사앱 미리 보기가 관리자 본인 화면으로 열리던 것: ① 삼성 인터넷에서 크롬으로 다시 열 때 미리 보기 열쇠(#pv=)가 빠짐 → 미리 보기 창은 크롬으로 넘기지 않음
//  ② PC 에서 같은 미리 보기 창을 다시 쓰면 # 뒤만 바뀌어 새로 안 열림(앞서 본 기사 그대로) → 주소에 시각을 붙여 늘 새로 엶
//  사용: node sbtest/ts102.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
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
  const env = { $, window: win, navigator: { userAgent: o.ua, standalone: false }, document: {}, store: { get: () => (o.noTok ? '' : 't') }, TOKEN: 'TOKEN', PVT: o.pvt || '', setTimeout: setT, setInterval: (f, ms) => setI(f, ms), clearInterval: (h) => h && h.stop && h.stop(), clearTimeout: () => {},
    matchMedia: win.matchMedia, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; }, removeItem: (k) => { delete ls[k]; } }, sessionStorage: { getItem: (k) => ss[k] || null, setItem: (k, v) => { ss[k] = v; } },
    api: (fn, ...a) => { (o.calls = o.calls || []).push([fn].concat(a)); return o.api ? o.api(fn, a) : Promise.resolve({ ok: false }); }, location: o.loc || { href: 'https://x/runner-sb/', search: '' }, loading: (on, t) => loads.push(on ? t : ''), toast: (t) => toasts.push(t) };
  new Function(...Object.keys(env), code)(...Object.values(env));
  const fire = (k, e) => (winH[k] || []).forEach((f) => f(e));
  return { $, tick, fire, win, ss, toasts, loads, loc: env.location };
}
const AND = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/148.0 Mobile Safari/537.36', SAMU = AND.replace('Chrome', 'SamsungBrowser/31.0 Chrome');
const PVURL = 'https://x/runner-sb/?pvt=1#pv=PV' + 'a'.repeat(60);
const n = phone({ ua: SAMU, noTok: true });
ok(/^intent:/.test(n.loc.href), '0 (그대로) 보통 기사앱을 삼성 인터넷으로 열면 크롬으로 넘김');
const p = phone({ ua: SAMU, pvt: 'PV' + 'a'.repeat(60), loc: { href: PVURL, search: '?pvt=1' } });
ok(p.loc.href === PVURL && !(p.$('#instPop').classList.contains('hidden') === false), '1 미리 보기 창은 삼성 인터넷이어도 크롬으로 안 넘김 → 열쇠가 남아 그 기사 화면으로 열림');
const k = phone({ ua: AND.replace('Chrome', 'NAVER(inapp; search) Chrome'), pvt: 'PV' + 'a'.repeat(60), loc: { href: PVURL, search: '?pvt=1' } });
ok(k.loc.href === PVURL, '2 앱 안 브라우저로 열어도 미리 보기 창은 그대로');
ok(/new URL\('\.\.\/', location\.href\)\.href \+ '\?pvt=' \+ Date\.now\(\) \+ '#pv=' \+ r\.pv/.test(ad), '3 관리자: 미리 보기 주소에 시각을 붙여 같은 창을 다시 써도 새로 엶');
ok(/\[#&\]pv=\(PV\[A-Za-z0-9\]\{40,120\}\)/.test(ix) && /history\.replaceState\(null, '', location\.pathname \+ location\.search\)/.test(ix), '4 기사앱: ?pvt= 가 붙어도 #pv= 열쇠를 그대로 읽음');
