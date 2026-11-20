// S108 확인 기록 › 기사앱 상태: ① 「앱 사용」 오늘/어제를 날짜로 셈 (예전: 어제 밤 23:58 도 「오늘」) · 「오늘 00:28」 띄어 씀
//  ② 새 버전 뒤 아직 앱을 안 연 기사 = 「다음에 열면 새 화면」 (예전 화면으로 잘못 보이던 것) · 새 버전 뒤에 열었는데 예전 것 = 「예전 화면」
//  ③ 빌드: 화면 설정에 vat(만든 시각)
//  사용: node sbtest/ts108.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const dl = ad.match(/const DAY = 86400000, dago = (\(ms\) => \{.*?\}); \/\/ \(S108\)/);
ok(!!dl, '0 dago 찾음');
const nowS = new Date(2026, 10, 21, 0, 38).getTime();
const dago = new Function('nowS', 'DAY', 'return ' + dl[1])(nowS, 86400000);
ok(dago(new Date(2026, 10, 20, 23, 58).getTime()) === '어제', '1 11/21 00:38 기준 11/20 23:58 = 어제 (예전: 오늘)');
ok(dago(new Date(2026, 10, 21, 0, 28).getTime()) === '오늘', '2 11/21 00:28 = 오늘');
ok(dago(new Date(2026, 10, 18, 9, 0).getTime()) === '3일 전', '3 11/18 = 3일 전');
ok(/esc\(dago\(t\.app\.at\)\) \+ ' <small>'/.test(ad), '4 「오늘 11/21 00:28」 띄어 씀');
const vl = ad.match(/const verTx = (\(t\) => \{.*?\});\n/);
ok(!!vl, '5 verTx 찾음');
const verTx = new Function('CUR', 'VAT', 'return ' + vl[1])('sb-new', 1000);
ok(verTx({ ver: 'sb-new', app: { at: 900 } }) === '최신 화면', '6 같은 버전 = 최신 화면');
ok(/다음에 열면 새 화면/.test(verTx({ ver: 'sb-old', app: { at: 900 } })), '7 새 버전(1000) 전에 마지막으로 연 기사 = 다음에 열면 새 화면');
ok(/예전 화면/.test(verTx({ ver: 'sb-old', app: { at: 1500 } })), '8 새 버전 뒤에 열었는데 예전 것 = 예전 화면');
ok(/예전 화면/.test(new Function('CUR', 'VAT', 'return ' + vl[1])('sb-new', 0)({ ver: 'sb-old', app: { at: 900 } })), '9 만든 시각을 모르면 예전처럼 예전 화면');
const B = path.join(__dirname);
ok(/vat: Date\.now\(\)/.test(fs.readFileSync(path.join(B, 'build.js'), 'utf8')), '10 빌드 설정에 vat');
ok(['app.js', 'boot.js'].every((f) => /vat: CFG\.vat/.test(fs.readFileSync(path.join(B, f), 'utf8'))), '11 기사앱 · 관리자 RUNNER_CONFIG 에 vat');
