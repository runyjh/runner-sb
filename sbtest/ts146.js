// (S146) 피크 예상 물량 파일: 캠프 칸이 빈 묶음(쿠팡 12월 파일의 F_삼성1)을 노선관리의 라우트로 캠프를 찾아 붙임
//  사용: node ts146.js <runner-allinone>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2], 'src');
const AD = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const grab = (name) => { const i = AD.indexOf('  function ' + name + '('); if (i < 0) return ''; const j = AD.indexOf('\n  }\n', i); return AD.slice(i, j + 4); };
const src = ['parsePeakSheet', 'pkCampCodes', 'pkFillCamp'].map(grab).join('\n');
// 노선관리: F_삼성1 204A~D · 205A~D, 수원1 205C·D, 서초1 410A·B
const camps = [{ id: 'c1', name: 'F_삼성1캠프' }, { id: 'c2', name: '수원1캠프' }, { id: 'c3', name: '서초1캠프' }, { id: 'c4', name: '시흥9캠프' }, { id: 'c5', name: '시흥8캠프' }];
const routes = [{ campId: 'c3', g1: '204', g2: 'A', g3: 'B', g4: 'C', g5: 'D', status: '정지' }, { campId: 'c3', g1: '205', g2: 'A', g3: 'B', g4: 'C', g5: 'D', status: '정지' }, // 이관하고 남은 정지 노선 (실제 서초1)
  { campId: 'c1', g1: '204', g2: 'A', g3: 'B', g4: 'C', g5: 'D' }, { campId: 'c1', g1: '205', g2: 'A', g3: 'B', g4: 'C', g5: 'D' },
  { campId: 'c2', g1: '205', g2: 'C', g3: 'D' }, { campId: 'c3', g1: '410', g2: 'A', g3: 'B' }, { campId: 'c4', g1: '999', g2: 'A' }, { campId: 'c5', g1: '999', g2: 'A' }];
const fn = new Function('RT', 'routesOf', 'GK', 'rpCamp', 'normCode', src + '\nreturn parsePeakSheet;');
const parse = fn({ camps, routes }, (id) => routes.filter((r) => r.campId === id), ['g1', 'g2', 'g3', 'g4', 'g5'], (n) => String(n || '').replace(/\s*캠프\s*$/, '').trim().replace(/\s/g, ''), (v) => String(v || '').replace(/\s+/g, '').toUpperCase());
const H = ['야간 / 주간', '영업점', '캠프', 'Route', '11/29(일)', '11/30(월)', '12/01(화)'];
const R = (camp, code, a) => ['(야간W1)', '러너', camp, code, a, a + 1, a + 2];
const rows = [H, R(null, 'Total', 100), R(null, '205_D', 10), R(null, '205_C', 20), R(null, '204_A', 30),
  R('서초1', 'Total', 50), R('서초1', '410_B', 20), R('서초1', '410_A', 30),
  R(null, 'Total', 40), R(null, '205_D', 40), // 수원1인지 F_삼성1인지 모름 → 빼야 함
  R('수원1', 'Total', 60), R('수원1', '205_D', 30), R(null, '205_C', 30), // 캠프 칸이 합쳐진 칸처럼 비어도 같은 캠프
  R(null, 'Total', 9), R(null, '777_A', 9)]; // 노선관리에 없는 묶음 → 빼야 함
const P = parse([{ name: 'Sheet1', rows }], '러너_Peak_Demand_202612월.xlsx');
const of = (c, cd) => P.rows.filter((r) => r.camp === c && r.code === cd).length;
ok(P && of('F_삼성1', '204A') === 1 && of('F_삼성1', '205D') === 1 && of('F_삼성1', 'Total') === 1, '1 캠프 칸이 빈 맨 위 묶음 → F_삼성1 (204A · 205D · Total)');
ok(of('서초1', '410A') === 1 && of('F_삼성1', '410A') === 0, '2 캠프가 있는 묶음은 그대로 (서초1 410A)');
ok(of('수원1', '205D') === 1 && of('수원1', '205C') === 1 && P.rows.filter((r) => r.code === '205D').length === 2, '3 수원1 묶음 안의 빈 칸은 수원1 · 애매한 묶음(205D 하나)은 어느 캠프에도 안 붙음');
ok((P.noCamp || []).length === 2 && P.noCamp.some((x) => x.many) && P.noCamp.some((x) => !x.many && x.codes[0] === '777A'), '4 못 찾은 묶음 2개는 빼고 알려 줌 (맞는 캠프 여럿 · 없음)');
ok((P.filled || []).length === 1 && P.filled[0].camp === 'F_삼성1', '5 붙인 묶음을 미리보기에 알려 줌');
ok(true, '(서초1에 정지된 204 · 205 가 있어도 사용 중인 F_삼성1 로)');
ok(P.ym === '2026-12', '6 피크 월 그대로 (2026-12)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
