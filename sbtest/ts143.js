// (S143) 품앗이: 사무실 일감 자동 확정 때 첫 지원자가 안 되면 다음 지원자로 (구분 기본값은 그대로 · S144)
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
// B 는 11/24 에 이미 확정된 품앗이가 있음
let r = call('api_pmSave', [T.P, Object.assign({}, job)]); call('api_pmApply', [T.B, r.id, '']); call('api_pmDecide', [T.P, r.id, call('api_pmJob', [T.P, r.id]).job.apps[0].id, 'accept']);
// 사무실 일감(같은 날) 에 B · C 의 손대지 않은 지원이 시트에 남아 있음 (B 가 먼저)
ev("appendObj_(SH.PJOB, { id: 'JO1', status: PST.OPEN, posterId: '" + D.P + "', poster: '기사P', kind: '야간', date: '2026-11-24', camp: '군포1캠프', campId: '" + CAMP + "', route: '212B', area: '군포', byOffice: '대표', createdAt: nowText_() });" +
  "appendObj_(SH.PAPP, { id: 'AO1', jobId: 'JO1', driverId: '" + D.B + "', name: '기사B', date: '2026-11-24', status: PAST.APPLY, createdAt: '2026-11-21 09:00:00', updatedAt: '2026-11-21 09:00:00' });" +
  "appendObj_(SH.PAPP, { id: 'AO2', jobId: 'JO1', driverId: '" + D.C + "', name: '기사C', date: '2026-11-24', status: PAST.APPLY, createdAt: '2026-11-21 09:01:00', updatedAt: '2026-11-21 09:01:00' }); pmTouch_(); 1");
call('adm_pmList', [tok, {}]);
const st = J("readAll_(SH.PJOB).filter(function(o){return o.id==='JO1';}).map(function(o){return o.status+' '+o.accepted;})[0]");
ok(st === '배차 확정 기사C', '1 첫 지원자가 안 되면 다음 지원자로 자동 확정 (' + st + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
