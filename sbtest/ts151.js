// (S151) 관리자앱 휴대폰 캠프 스케줄 달력 칸에 그날 물량 합계 (피크 기간 = 피크 예상 · 아니면 전월 요일 평균) · 같은 노선 두 명(중복)도 한 번만
//  화면 확인은 브라우저로 직접 (군포1 · 피크 8노선 → 11/23 1,264 = 노선마다 한 번) · 이 시험은 코드 모양만 확인
//  사용: node sbtest/ts151.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const AD = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const i = AD.indexOf("if (sMob === 'camp') {"), seg = i >= 0 ? AD.slice(i, i + 9000) : '';
ok(/const qOf = \(dt\) =>/.test(seg), '1 캠프 달력에 물량 합계 계산(qOf)');
ok(/grid\(\(dt, i\) => \{[^\n]*qOf\(dt\)/.test(seg), '2 달력 칸에 표시');
ok(/vqmOfDay\(r, dt, rt\)/.test(seg) && /pkmOfDay\(r, dt\)/.test(seg), '3 그날 카드와 같은 계산(평균 · 피크)');
ok(/!sv\[k\]/.test(seg) && /!sp\[k\]/.test(seg), '4 같은 노선은 한 번만 (중복 칸)');
ok(/물량\(전월 평균/.test(seg), '5 달력 위 설명에 물량 표시');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
