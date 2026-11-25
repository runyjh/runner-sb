// (S213) 휴대폰 알림: 관리자 화면을 보고 있어도 알림 창이 뜸 (기사앱 화면을 보고 있을 때만 앱 안으로 전달)
//  사용: node sbtest/ts213.js <빌드 폴더(sw.js 있는 곳)>
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = process.argv.slice(2).find((d) => fs.existsSync(path.join(d, 'sw.js')) && /RUNNER_FN/.test(fs.readFileSync(path.join(d, 'sw.js'), 'utf8')));
if (!dir) { console.log('빌드 폴더 없음'); process.exit(1); }
const src = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
async function shown(url, ua) {
  let n = 0, h = {}; const wins = url ? [{ url, visibilityState: 'visible', focused: true, postMessage() {} }] : [];
  const self = { registration: { scope: 'https://runyjh.github.io/runner-sb/', showNotification: () => { n++; return Promise.resolve(); }, getNotifications: () => Promise.resolve([]) },
    clients: { matchAll: () => Promise.resolve(wins), claim: () => Promise.resolve(), openWindow: () => Promise.resolve() }, navigator: { userAgent: ua || 'Android' },
    addEventListener: (k, f) => { h[k] = f; }, skipWaiting: () => Promise.resolve(), location: { href: 'https://runyjh.github.io/runner-sb/sw.js' } };
  const ctx = { self, fetch: () => Promise.resolve({}), caches: { open: () => Promise.resolve({ addAll: () => Promise.resolve() }), keys: () => Promise.resolve([]), match: () => Promise.resolve() }, URL, setTimeout, Promise, console };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  let p; h.push({ data: { json: () => ({ data: { title: 't', body: 'b', kind: 'test' } }) }, waitUntil: (x) => { p = x; } });
  await p; return n;
}
(async () => {
  ok(await shown('https://runyjh.github.io/runner-sb/admin/index.html') === 1, '1 관리자 화면을 보고 있으면 알림 창 뜸');
  ok(await shown('https://runyjh.github.io/runner-sb/index.html') === 0, '2 기사앱 화면을 보고 있으면 앱 안으로만 (예전과 같음)');
  ok(await shown('https://runyjh.github.io/runner/index.html') === 1, '3 다른 앱(원래 앱) 화면이면 알림 창 뜸');
  ok(await shown('') === 1, '4 아무 화면도 안 보고 있으면 알림 창 뜸');
  console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
})();
