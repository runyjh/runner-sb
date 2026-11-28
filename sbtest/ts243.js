// (S243) 품앗이 일감 올리기(직함자): 서버가 「내 기본 노선」을 주석 줄에 붙여 놓아 보내지 못하던 것 → 보냄 (화면이 내 캠프를 고르면 기본 노선을 미리 골라 줌)
//  사용: node sbtest/ts243.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const pg = fs.readFileSync(path.join(process.argv[2], 'src', 'Pumasi.gs'), 'utf8'), ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const ln = pg.split('\n').filter((l) => /myRoute:/.test(l));
ok(ln.length === 1, '0 기본 노선을 보내는 줄이 하나');
ok(ln.length === 1 && !/\/\/.*myRoute:/.test(ln[0]), '1 그 줄이 주석 안에 있지 않음');
const strip = pg.split('\n').map((l) => l.replace(/\s\/\/ .*$/, '')).join('\n');
ok(/myRoute: String\(me\.baseRoute \|\| ''\)/.test(strip), '2 주석을 걷어내도 남아 있음 (실제로 보내짐)');
let f = null; try { f = new Function('me', 'return ' + (ln[0] || "myRoute: ''").trim().replace(/^myRoute:\s*/, '').replace(/,\s*(\/\/.*)?$/, '') + ';'); } catch (e) { f = null; }
ok(!!f && f({ baseRoute: '205AB(D1) 206A' }) === '205AB' && f({ baseRoute: '' }) === '' && f({}) === '', '3 기본 노선의 첫 노선만 (회전 표기 뺌) · 없으면 빈 값');
ok(/f\.myRoute \|\| ''/.test(ix), '4 화면은 이 값을 읽어 미리 골라 줌');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
