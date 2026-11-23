// (S138) 품앗이: 제안 일감에 살아 있는 지원이 없어지면(제안 기사 미선정 · 지원 취소) 모집 마감 → [다시 모집]으로 공개
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
const st = (id) => J("readAll_(SH.PJOB).filter(function(o){return o.id==='" + id + "';}).map(function(o){return o.status;})[0]");
// 1) 제안 수락(확정) 전 협의 → 미선정 → 모집 마감
let r = call('api_pmSave', [T.P, Object.assign({}, job, { offerToId: D.B })]); const j1 = r.id;
const a1 = J("readAll_(SH.PAPP).filter(function(o){return o.jobId==='" + j1 + "';}).map(function(o){return o.id;})")[0];
call('api_pmDecide', [T.P, j1, a1, 'reject']);
ok(st(j1) === '모집 마감', '1 제안 기사 미선정 → 모집 마감 (' + st(j1) + ')');
// 2) 사무실 제안 → 기사가 수락 못 하고 관리자 협의 중 → 기사가 지원 취소 → 모집 마감
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-26', offerToId: D.C })]); const j2 = r.id;
const a2 = J("readAll_(SH.PAPP).filter(function(o){return o.jobId==='" + j2 + "';}).map(function(o){return o.id;})")[0];
call('adm_pmAction', [tok, j2, 'talk', a2]); call('api_pmCancelApply', [T.C, j2]);
ok(st(j2) === '모집 마감', '2 제안 기사 지원 취소 → 모집 마감 (' + st(j2) + ')');
call('api_pmClose', [T.P, j2, 'reopen']);
ok(call('api_pmList', [T.B, {}]).jobs.some((x) => x.id === j2), '2b [다시 모집] 하면 모두에게 보임');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
