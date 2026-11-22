// (S142) 품앗이: 퇴사 처리된 기사는 퇴사일 다음 날부터의 일감에 지원 · 제안 · 확정 안 됨, 일할 기사 목록에서도 그 날짜는 뺌
//  사용: node sbtest/ts137.js <runner-allinone 폴더>
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
ev("appSetPut_('pmExtOn', 'ON', ''); 1"); // (S164) 이 시험은 지원 → 맡긴 기사가 확정하는 흐름(외부용) · 내부용은 선착순 자동 배차 (ts164)
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '1234567890' }); }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const job = { kind: '야간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 1100, pay: '러너 정산서', okLow: true };
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
// 기사C: 11/25 퇴사 (근무상태 퇴사) → 11/26 부터 못 맡음
let r0 = call('api_pmAvailSave', [T.C, [{ date: '2026-11-25', kind: '야간' }, { date: '2026-11-27', kind: '야간' }], '', {}]);
ev("(function(){var o=driverById_('" + D.C + "');writeFields_(SH.DRIVERS,o._row,{workStatus:'퇴사',leaveDate:'2026-11-25'});forgetDriver_(o);})(); 1");
let r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-26' })]); const j1 = r.id;
r = call('api_pmApply', [T.C, j1, '']);
ok(!r.ok && /퇴사/.test(r.msg), '1 퇴사일 다음 날 일감 지원 막음 (' + (r.ok ? '지원됨' : r.msg) + ')');
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-25' })]); const j0 = r.id;
r = call('api_pmApply', [T.C, j0, '']);
ok(r.ok, '1b 퇴사일 당일까지는 지원 가능 (' + (r.ok ? '됨' : r.msg) + ')');
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-27', offerToId: D.C })]);
ok(!r.ok && /퇴사/.test(r.msg), '2 퇴사일 뒤 날짜로 제안 막음 (' + (r.ok ? '보냄' : r.msg) + ')');
r = call('adm_pmCreate', [tok, Object.assign({}, job, { date: '2026-11-27', posterId: D.P, mode: 'confirm', toId: D.C })]);
ok(!r.ok && /퇴사/.test(r.msg), '3 사무실 바로 확정도 막음 (' + (r.ok ? '확정됨' : r.msg) + ')');
const av = call('api_pmAvailList', [T.B]).drivers.filter((x) => x.id === D.C).map((x) => x.dates.map((d) => d.date).join(',')).join();
ok(av === '2026-11-25', '4 일할 기사 목록에서 퇴사일 뒤 날짜는 빠짐 (' + av + ')');
// 5) 확정 뒤에 퇴사 처리 → 사무실 홈 할 일
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-28' })]); const j5 = r.id;
call('api_pmApply', [T.B, j5, '']); call('api_pmDecide', [T.P, j5, call('api_pmJob', [T.P, j5]).job.apps[0].id, 'accept']);
ev("(function(){var o=driverById_('" + D.B + "');writeFields_(SH.DRIVERS,o._row,{workStatus:'퇴사',leaveDate:'2026-11-26'});forgetDriver_(o);})(); 1");
const hm = JSON.stringify(call('adm_home', [tok, true]));
ok(/퇴사 처리된 기사가 맡은 품앗이/.test(hm) && /11\/28 기사B/.test(hm), '5 확정 뒤 퇴사 처리 → 사무실 홈 할 일');
// 6) 너무 높은 단가는 먼저 확인
call('adm_priceSave', [tok, CAMP, [{ num: '212', level: 2, value: 'A', p1: 1000, p2: 800, p3: 850, p4: 1100, p5: 1200 }]]);
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-29', price: 11000, okLow: false })]);
ok(!r.ok && r.code === 'LOW' && /두 배/.test(r.msg), '6 평소 단가 두 배 넘는 단가는 확인 (' + (r.ok ? '올라감' : r.msg.split('\n')[0]) + ')');
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-29', price: 1100, okLow: false })]);
ok(r.ok, '6b 보통 단가는 그대로 (' + (r.ok ? '올라감' : r.msg) + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
