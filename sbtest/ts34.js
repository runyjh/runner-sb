// S43 점검 후속: ① 가입 화면 주소 검색(다음 우편번호)이 보안 제한(CSP)에 막히던 것 ② 관리자앱 자동 속도 측정 기본 끔
//  사용: node sbtest/ts34.js <runner-allinone 폴더> <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src'), OUT = process.argv[3] || '';
const idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), bld = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
// 기사앱이 부르는 바깥 주소는 모두 허용 목록에 있어야 한다
const hosts = Array.from(new Set((idx.match(/https:\/\/[A-Za-z0-9._-]+/g) || []))).filter((h) => !/w3\.org/.test(h));
ok(hosts.indexOf('https://t1.daumcdn.net') >= 0, '1 기사앱 가입 화면은 다음 우편번호(t1.daumcdn.net)를 씀');
ok(/PUSH_CSP = \{ script: '[^']*https:\/\/t1\.daumcdn\.net[^']*'/.test(bld) && /frame: 'https:\/\/postcode\.map\.daum\.net https:\/\/postcode\.map\.kakao\.com'/.test(bld), '2 빌드: 기사앱에 주소 검색 스크립트 · 검색 창 허용');
if (OUT) {
  const cspOf = (f) => { const m = fs.readFileSync(path.join(OUT, f), 'utf8').match(/Content-Security-Policy" content="([^"]*)/); const o = {}; (m ? m[1] : '').split(';').forEach((d) => { const a = d.trim().split(/\s+/); o[a[0]] = a.slice(1); }); return o; };
  const app = cspOf('index.html'), admin = cspOf(path.join('admin', 'index.html'));
  const allowed = (list, url) => list.some((s) => s.indexOf('https://') === 0 && url.indexOf(s) === 0);
  ok(allowed(app['script-src'], 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js') && allowed(app['frame-src'], 'https://postcode.map.daum.net/search') && allowed(app['frame-src'], 'https://postcode.map.kakao.com/search'), '3 기사앱 화면: 주소 검색 허용됨');
  ok(!allowed(admin['script-src'], 'https://t1.daumcdn.net/x') && !(admin['frame-src'] || []).some((s) => /daum|kakao/.test(s)), '4 관리자앱 화면: 쓰지 않으므로 그대로 막음');
  ok(allowed(app['script-src'], 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js') && app['object-src'][0] === "'none'" && app['default-src'][0] === "'self'", '5 나머지 제한은 그대로 (알림 스크립트 허용 · 그 밖은 막음)');
}
ok(/localStorage\.getItem\('runner\.autobench2'\) === '1'/.test(adm) && !/getItem\('runner\.autobench'\) !== '0'/.test(adm), '6 자동 속도 측정: 켠 기기에서만 (기본 끔)');
ok(/localStorage\.setItem\('runner\.autobench2', e\.target\.checked \? '1' : '0'\)/.test(adm) && /setTimeout\(autoRun, 120000\); setInterval\(autoRun, 1800000\);/.test(adm), '7 유지보수 › 속도 에서 켜면 예전처럼 30분마다');
