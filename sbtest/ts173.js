// S173 산재/고용 신고: 입직신고 '중' 상태 없앰(제출 날짜만) · 단계 막대 · 다시 신고 가능 · 다시 신고 엑셀
//  사용: node sbtest/ts173.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8'), eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8');
const fnSrc = (n) => { const i = adm.indexOf('  function ' + n + '('); if (i < 0) return ''; const j = adm.indexOf('\n  }\n', i); return adm.slice(i, j + 4); };
// 화면 함수만 떼어 돌려 보기
const html = {};
const env = new Function('IR', 'irTarget', 'irEnrolled', '$', 'esc',
  [fnSrc('irEnrEff').replace(/^  /, ''), fnSrc('irEnrSt'), fnSrc('irReList'), fnSrc('irStepsPaint'), 'return { irEnrSt, irReList, irStepsPaint };'].join('\n'));
const mk = (rows, enrolled) => { const IR = { rows, info: { cfg: { enrolled: enrolled ? { names: [] } : null } } };
  return Object.assign(env(IR, (x) => !x.ex, (x) => (x.inForm === undefined ? null : x.inForm), (s) => ({ set innerHTML(v) { html[s] = v; } }), (v) => String(v)), { IR }); };
// 1) 첫 업로드 전: 다시 신고 없음
let rows = [{ name: 'A', done: false, inForm: true }, { name: 'B', done: false, inForm: false }];
let f = mk(rows, true);
ok(f.irReList().length === 0, '1 첫 공단 업로드 전에는 「다시 신고」 없음');
// 2) A 업로드 · B 입직신고 냄(신고중) → B 는 대상, 다시 신고 아님
rows[0].done = true; rows[1].enr = '신고중'; rows[1].enrAt = '2026-11-23';
f = mk(rows, true);
ok(f.irEnrSt(rows[1]) === '대상' && f.irReList().length === 0, '2 입직신고 낸 기사 = 「입직신고 대상」(제출함) · 아직 다시 신고 아님');
f.irStepsPaint(rows, rows.filter((x) => x.done), f.irReList());
ok(/ir-st now">4 양식 다시 대조 · 기다림 1명/.test(html['#irSteps']) && /✓ 3 입직신고 1명/.test(html['#irSteps']), '3 단계 막대: 3 입직신고 끝 · 지금 4 양식 다시 대조 (기다림 1명)');
// 3) 양식 다시 대조 → B 완료 → 다시 신고 가능
rows[1].enr = '완료'; rows[1].enrAt = '2026-11-01'; rows[1].inForm = true;
f = mk(rows, true);
ok(f.irReList().map((x) => x.name).join() === 'B', '4 양식 다시 대조로 완료 → B 「다시 신고 가능」');
f.irStepsPaint(rows, rows.filter((x) => x.done), f.irReList());
ok(/ir-st now">5 다시 신고 1명/.test(html['#irSteps']), '5 단계 막대: 지금 5 다시 신고 1명');
rows[1].done = true; f = mk(rows, true); f.irStepsPaint(rows, rows.filter((x) => x.done), f.irReList());
ok(f.irReList().length === 0 && !/ir-st now/.test(html['#irSteps']) && (html['#irSteps'].match(/✓/g) || []).length === 5, '6 다시 신고까지 끝 → 다섯 단계 모두 ✓');
// 정적 검사
ok(/irEnrSt\(x\) === '대상' && \(x\.enr !== '신고중' \|\| IR\.sel\.size > 0\)/.test(adm), '7 입직신고 엑셀: 이미 낸 기사는 빠짐 (고르면 다시 들어감)');
ok(!/>입직신고 중</.test(adm) && /제출 ' \+ esc\(x\.enrAt/.test(adm), '8 선택 칸에 「입직신고 중」 없음 · 줄에 「제출 11/23」');
ok(/value === '완료' \|\| value === '신고중' \? \(stlYmd_\(date\) \|\| todayText_\(\)\)/.test(eng) && /const keep = str_\(o\.enr\) === v \? str_\(o\.enrAt\) : ''/.test(eng), '9 서버: 제출 날짜 저장 · 완료로 바뀔 때 제출일이 입직신고일로 넘어가지 않음');
ok(/enrAt: \(x\.enr === '완료' \? x\.enrAt : ''\) \|\| tStart\(x\)/.test(adm), '10 양식 대조로 완료될 때 입직신고일 = 양식의 자격취득일');
ok(/id="irReX"/.test(adm) && /irExport\(l\.map\(\(x\) => x\.acct\)\)/.test(adm), '11 [다시 신고 엑셀 (N명)] = 그 사람들만 공단 업로드 엑셀');
