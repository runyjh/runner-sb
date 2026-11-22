// (S161) 치명 오류 점검: 스케줄 칸 저장(adm_schCellApply)은 맨 앞에서 관리자 로그인을 확인
//  사용: node sbtest/ts161.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', STL_IDS_V2: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-20T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '213A'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));

let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_createDriver', [tok, { name: '기사A', loginId: 'adrv01', driverType: '고정', phone: '010-4000-2010', schCampId: C1, baseRoute: '212A' }]);
const id = call('adm_listDrivers', [tok]).rows[0].id;
call('adm_schSave', [tok, [{ row: id, date: '2026-11-25', value: '212A', old: '' }]]);
const r1 = call('adm_schCellApply', ['가짜토큰', { row: id, date: '2026-11-25', value: '212A', old: '다른값', noIss: true }]);
ok(r1.ok === false && r1.current === undefined, '1 로그인 없이: 지금 칸 값을 돌려주지 않음');
const r2 = call('adm_schCellApply', ['가짜토큰', { row: id, date: '2026-11-25', value: '212A', noIss: true }]);
ok(r2.ok === false, '2 로그인 없이: 저장·이슈 아님 기억 막음');
const r3 = call('adm_schCellApply', [tok, { row: id, date: '2026-11-26', value: '212A' }]);
ok(r3.ok === true, '3 관리자: 그대로 저장됨');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
