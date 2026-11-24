// (S185) 기사앱 일감 주기 › 그날 일할 수 있는 기사: 이름만 (캠프 · 고정/백업 빼고) · 말은 신청
//  사용: node sbtest/ts185.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
const i0 = H.indexOf('function pfAvailLoad('), i1 = H.indexOf('function openPmForm(');
const code = H.slice(i0, i1);
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(i0 > 0 && i1 > i0, '0 함수 찾음');
ok(!/x\.sub \|\| '러너 기사'/.test(code) && !/escH\(x\.sub/.test(code), '1 캠프 · 고정/백업 줄을 그리지 않음');
ok(!/지원한 기사님 중에서/.test(code), '2 안내 말: 예전 「지원한」 없음 (S188 에서 목록 · 안내를 뺌)');
ok(true, '3 (S188 에서 목록 자체를 뺌 · ts188)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
