// (S203) 관리자 스케줄: 품앗이로 받은 노선을 본인 칸에도 적으면 경고 · 새 일감 알림 코드 합침 (123A,123B → 123AB)
//  사용: node sbtest/ts203.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const SRC = path.join(process.argv[2], 'src');
const A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), P = fs.readFileSync(path.join(SRC, 'Pumasi.gs'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const grab = (name) => { const i = A.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = A.indexOf('{', i); for (let k = j; k < A.length; k++) { if (A[k] === '{') d++; else if (A[k] === '}' && !--d) return A.slice(i, k + 1); } return ''; };
const SD = { drivers: [{ id: 'D1', name: '김창호', campId: 'C8' }, { id: 'D2', name: '윤진', campId: 'C8' }], camps: [{ id: 'C8', name: '인천8캠프' }],
  pmTips: { D1: { '2026-11-24': [{ id: 'J1', from: '윤진', to: '김창호', camp: '인천8캠프', route: '103AB' }] }, D2: { '2026-11-24': [{ id: 'J1', from: '윤진', to: '김창호', camp: '인천8캠프', route: '103AB' }] } } };
let F = null;
try { F = new Function('SD', 'const shortCamp = (n) => String(n || \'\').replace(/\\s*캠프\\s*$/, \'\').trim();\n' + ['parseBR', 'pmCodesJoin', 'pmRecvDup'].map(grab).join('\n') + '; return pmRecvDup;')(SD); } catch (e) { F = null; }
const t = (row, dt, v) => (F ? F(row, dt, v) : ['없음']).join(',');
ok(t('D1', '2026-11-24', '103AB') === '인천8 103AB', '1 받은 노선을 본인 칸에 그대로 적으면 경고 (' + t('D1', '2026-11-24', '103AB') + ')');
ok(t('D1', '2026-11-24', '인천8 103B') === '인천8 103B', '2 캠프 붙여 일부만 적어도 겹친 코드만');
ok(t('D1', '2026-11-24', '122CD') === '', '3 다른 노선이면 경고 없음');
ok(t('D1', '2026-11-24', '군포1 103AB') === '', '4 다른 캠프 같은 번호는 경고 없음');
ok(t('D1', '2026-11-25', '103AB') === '', '5 품앗이 없는 날은 경고 없음');
ok(t('D2', '2026-11-24', '103AB') === '', '6 맡긴 기사 칸은 경고 대상 아님');
ok(t('D1~2', '2026-11-24', '휴무\n103A') === '인천8 103A', '7 여러 줄 · 추가 배정 줄 열쇠(~)도');
ok(/confirm\(PM_DUP_MSG\(dup\)/.test(grab('ceSave')) && /pmRecvDup\(u\.row, u\.date, u\.after\)/.test(grab('setCells')), '8 칸 편집 창 저장은 확인 · 칸에 바로 적기/붙여넣기는 알림');
ok(/route: pmCodesJoin_\(want\.slice\(\)\.sort\(\)\)/.test(P), '9 새 품앗이 일감 알림: 123A,123B → 123AB');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(A))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '10 관리자 화면 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
