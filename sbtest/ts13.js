// S19 기사 칸 빠른 입력: 글자를 바로 치면 입력칸 (더블클릭 · Enter 는 칸 입력 창) · 한글 조합 중에도 열림
//  사용: node sbtest/ts13.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const oe = H.slice(H.indexOf('function openEdit(initial)'), H.indexOf('function openEdit(initial)') + 2500);
// openEdit 의 갈림만 떼어 시험: 기사 칸에서 initial 이 없으면 창 · 있으면 빠른 입력
const line = oe.match(/if \(r && r\.kind === 'd' && r\.d && initial == null\) return ceOpenAt\(sAct\.r, sAct\.c\);/);
ok(!!line, '1 기사 칸: 글자 없이 열면(더블클릭 · Enter) 칸 입력 창');
const route = (initial) => new Function('r', 'initial', 'ceOpenAt', 'sAct', line[0] + ' return "inline";')({ kind: 'd', d: {} }, initial, () => 'modal', { r: 0, c: 0 });
ok(route(undefined) === 'modal' && route('4') === 'inline' && route('') === 'inline', '2 숫자를 치면 빠른 입력 · 한글(빈 입력칸) 도 빠른 입력 · 더블클릭은 창');
ok(/k === 'Process' \|\| e\.isComposing \|\| e\.keyCode === 229\)\) openEdit\(''\)/.test(H), '3 한글 조합 키(Process · 229)도 입력칸을 엶');
const ce = H.slice(H.indexOf('function commitEdit()'), H.indexOf('function commitEdit()') + 2500);
ok(/cellCheck\(e\.r, e\.dt, e\.ta\.value\)/.test(ce), '4 빠른 입력 저장도 칸 글자 규칙(S16) 확인');
