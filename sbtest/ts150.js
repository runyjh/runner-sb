// (S150) 속도 기록(perf_log): 최근 하루치만 남기고 지난 줄은 날짜별 합계(perf_daily)로 남긴 뒤 지움 · 하루 안이라도 8천 줄 넘으면 오래된 것부터
//  사용: node sbtest/ts150.js <runner-allinone 폴더>
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
const cnt = (sh) => J("readAll_(SH." + sh + ").length");
// 하루 지난 줄 3,000 (11/20) + 최근 줄 1,000 (오늘)
ev("(function(){ var a=[]; for (var i=0;i<3000;i++) a.push({ at: '2026-11-20 0' + (i%10) + ':00:00', app: '기사앱', view: 'home', fn: 'api_notices', n: 2, rt: 300, rtMax: 200, srv: 50, who: '', upd: '' }); for (var j=0;j<1000;j++) a.push({ at: nowText_(), app: '관리자앱', view: 'home', fn: 'adm_home', n: 1, rt: 100, rtMax: 100, srv: 10, who: '', upd: '' }); appendObjs_(SH.PERF, a); })(); 1");
ok(cnt('PERF') === 4000, '0 시험 자료 4,000줄');
let r = call('adm_perf', [tok, [{ v: 'home', f: 'adm_home', n: 1, rt: 120, mx: 120, sv: 10, u: '' }], false, 'b1', []]);
ok(r.ok && cnt('PERF') === 1001, '1 하루 지난 3,000줄은 지우고 최근 1,000줄 + 새 1줄만 남음 (' + cnt('PERF') + ')');
const pd = J("readAll_(SH.PDAY).filter(function(o){return o.day==='2026-11-20' && o.fn==='api_notices';}).map(function(o){return [+o.n, +o.rt, +o.rtMax];})");
ok(pd.length === 1 && pd[0][0] === 6000 && pd[0][1] === 900000 && pd[0][2] === 200, '2 지운 줄은 날짜별 합계(perf_daily)로 남음 (' + JSON.stringify(pd) + ')');
// 하루 안이라도 8천 줄이 넘으면 오래된 것부터 (10분 뒤)
ev("(function(){ var a=[]; for (var i=0;i<8500;i++) a.push({ at: nowText_(), app: '기사앱', view: 'home', fn: 'api_pmAlerts', n: 1, rt: 80, rtMax: 80, srv: 5, who: '', upd: '' }); appendObjs_(SH.PERF, a); })(); 1");
r = call('adm_perf', [tok, [{ v: 'home', f: 'adm_home', n: 1, rt: 120, mx: 120, sv: 10, u: '' }], false, 'b2', []]);
ok(r.ok && cnt('PERF') === 9502, '3 10분 안에는 다시 살피지 않음 (' + cnt('PERF') + ')');
ev("cache_().remove('pf:trim'); 1");
r = call('adm_perf', [tok, [{ v: 'home', f: 'adm_home', n: 1, rt: 120, mx: 120, sv: 10, u: '' }], false, 'b3', []]);
ok(r.ok && cnt('PERF') === 8001, '4 8천 줄 넘으면 오래된 것부터 지워 8천 줄 + 새 줄 (' + cnt('PERF') + ')');
// 3천 줄 이하면 그대로
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
