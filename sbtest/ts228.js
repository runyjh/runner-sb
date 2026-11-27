// (S228) 기사앱: 로그아웃한 뒤 다른 기사가 로그인하면 앞 기사의 「허위 배송완료 안내」 · 「배번호 서류」 상자가 홈에 남던 것
//  사용: node sbtest/ts228.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a = ix.indexOf('  window.seenReset = '), ln = ix.slice(a, ix.indexOf('\n', a));
ok(a > 0, '0 로그아웃 때 비우는 곳이 있음');
const SEEN = { q: [1], chg: [1], boot: 'x', fk: [{ key: 'F1', text: '앞 기사 안내' }] }, BIBA = { items: [{ step: 'final' }], cur: { step: 'final' }, labels: [] };
const painted = [], window = {};
new Function('window', 'SEEN', 'BIBA', 'chgPaint', 'fkPaint', 'bibPaint', ln)(window, SEEN, BIBA, () => painted.push('chg'), () => painted.push('fk:' + SEEN.fk.length), () => painted.push('bib:' + BIBA.items.length));
window.seenReset();
ok(SEEN.fk.length === 0, '1 허위 배송 안내 목록을 비움');
ok(BIBA.items.length === 0 && BIBA.cur === null, '2 배번호 안내를 비움');
ok(painted.includes('fk:0') && painted.includes('bib:0'), '3 홈 상자 두 개를 다시 그려 숨김 (' + painted.join() + ')');
ok(SEEN.q.length === 0 && SEEN.chg.length === 0 && painted.includes('chg'), '4 예전에 비우던 것(스케줄 변경 상자)도 그대로');
ok(/function clearSession\(\)[^\n]*window\.seenReset\(\)/.test(ix), '5 로그아웃이 이것을 부름');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
