// (S223) 기사앱 확인 기록(휴대폰): 기사 목록 줄 맞춤 — 이름 왼쪽 · 상태 오른쪽 · 카드 안쪽 여백
//  사용: node sbtest/ts223.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ad = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(/\.tdx-list \.td-row \{ align-items: center; padding: 10px 14px; box-sizing: border-box;/.test(ad), '1 목록 줄에 안쪽 여백 (다른 화면의 .td-row 규칙에 지워지지 않게)');
const i = ad.indexOf('.tdx-list .td-nm { text-align: left; }'), j = ad.lastIndexOf('@media', i);
ok(i > 0 && /max-width/.test(ad.slice(j, j + 60)), '2 휴대폰 너비에서 이름 왼쪽 정렬');
ok(/\.tdx-list \.td-tags \{ justify-content: flex-start; \} \.tdx-list \.td-side \{ flex: none; align-items: flex-end; text-align: right; \}/.test(ad), '3 꼬리표 왼쪽 · 상태 오른쪽');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
