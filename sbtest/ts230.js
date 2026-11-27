// (S230) 기사앱 내 스케줄 한 달: 내 캠프 출근 + 다른 캠프 추가 배정이 같은 날이면(서버가 「출근, 강서1 527B」로 보냄)
//  내 노선이 빠지고 다른 캠프 노선이 내 캠프 것처럼 보이던 것 → 캠프별로 나눠 보임 (내 캠프 화면의 그날 노선 읽기와 같은 규칙)
//  사용: node sbtest/ts230.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a0 = ix.indexOf('  const SCH_OFFV'), b0 = ix.indexOf('  function schParse(v, baseRoute, homeCamp) {');
let d = 0, b = ix.indexOf('{', b0); for (; b < ix.length; b++) { if (ix[b] === '{') d++; else if (ix[b] === '}') { d--; if (!d) break; } }
let P = null; try { P = new Function("const CAMP_ROTS = {}, ROT_FULL = 'D1,D2,F3', fullRot = () => ROT_FULL;\n" + ix.slice(a0 > 0 ? a0 : b0, b + 1) + '\nreturn { parts: typeof schParts === "function" ? schParts : null, parse: schParse };')(); } catch (e) { P = { parts: null }; }
ok(!!P.parts, '0 캠프별로 나눠 읽는 기능이 있음');
const show = (v, base) => { const r = P.parts ? P.parts(v, base) : null; return r ? r.map((q) => (q.camp || '내캠프') + ':' + q.codes.join('/')).join(' + ') : '한덩어리'; };
ok(show('출근, 강서1 527B', '529A') === '내캠프:529A + 강서1:527B', '1 「출근, 강서1 527B」 → 내 노선 529A 와 강서1 527B 둘 다 (' + show('출근, 강서1 527B', '529A') + ')');
ok(show('529A, 강서1 527B', '529A') === '내캠프:529A + 강서1:527B', '2 「529A, 강서1 527B」 도 캠프별로');
ok(show('529A, F_삼성1 204A', '529A') === '내캠프:529A + F_삼성1:204A', '3 영문이 붙은 캠프 이름도');
['529A', '출근', '강서1 527B', '529A, 530B', '휴무', '휴무, 강서1 527B', '미입차', ''].forEach((v) => ok(show(v, '529A') === '한덩어리', '4 한 덩어리 칸은 예전 그대로: 「' + v + '」'));
ok(/pps = vv \? schParts\(vv, brAt\(r, d\)\) : null/.test(ix) && /const chip = pps \? /.test(ix), '5 한 달 칸이 나눠 읽은 것으로 그림');
ok(/const mps = o\.cell \? schParts\(o\.cell, o\.baseRoute \|\| ''\) : null/.test(ix) && /: mps \? mps\.map\(/.test(ix), '6 그날 카드도 캠프별로 그림');
ok(/!rid && !mps && o\.cell && mp\.routes/.test(ix), '7 그런 날에 「담당 아닌 노선」 표시를 붙이지 않음');
// 내 캠프 화면(그날 노선 읽기)과 같은 나누는 규칙인지
const rx = '/,\\s*(?=(?:[A-Za-z]+_)?[가-힣]+\\d*\\s+\\d)/';
ok(ix.split(rx).length - 1 >= 3, '8 나누는 규칙이 그날 노선 읽기와 같음 (같은 식 ' + (ix.split(rx).length - 1) + '곳)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
