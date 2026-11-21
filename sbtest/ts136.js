// (S136) 캠프 이름 바꾸면 지난 수행률 자료와 이어짐(계보), 단가 한 번에 같은 구분 두 번 → 한 줄, 노선 캠프 이름이 어긋나면 노선관리 열 때 맞춤
//  사용: node sbtest/ts136.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_campSave', [tok, { name: '서초1캠프', rot: 'D1,D2' }]);
const C1 = call('adm_routeAll', [tok]).camps[0];
call('adm_routeSave', [tok, { campId: C1.id, code: '404AB' }]);
// 지난 수행률 (서초1 이름으로)
let r = call('adm_perfSave', [tok, { year: 2026, wk: 46, file: 'f.xlsx', rows: [{ wk: 46, wave: 'D1', camp: '서초1', code: '404A', perf: '98', grade: '1' }, { wk: 45, wave: 'D1', camp: '서초1', code: '404B', perf: '90', grade: '3' }] }]);
if (!r.ok) console.log('perf', r.msg);
// 1) 이름 바꾸기 → 계보 2줄
r = call('adm_campSave', [tok, { id: C1.id, name: '서초2캠프', seen: C1.updatedAt }]); if (!r.ok) console.log('rename', r.msg);
const ed = call('adm_lineageList', [tok]).edges.filter((e) => e.fromCamp === '서초1' && e.toCamp === '서초2').map((e) => e.fromCode + '>' + e.toCode).sort();
ok(ed.join() === '404A>404A,404B>404B', '1 캠프 이름 바꾸면 지난 자료와 잇는 계보 (' + ed.join() + ')');
const head = J("typeof rlnHead_ === 'function' ? rlnHead_(rlnEdges_(), '서초1', '404A') : {}");
ok(head.camp === '서초2', '1b 옛 이름 자료가 새 이름으로 이어짐 (' + head.camp + ')');
// 2) 단가: 같은 구분 두 번
const pr = (p2) => ({ num: '404', level: 2, value: 'A', p1: 1000, p2, p3: 850, p4: 820, p5: 900 });
r = call('adm_priceSave', [tok, C1.id, [pr(800), pr(810)]]);
const ps = (r.prices || []).filter((p) => p.num === '404' && p.value === 'A');
ok(r.ok && ps.length === 1 && Number(ps[0].p2) === 810, '2 같은 단가 두 번 → 한 줄 · 마지막 값 (' + ps.length + '줄 ' + ps.map((p) => p.p2).join() + ')');
// 3) 노선 캠프 이름 어긋남 → 노선관리 열면 맞춤 + 기록
ev("(function(){var r=readAll_(SH.ROUTES).filter(function(o){return o.id;})[0];writeFields_(SH.ROUTES,r._row,{campName:'엉뚱캠프'});})(); 1");
call('adm_routeAll', [tok]);
const cn = J("readAll_(SH.ROUTES).filter(function(o){return o.id;}).map(function(o){return o.campName;})");
ok(cn.every((x) => x === '서초2캠프'), '3 어긋난 캠프 이름 맞춤 (' + cn.join() + ')');
const el = J("readAll_(SH.ERR).filter(function(o){return /캠프 이름 맞춤/.test(JSON.stringify(o));}).length");
ok(el >= 1, '3b 오류 기록에 남김 (' + el + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
