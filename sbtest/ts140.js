// (S140) 품앗이: 제안 일을 수락했다가 취소 → 맡긴 기사에게 확정 기사 취소 알림 · 사무실 홈 할 일 (+ S139 확인 같이)
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
let r = call('api_pmSave', [T.P, Object.assign({}, job, { route: '' })]);
ok(!r.ok && /라우트/.test(r.msg), '1 기사: 라우트 없이 올리기 막음 (' + (r.ok ? '올라감' : r.msg.slice(0, 20)) + ')');
r = call('adm_pmCreate', [tok, Object.assign({}, job, { route: '', posterId: D.P, mode: 'open' })]);
ok(!r.ok && /라우트/.test(r.msg), '2 사무실: 라우트 없이 등록 막음 (' + (r.ok ? '등록됨' : r.msg.slice(0, 20)) + ')');
ev("appendObj_(SH.PJOB, { id: 'JX1', status: PST.DONE, posterId: '" + D.P + "', poster: '기사P', acceptedId: '" + D.B + "', accepted: '기사B', kind: '야간', date: '2026-11-24', camp: '군포1캠프', route: '', area: '군포', createdAt: nowText_() }); pmTouch_(); 1");
const sk = J("(function(){ var m = stlMonthOfDate_('2026-11-24'); var a = stlPmAuto_(m, { byId: {} }, { by: {}, groups: {} }, []); return a.skip || null; })()");
ok(Array.isArray(sk) && sk.length === 1 && /라우트 없음/.test(sk[0]), '3 확정인데 라우트 없는 일감 → 정산 경고 목록 (' + JSON.stringify(sk) + ')');
// 4) 지원 → 취소 → 다시 지원: 지원한 품앗이에 한 장만
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-27' })]); const j4 = r.id;
call('api_pmApply', [T.B, j4, '']); call('api_pmCancelApply', [T.B, j4]); call('api_pmApply', [T.B, j4, '']);
const mine = call('api_pmMine', [T.B, 'applied']).jobs.filter((x) => x.id === j4);
ok(mine.length === 1 && mine[0].myApp === '지원', '4 지원한 품앗이에 같은 일감 한 장 (' + mine.map((x) => x.myApp).join(',') + ')');
// 5) 같은 날 같은 노선 야간 · 주간 두 건 확정 → 하나 취소해도 품앗이 칸 글자는 남음
const mk = (kind) => { const x = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-28', kind })]); call('api_pmApply', [T.B, x.id, '']); call('api_pmDecide', [T.P, x.id, call('api_pmJob', [T.P, x.id]).job.apps[0].id, 'accept']); return x.id; };
const n1 = mk('야간'), n2 = mk('주간');
call('api_pmClose', [T.P, n1, 'cancel']);
const pc = J("schCellsOf_('PM" + D.B + "', ['2026-11-28'])")['2026-11-28'] || '';
ok(/212A/.test(pc), '5 남은 확정 품앗이 글자는 칸에 그대로 (' + JSON.stringify(pc) + ')');
// 6) 제안 일을 수락했다가 취소 → 맡긴 기사에게 '확정 기사 취소' 알림 · 사무실 홈 할 일에 보임
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-23', offerToId: D.C })]); const j6 = r.id;
call('api_pmOfferReply', [T.C, j6, true]); call('api_pmCancelApply', [T.C, j6]);
const k6 = J("readAll_(SH.PALERT).filter(function(o){return o.jobId==='" + j6 + "' && o.driverId==='" + D.P + "';}).map(function(o){return o.kind;})");
const hm = call('adm_home', [tok, true]);
const td = JSON.stringify(hm).match(/확정 기사가 취소한 품앗이[^"]*"[^}]*/);
ok(k6.indexOf('offerCancel') >= 0 && /11\/23/.test(JSON.stringify(hm)), '6 제안 수락 뒤 취소 → 맡긴 기사 알림 · 사무실 할 일 (' + k6.join() + ' · 홈 ' + (td ? td[0].slice(0, 80) : '없음') + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
