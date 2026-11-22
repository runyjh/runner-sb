// (S154) 관리자앱 휴대폰 화면: ① 기사 상세 · 창이 열린 동안 아래 메뉴 줄(z 40)이 기사 상세(z 21)의 [저장] 줄을 덮어 저장을 못 누름 → 창이 열리면 아래 메뉴 줄 · 수파베이스 표시 숨김
//  ② 기사스케줄 한 달 보기의 [이 날 고치기] 버튼: data-smbrow="" 뒤에 따옴표가 하나 더 있어 눌러도 칸 고치기 창이 안 열림
//  사용: node sbtest/ts154.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const A = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(!/data-[a-z]+=""' \+/.test(A), '1 data-속성="" 뒤에 값이 붙는 깨진 따옴표 없음');
ok(/data-smbrow="' \+ esc\(r\.key \|\| r\.row\) \+ '">이 날 고치기/.test(A), '2 [이 날 고치기] 버튼에 줄 열쇠가 제대로 들어감');
ok(/html\.m body:has\(\.drawer:not\(\.hidden\)\) \.mtab/.test(A) && /html\.m body:has\(\.modal:not\(\.hidden\)\) \.mtab/.test(A), '3 기사 상세 · 창이 열리면 아래 메뉴 줄 숨김');
ok(/html\.m body:has\(\.drawer:not\(\.hidden\)\) #sbPill/.test(A), '4 기사 상세 · 창이 열리면 위 수파베이스 표시도 숨김');
// 기본으로 열려 있는 .modal / .drawer 가 없어야 아래 메뉴 줄이 평소에 숨지 않음
const opened = (A.match(/<(?:div|aside)[^>]*class="(?:modal|drawer)(?![^"]*\bhidden\b)[^"]*"/g) || []);
ok(opened.length === 0, '5 처음부터 열려 있는 창 없음 (' + opened.join(' ').slice(0, 120) + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
