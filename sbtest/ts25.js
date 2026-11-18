// S33 기사앱 · 관리자앱 앱 범위가 겹치지 않게 (기사앱 = index.html · 관리자앱 = admin/) → 관리자앱도 따로 설치 · 홈 화면 아이콘
//  사용: node sbtest/ts25.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const base = 'https://runyjh.github.io/runner-sb/';
const dm = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.webmanifest'), 'utf8')), am = JSON.parse(fs.readFileSync(path.join(OUT, 'admin', 'manifest.webmanifest'), 'utf8'));
const R = (u, b) => new URL(u, b).href;
const dScope = R(dm.scope, base + 'manifest.webmanifest'), aScope = R(am.scope, base + 'admin/manifest.webmanifest');
ok(dScope === base + 'index.html' && aScope === base + 'admin/', '1 앱 범위: 기사앱 ' + dScope + ' · 관리자앱 ' + aScope);
ok(!aScope.startsWith(dScope) && !dScope.startsWith(aScope), '2 두 범위가 겹치지 않음 (관리자앱이 기사앱 창으로 열리지 않음)');
ok(R(dm.start_url, base + 'manifest.webmanifest').startsWith(dScope) && R(dm.id, base + 'manifest.webmanifest') === base, '3 기사앱 시작 주소가 범위 안 · 앱 id 그대로 (이미 깐 기사앱은 같은 앱으로 새 설정)');
const H = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), sc = H.match(/<script>(try\{if\(\/\\\/\$\/[^<]*)<\/script>/);
let to = '';
const loc = { pathname: '/runner-sb/', search: '?pm=J1', hash: '' };
new Function('location', 'history', sc[1])(loc, { state: null, replaceState: (s, t, u) => { to = u; } });
ok(to === '/runner-sb/index.html?pm=J1', '4 …/runner-sb/ 로 열면 같은 화면 그대로 index.html 주소로 (' + to + ')');
const sw = fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8');
ok(/'\.\/index\.html\?pm=' \+ encodeURIComponent\(jobId\) : '\.\/index\.html'/.test(sw), '5 알림을 누르면 여는 주소도 기사앱 범위 안');
