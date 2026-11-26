// (S217) 기사앱을 보고 있을 때 온 시험 알림: 서비스 워커가 종류·제목·내용을 넘기고 앱이 화면에 띄움
//  사용: node sbtest/ts217.js <빌드 폴더>
const fs = require('fs'), path = require('path');
const dir = process.argv.slice(2).find((d) => fs.existsSync(path.join(d, 'sw.js')) && /RUNNER_FN/.test(fs.readFileSync(path.join(d, 'sw.js'), 'utf8')));
if (!dir) { console.log('빌드 폴더 없음'); process.exit(1); }
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), ix = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
ok(/postMessage\(\{ type: 'pm-push', jobId: jobId, kind: kind, title: title, body: body \}\)/.test(sw), '1 서비스 워커가 종류·제목·내용을 앱에 넘김');
ok(/d\.kind === 'test' && document\.visibilityState === 'visible'\) toast\(/.test(ix), '2 기사앱이 시험 알림을 화면에 띄움');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
