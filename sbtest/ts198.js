// (S198) 관리자 기사 정보관리: 쿠팡플렉스 아이디 복사 버튼 (휴대폰 화면 목록에도 · 누르면 기사 창은 안 열림)
//  사용: node sbtest/ts198.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const A = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(/class="dcopy" data-cpid="' \+ esc\(r\.loginId\) \+ '"/.test(A), '1 목록 아이디 칸에 복사 버튼');
ok(/const cpb = e\.target\.closest\('\.dcopy'\);[\s\S]{0,400}return; \}\n\s*if \(e\.target\.closest\('td\.ck'\)/.test(A), '2 복사 버튼은 기사 창을 열지 않고 복사만');
ok(/view-drivers', key: \['이름'\], mid: \['배정 캠프 · 라우트'\], st: \['앱 사용'\], ico: \['쿠팡플렉스 아이디', '연락처'\]/.test(A), '3 휴대폰 한 줄 목록에 복사 버튼 (전화 옆)');
ok(!/html\.m #view-drivers table\.tk-card td\[data-l="쿠팡플렉스 아이디"\]/.test(A), '4 휴대폰에서 아이디 칸을 숨기던 규칙 뺌');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
