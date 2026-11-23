// (S164) 품앗이 내부용 선착순 자동 배차: 먼저 [맡을게요] 누른 기사로 바로 확정 · 다음 기사는 막힘 · 맡긴 기사에게 알림 · 외부용은 예전처럼 지원만
//  사용: node sbtest/ts164.js <runner-allinone 폴더>
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


let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
let r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-24', campId: CAMP, route: '212A', price: 1100, okLow: true }]);
const id1 = r.id;
// (S176) 선착순 자동 배차는 없앰 → 지원만 되고 맡긴 기사가 고름 (이 시험은 S164 선착순을 새 규칙으로 바꿔 확인)
r = call('api_pmApply', [T.B, id1, '']);
ok(r.ok && !r.confirmed, '1 내부용: 지원만 됨 (선착순 바로 확정 없음)');
let j = J("pmJobById_('" + id1 + "')");
ok(j.status === '모집 중', '2 일감 상태 모집 중 그대로 (' + j.status + ')');
r = call('api_pmApply', [T.C, id1, '']);
ok(r.ok, '3 다른 기사C 도 지원 가능');
const ap = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + id1 + "' && a.driverId === '" + D.C + "'; })[0].id");
r = call('api_pmPick', [T.P, [ap]]);
j = J("pmJobById_('" + id1 + "')");
ok(r.ok && j.status === '배차 확정' && j.acceptedId === D.C, '4 맡긴 기사P 가 C 를 골라 확정');
const pm = call('api_pmMine', [T.B, 'applied']);
ok(pm.ok, '5 기사B 내 품앗이 목록 열림');
// 외부용: 예전처럼 지원만
call('adm_pmPostSet', [tok, true, 'ext']);
r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-25', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 1100, pay: '러너 정산서', okLow: true }]);
const id2 = r.id;
r = call('api_pmApply', [T.C, id2, '']);
j = J("pmJobById_('" + id2 + "')");
ok(r.ok && !r.confirmed && j.status === '모집 중', '6 외부용: 지원만 되고 확정은 맡긴 기사가 (' + j.status + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
