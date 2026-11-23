// (S145) 품앗이: 제안 일감의 날짜 · 구분을 고칠 때 제안받은 기사가 그날 받을 수 있는지 다시 확인
//  사용: node sbtest/ts145.js <runner-allinone 폴더>
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
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '1234567890' }); }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
ev("appSetPut_('pmExtOn', 'ON', ''); 1"); // (S176) 기사끼리 제안은 외부용에서만
const job = { kind: '야간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 1100, pay: '러너 정산서', okLow: true };
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
// B 는 11/25 확정 (C 가 맡긴 일)
let r = call('api_pmSave', [T.C, Object.assign({}, job, { date: '2026-11-25' })]); call('api_pmApply', [T.B, r.id, '']);
call('api_pmDecide', [T.C, r.id, J("readAll_(SH.PAPP).filter(function(a){return a.jobId==='" + r.id + "';})[0].id"), 'accept']);
r = call('api_pmSave', [T.P, Object.assign({}, job, { offerToId: D.B })]); const j = r.id;
const dateOf = () => J("readAll_(SH.PJOB).filter(function(o){return o.id==='" + j + "';})[0].date");
// 1) 이미 확정된 날로 고치기 → 막고 그대로
let e = call('api_pmSave', [T.P, Object.assign({}, job, { id: j, date: '2026-11-25' })]);
ok(e.ok === false && /이미 확정된/.test(e.msg) && dateOf() === '2026-11-24', '1 제안받은 기사가 이미 확정된 날로는 못 고침 (' + (e.msg || 'ok') + ')');
// 2) 퇴사일 뒤로 고치기 → 막음
ev("(function(){var o=driverById_('" + D.B + "');writeFields_(SH.DRIVERS,o._row,{workStatus:'퇴사',leaveDate:'2026-11-26'});forgetDriver_(o);})(); 1");
const lf = J("schLeaveFrom_(driverById_('" + D.B + "'))");
e = call('api_pmSave', [T.P, Object.assign({}, job, { id: j, date: '2026-11-28' })]);
ok(lf && e.ok === false && /퇴사/.test(e.msg) && dateOf() === '2026-11-24', '2 제안받은 기사 퇴사일 뒤로는 못 고침 (' + lf + ' · ' + (e.msg || 'ok') + ')');
// 3) 괜찮은 날로는 고쳐지고, 제안받은 기사가 수락하면 확정
e = call('api_pmSave', [T.P, Object.assign({}, job, { id: j, date: '2026-11-23' })]);
ok(e.ok && dateOf() === '2026-11-23', '3 받을 수 있는 날로는 고쳐짐');
ok(call('api_pmOfferReply', [T.B, j, true]).ok, '3b 제안받은 기사 수락 → 확정');
// 4) 날짜를 안 바꾸면(물량만) 그대로 고쳐짐 · 공개 일감은 예전처럼
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-27' })]);
e = call('api_pmSave', [T.P, Object.assign({}, job, { id: r.id, date: '2026-11-25', qty: '300' })]);
ok(e.ok, '4 공개 일감은 날짜를 바꿔도 예전처럼');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
