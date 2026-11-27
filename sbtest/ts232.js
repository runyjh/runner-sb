// (S232) 기사앱 정산서 차단: 정산서를 보던 폰이 차단을 아직 모를 때 다시 열리면 기기에 남은 지난 정산서가 한 번 보이던 틈
//  → 끈 메뉴를 새로 알면 기기 · 화면의 정산서를 지우고, 지금 화면이 끈 메뉴면 홈으로 · 서버가 「꺼진 메뉴」라고 하면 화면도 비움
//  사용: node sbtest/ts232.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a = ix.indexOf('  function menuOffSet(list) {'); let d = 0, b = ix.indexOf('{', a); for (; b < ix.length; b++) { if (ix[b] === '{') d++; else if (ix[b] === '}') { d--; if (!d) break; } }
function sim(view, list) {
  const ls = { 'runner.slc': '{"slips":1}', other: 'x' }, body = { innerHTML: '<b>지난 정산서</b>' }, SLC = { tok: 't', months: [1], slips: { a: 1 }, at: 5 }, went = [];
  const st = { removeItem: (k) => { delete ls[k]; }, setItem: (k, v) => { ls[k] = v; }, getItem: (k) => ls[k] || null };
  const f = new Function('localStorage', 'sessionStorage', '$', 'SLC', 'goHome', 'store', 'menuPaint', 'menuKey', 'curView', 'USER',
    "let MENU_OFF = []; const MENU_VIEW = { sched: 'sched', settle: 'settle', pumasi: 'pm', mypage: 'my' };\nfunction menuBlocked(k, silent) { return !!k && MENU_OFF.includes(k); }\n" + ix.slice(a, b + 1) + '\nmenuOffSet(arguments[10]); return MENU_OFF;');
  const off = f(st, { removeItem() {} }, () => body, SLC, (u) => went.push(u), { get: () => '{"name":"x"}' }, () => {}, () => 'runner.menuOff.x', view, 'u', list);
  return { off, kept: !!ls['runner.slc'], other: ls.other, body: body.innerHTML, SLC, went: went.length, saved: ls['runner.menuOff.x'] };
}
let r = sim('settle', ['settle']);
ok(!r.kept && r.other === 'x', '1 정산서가 꺼졌다고 알면 기기에 둔 정산서를 지움 (다른 것은 그대로)');
ok(r.body === '' && r.SLC.tok === '' && !r.SLC.months && !Object.keys(r.SLC.slips).length, '2 화면 · 메모리의 정산서도 비움');
ok(r.went === 1, '3 정산서 화면을 보고 있었으면 홈으로');
ok(r.saved === '["settle"]', '4 끈 메뉴 목록은 예전처럼 저장');
r = sim('home', ['settle']); ok(r.went === 0 && !r.kept, '5 홈에 있었으면 그대로 홈 (정산서 보관분만 지움)');
r = sim('settle', []); ok(r.kept && r.went === 0 && r.body !== '', '6 정산서가 켜져 있으면 아무것도 안 지우고 안 옮김');
r = sim('sched', ['settle']); ok(r.went === 0, '7 다른 화면(스케줄)은 그대로');
r = sim('sched', ['sched', 'pm', 'my', 'left']); ok(r.went === 1 && r.kept, '8 보고 있던 화면이 꺼졌으면(퇴사 처리 등) 홈으로 · 정산서 보관분은 그대로');
ok((ix.match(/if \(!had \|\| \(r && r\.code === 'MENU_OFF'\)\) \$\('#slBody'\)\.innerHTML = ''/g) || []).length === 2, '9 서버가 「꺼진 메뉴」라고 답하면 먼저 그린 보관본도 지움 (처음 열 때 · 달 바꿀 때)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
