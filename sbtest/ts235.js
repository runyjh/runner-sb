// (S235) 기사앱 품앗이: 여러 코드로 나눈 일감 카드의 정보 창에서 [품앗이 지원하기]를 누르면 첫 코드만 지원되던 것 → 카드에서 고른 코드대로
//  사용: node sbtest/ts235.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a = ix.indexOf("    const tk = e.target.closest('[data-sheettake]');"), b = ix.indexOf('\n', ix.indexOf('\n', a) + 1);
ok(a > 0, '0 정보 창의 지원 단추 처리가 있음');
function sim(jobs, id) {
  const log = [];
  new Function('e', 'PMT', 'pmTake', 'pmApplyGrp', 'pmSheetClose', '(function () {' + ix.slice(a, b) + '\n})();')(
    { target: { closest: (q) => (q === '[data-sheettake]' ? { dataset: { sheettake: id } } : null) } }, { jobs }, (i, s) => log.push('one ' + i + ' ' + s), (k) => log.push('grp ' + k), () => log.push('close'));
  return log.join(',');
}
const G = [{ id: 'J1', grp: 'K', route: '210A' }, { id: 'J2', grp: 'K', route: '210B' }, { id: 'J3', grp: 'Z', route: '300A' }];
ok(sim(G, 'J1') === 'close,grp K', '1 묶음(2개 코드) → 창을 닫고 고른 코드대로 묶음 지원 (' + sim(G, 'J1') + ')');
ok(sim(G, 'J2') === 'close,grp K', '2 둘째 코드에서 열어도 같음');
ok(sim(G, 'J3') === 'one J3 true', '3 한 건짜리는 예전 그대로 (' + sim(G, 'J3') + ')');
ok(sim([], 'J9') === 'one J9 true', '4 목록에 없는 일감(알림으로 연 것)도 예전 그대로');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
