// S28 서버: 다시 실행할 때 되풀이하는 난수 · uuid · 번호를 종류별로 따로 → uuid 자리에 난수가 들어가 새 탭 저장이 실패하던 것 (11/18 18:05 처음 가는 노선 알림)
//  사용: node sbtest/ts21.js
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const src = fs.readFileSync(path.join(__dirname, 'server-core.js'), 'utf8');
const a = src.indexOf('  var RND = {'), b = src.indexOf('  var realNow');
let n = 0;
const S = { uuid: () => '1111-' + (++n) };
const R = new Function('S', src.slice(a, b) + ' return { RND, replay, S, MathR };')(S);
const r1 = R.MathR.random(), u1 = R.S.uuid();           // 첫 실행: 난수 → uuid
R.RND.idx = {};                                       // 다시 실행 (외부 연결 뒤)
const u2 = R.S.uuid(), r2 = R.MathR.random();          // 순서가 바뀌어도
ok(u2 === u1 && /^1111-/.test(u2), '1 다시 실행해 순서가 바뀌어도 uuid 자리엔 uuid (' + u2 + ')');
ok(r2 === r1 && typeof r2 === 'number', '2 난수도 첫 실행 것 그대로');
const u3 = R.S.uuid(); ok(u3 !== u1 && /^1111-/.test(u3), '3 더 부르면 새 uuid');
ok(/RND\.pools = \{\}; RND\.idx = \{\}; RND\.t0 = realNow\(\)/.test(src) && /RND\.idx = \{\}; if \(S\.DateCls\.__setClock\)/.test(src), '4 새 호출이면 비우고 · 다시 실행이면 처음부터 되풀이');
