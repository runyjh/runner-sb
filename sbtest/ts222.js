// (S222) 「알림 미지원」 기록에 원인을 가릴 정보를 같이 남김 + 시험 알림 기록의 없어진 기기 표시
//  사용: node sbtest/ts222.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8'), ad = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const m = ix.match(/const pushDiag = (\(e\) => \{[^\n]*\});\n/);
ok(!!m, '0 진단 함수가 있음');
if (m) {
  const run = (env, msg) => new Function('window', 'navigator', 'document', 'return (' + m[1] + ')(new Error(' + JSON.stringify(msg) + '));')(env.window, env.navigator, env.document);
  const cct = { window: { RUNNER_CONFIG: {}, isSecureContext: true }, navigator: { serviceWorker: {}, userAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' }, document: { referrer: 'android-app://com.kakao.talk/' } };
  const d = run(cct, '이 브라우저는 휴대폰 알림 미지원');
  ok(/기능 YYNN 보안Y 연곳=android-app:\/\/com\.kakao\.talk\//.test(d) && /Chrome\/131/.test(d), '1 미지원이면 빠진 기능 · 연 곳 · 브라우저 꼬리표가 남음 (' + d.slice(0, 70) + ')');
  ok(d.length < 230, '2 서버가 자르는 길이(300자) 안에 들어감 (' + d.length + ')');
  ok(run(cct, '기기 토큰 받기 20초 초과') === '', '3 다른 실패에는 덧붙이지 않음');
}
ok(/pushFail[\s\S]{0,900}\+ pushDiag\(e\);/.test(ix), '4 실패 기록에 진단을 붙임');
ok(/\/\^없어진 기기\/\.test\(r\.res \|\| ''\) \? '없어진 기기' : '안 보냄'/.test(ad), '5 관리자 화면: 없어진 기기는 「없어진 기기」로 표시');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
