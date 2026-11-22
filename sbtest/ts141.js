// (S141) 품앗이: 자격증 번호 없는 기사에게 제안 · 그 기사의 제안 수락 막기 (지원과 같은 규칙), 받은 제안은 하루 지원 2번에 안 셈
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
ev("appSetPut_('pmExtOn', 'ON', ''); 1"); // (S165) 자격증 조건은 외부용만 (내부용은 러너 인원 누구나 · ts165)
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
const noQual = (k) => ev("(function(){var o=driverById_('" + D[k] + "');writeFields_(SH.DRIVERS,o._row,{qualNo:''});forgetDriver_(o);})(); 1");
// 1) 받은 제안 2건이 있어도 같은 날 지원 가능
call('api_pmSave', [T.P, Object.assign({}, job, { offerToId: D.C })]); call('api_pmSave', [T.B, Object.assign({}, job, { offerToId: D.C })]);
let r = call('api_pmSave', [T.P, Object.assign({}, job)]); const pub = r.id;
r = call('api_pmApply', [T.C, pub, '']);
ok(r.ok, '1 받은 제안 2건이 있어도 같은 날 지원 가능 (' + (r.ok ? '됨' : r.msg) + ')');
// 2) 자격증 없는 기사에게 제안 막기
noQual('B');
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-26', offerToId: D.B })]);
ok(!r.ok && /자격증/.test(r.msg), '2 자격증 없는 기사에게 제안 막음 (' + (r.ok ? '보냄' : r.msg.slice(0, 30)) + ')');
// 3) 제안 받은 뒤 자격증이 지워진 기사 → 수락 막기
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-27', offerToId: D.C })]); const j3 = r.id;
noQual('C');
r = call('api_pmOfferReply', [T.C, j3, true]);
ok(!r.ok && /자격증/.test(r.msg), '3 자격증 없는 기사의 제안 수락 막음 (' + (r.ok ? '확정' : r.msg.slice(0, 30)) + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
