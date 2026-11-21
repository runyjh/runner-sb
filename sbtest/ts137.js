// (S137) 품앗이: 제안 수락 뒤 취소 · 거절 뒤 숨은 일감 [다시 모집]으로 공개, 고칠 때 지난 날짜 막기, 같은 날 확정 있으면 제안 그대로, 확정 기사 취소 때 미선정 기사 되살림
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
const job = { kind: '야간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 1100, pay: '러너 정산서', okLow: true };

let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const seeC = (id) => call('api_pmList', [T.C, {}]).jobs.some((x) => x.id === id);
const st = (id) => J("readAll_(SH.PJOB).filter(function(o){return o.id==='" + id + "';}).map(function(o){return o.status;})[0]");
// 1) 제안 수락 → 취소 → 모집 마감 → 다시 모집하면 공개
let r = call('api_pmSave', [T.P, Object.assign({}, job, { offerToId: D.B })]); const j1 = r.id;
call('api_pmOfferReply', [T.B, j1, true]); call('api_pmCancelApply', [T.B, j1]);
ok(st(j1) === '모집 마감', '1 제안 수락 뒤 취소 → 모집 마감 (' + st(j1) + ')');
call('api_pmClose', [T.P, j1, 'reopen']);
ok(seeC(j1), '1b [다시 모집] 하면 다른 기사에게 보임');
// 2) 제안 받은 기사를 거절(미선정) → 모집 중이어도 [다시 모집]으로 공개
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-25', offerToId: D.B })]); const j2 = r.id;
call('api_pmOfferReply', [T.B, j2, true]);
const ap2 = call('api_pmJob', [T.P, j2]).job.apps[0].id; call('api_pmDecide', [T.P, j2, ap2, 'reject']);
r = call('api_pmClose', [T.P, j2, 'reopen']);
ok(seeC(j2), '2 거절해 숨은 제안 일감도 [다시 모집]으로 공개 (' + st(j2) + ')');
// 3) 고칠 때 지난 날짜 막기
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-26' })]); const j3 = r.id;
r = call('api_pmSave', [T.P, Object.assign({}, job, { id: j3, date: '2026-11-01' })]);
ok(!r.ok && /지난 날짜/.test(r.msg), '3 고칠 때 지난 날짜 막음 (' + (r.ok ? '바뀜' : r.msg) + ')');
// 4) 같은 날 확정이 있는 기사의 제안 수락 → 막고 제안은 그대로
r = call('api_pmSave', [T.B, Object.assign({}, job, { date: '2026-11-28', offerToId: D.C })]); const j4 = r.id;
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-28' })]); const j5 = r.id;
call('api_pmApply', [T.C, j5, '']); call('api_pmDecide', [T.P, j5, call('api_pmJob', [T.P, j5]).job.apps[0].id, 'accept']);
r = call('api_pmOfferReply', [T.C, j4, true]);
const s4 = J("readAll_(SH.PAPP).filter(function(o){return o.jobId==='" + j4 + "';}).map(function(o){return o.status;})");
ok(!r.ok && s4.join() === '제안', '4 막고 제안은 그대로 (' + s4.join() + ')');
// 5) 확정 기사가 취소 → 미선정 기사는 지원으로 · 다시 모집 알림
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-29' })]); const j6 = r.id;
call('api_pmApply', [T.B, j6, '']); call('api_pmApply', [T.C, j6, '']);
const ap6 = call('api_pmJob', [T.P, j6]).job.apps; call('api_pmDecide', [T.P, j6, ap6.find((x) => x.name === '기사B').id, 'accept']);
call('api_pmCancelApply', [T.B, j6]);
const c6 = J("readAll_(SH.PAPP).filter(function(o){return o.jobId==='" + j6 + "' && o.driverId==='" + D.C + "';}).map(function(o){return o.status;})")[0];
const al6 = J("readAll_(SH.PALERT).filter(function(o){return o.driverId==='" + D.C + "' && o.jobId==='" + j6 + "';}).map(function(o){return o.kind;})");
ok(c6 === '지원' && al6.indexOf('reopen') >= 0, '5 확정 기사 취소 → 미선정 기사 되살림 · 알림 (' + c6 + ' · ' + al6.join() + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
