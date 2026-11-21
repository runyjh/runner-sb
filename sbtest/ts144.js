// (S144) 품앗이: 미선정된 기사가 다시 지원하면 지원 줄을 새로 만들지 않고 그 줄을 다시 씀 · 구분 기본값(주간) 되돌림
//  사용: node sbtest/ts144.js <runner-allinone 폴더>
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
const rows = (id, d) => J("readAll_(SH.PAPP).filter(function(a){return a.jobId==='" + id + "' && a.driverId==='" + d + "';}).map(function(a){return a.status;})");
// 1) 미선정 → 다시 지원: 한 줄 · 카드 '지원' · 맡긴 기사 화면에 한 번
let r = call('api_pmSave', [T.P, job]); const j1 = r.id;
call('api_pmApply', [T.B, j1, '']);
const a1 = J("readAll_(SH.PAPP).filter(function(a){return a.jobId==='" + j1 + "';})[0].id");
call('api_pmDecide', [T.P, j1, a1, 'reject']);
r = call('api_pmApply', [T.B, j1, '다시 부탁드려요']);
ok(r.ok && JSON.stringify(rows(j1, D.B)) === '["지원"]', '1 다시 지원하면 지원 줄 한 줄 (' + JSON.stringify(rows(j1, D.B)) + ')');
const card = call('api_pmList', [T.B, {}]).jobs.filter((x) => x.id === j1)[0];
ok(card && card.myApp === '지원', '1b 내 카드에 지원으로 보임 (' + (card && card.myApp) + ')');
const pj = call('api_pmJob', [T.P, j1]).job;
ok(pj.apps.length === 1 && pj.apps[0].status === '지원' && pj.apps[0].memo === '다시 부탁드려요', '1c 맡긴 기사 화면에 한 번만 · 새 한마디');
// 2) 확정하면 '확정' 알림만 (예전: 옛 줄을 확정하면 새 줄이 미선정 → '미선정' 알림도 감)
call('api_pmDecide', [T.P, j1, pj.apps[0].id, 'accept']);
const al = J("readAll_(SH.PALERT).filter(function(a){return a.driverId==='" + D.B + "' && a.jobId==='" + j1 + "';}).map(function(a){return a.kind;})");
ok(al.indexOf('accept') >= 0 && al.indexOf('lost') < 0, '2 확정 알림만 (' + al.join(',') + ')');
// 3) 일감 취소 → 다시 모집 → 다시 지원: 한 줄
r = call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-25' })]); const j3 = r.id;
call('api_pmApply', [T.C, j3, '']); call('api_pmClose', [T.P, j3, 'cancel']); call('api_pmClose', [T.P, j3, 'reopen']);
r = call('api_pmApply', [T.C, j3, '']);
ok(r.ok && JSON.stringify(rows(j3, D.C)) === '["지원"]', '3 취소 뒤 다시 모집 → 다시 지원해도 한 줄 (' + JSON.stringify(rows(j3, D.C)) + ')');
// 4) 지원 취소 뒤 다시 지원은 예전처럼 (취소 줄은 남고 새 줄)
call('api_pmCancelApply', [T.C, j3]); r = call('api_pmApply', [T.C, j3, '']);
ok(r.ok && rows(j3, D.C).filter((s) => s !== '지원 취소').length === 1, '4 지원 취소 → 다시 지원: 살아 있는 줄 한 줄');
// 5) 구분 기본값은 그대로 (주간이 먼저 · 대표 11/22: 의도한 것)
const fs = require('fs'); const IX = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), AD = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/pmSetKind\(v\.kind \|\| '주간'\)/.test(IX) && /if \(M\.kinds\.indexOf\(kind\) < 0\) kind = M\.kinds\[0\];/.test(AD), '5 새 일감 구분 기본값 그대로 (기사앱 주간 · 사무실 첫 구분)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
