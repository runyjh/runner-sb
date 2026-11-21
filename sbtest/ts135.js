// (S135) 노선 이관 뒤 [다시 맞추기]로 바꾼 칸도, 그 이관을 취소하면 되돌림
//  사용: node sbtest/ts135.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
['서초1캠프', 'F_삼성1캠프'].forEach((n) => call('adm_campSave', [tok, { name: n, rot: 'D1,D2' }]));
const C = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { C[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: C['서초1캠프'], code: '404ABCD' }]);
call('adm_createDriver', [tok, { name: '고정가', loginId: 'gga01', driverType: '고정', phone: '010-2000-3001', schCampId: C['서초1캠프'], baseRoute: '404AB' }]);
call('adm_createDriver', [tok, { name: '백업다', loginId: 'bda01', driverType: '백업', phone: '010-2000-3002', schCampId: C['서초1캠프'], baseRoute: '백업' }]);
const DR = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { DR[d.name] = d.id; });
const D0 = '2026-11-25';
const mv = call('adm_rcMove', [tok, { fromCampId: C['서초1캠프'], fromNum: '404', toCampId: C['F_삼성1캠프'], toNum: '204', date: D0 }, false]);
// 이관 뒤에 백업다가 옛 번호로 칸을 적음 → [다시 맞추기]
call('adm_schSave', [tok, [{ row: DR['백업다'], date: D0, value: '404CD', old: '' }]]);
const fx = call('adm_rcMoveFix', [tok, false]);
const cell = () => call('adm_schRange', [tok, D0, D0]).cells[DR['백업다']][D0];
console.log('  다시 맞춘 뒤', cell(), '(칸 ' + fx.cells + ')');
ok(cell() !== '404CD', '1 다시 맞추기가 칸을 바꿈');
call('adm_rcCancel', [tok, mv.moveId]);
ok(cell() === '404CD', '2 이관 취소하면 다시 맞춘 칸도 되돌림 (' + cell() + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
