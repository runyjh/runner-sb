// (S163) 품앗이 내부용(기본): 입차시간 · 배송지 · 물량 없이 올리기 · 지급은 러너 정산서 · 배송은 받는 기사 아이디 · 근무 가능일은 익월 말까지 · 그날 쉬는 기사 · 외부용 켜면 예전대로
//  사용: node sbtest/ts163.js <runner-allinone 폴더>
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
// 내부용 (기본)
let r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-24', campId: CAMP, route: '212A', price: 1100, okLow: true, desc: '' }]);
ok(r.ok === true, '1 내부용: 입차시간 · 배송지 · 물량 없이 올라감 ' + (r.msg || ''));
let j = r.ok ? J("pmJobById_('" + r.id + "')") : {};
ok(j.pay === '러너 정산서' && j.useId === '받는 기사 아이디' && j.area === '군포1캠프' && !j.top, '2 내부용: 지급 러너 정산서 · 받는 기사 아이디 · 배송지 = 캠프 (' + [j.pay, j.useId, j.area].join(' / ') + ')');
r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-25', campId: CAMP, route: '212A', price: 1100, okLow: true, pay: '당일지급', useId: '주는 기사 아이디' }]);
j = r.ok ? J("pmJobById_('" + r.id + "')") : {};
ok(r.ok && j.pay === '러너 정산서' && j.useId === '받는 기사 아이디', '3 내부용: 화면이 다른 지급 · 아이디를 보내도 러너 정산서 · 받는 기사 아이디');
const f = call('api_pmForm', [T.P]);
ok(f.ok && f.ext === false, '4 일감 폼: 내부용 표시 (ext=false)');
// 근무 가능일: 익월 말(12/31)까지
const am = call('api_pmAvailMine', [T.B]);
ok(am.ok && am.until === '2026-12-31' && am.ext === false, '5 근무 가능일: 12/31 까지 (' + am.until + ')');
r = call('api_pmAvailSave', [T.B, [{ date: '2026-12-30', kind: '야간' }, { date: '2027-01-05', kind: '야간' }], '', {}]);
ok(r.ok && r.count === 1, '6 익월 넘는 날(1/5)은 저장 안 됨 (' + r.count + '일)');
// 그날 쉬는 기사
call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-27', value: '휴무', old: '' }, { row: D.B, date: '2026-11-27', value: '212A', old: '' }]]);
r = call('api_pmOffDay', [T.P, '2026-11-27']);
ok(r.ok && r.drivers.length === 1 && r.drivers[0].id === D.C && r.drivers[0].cell === '휴무', '7 그날 쉬는 기사: 휴무인 기사C 만 (' + JSON.stringify((r.drivers || []).map((x) => x.name)) + ')');
r = call('api_pmOffDay', [T.C, '2026-11-27']);
ok(r.ok && r.drivers.length === 0, '8 나는 빼고');
r = call('api_pmOffDay', [T.P, '2027-01-05']);
ok(r.ok && r.drivers.length === 0, '9 익월 넘는 날은 빈 목록');
// 물량 자동 (전월 자료 없으면 빈칸)
r = call('api_pmPrice', [T.P, CAMP, '212A']);
ok(r.ok && r.qty === '', '10 전월 정산서 자료 없으면 물량 빈칸');
const q = ev("myVolMap_ = function () { return { vol: { '군포1|212A': { a: 100 }, '군포1|212B': { a: 120.4 } } }; }; [pmQtyOf_('군포1캠프', '212AB'), pmQtyOf_('군포1캠프', '212A,213A')].join('/')");
ok(q === '약 220개/', '10b 라우트 글자마다 더함 · 모르는 글자가 있으면 빈칸 (' + q + ')');
// 외부용 켜면 예전대로
call('adm_pmPostSet', [tok, true, 'ext']);
r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-26', campId: CAMP, route: '212A', price: 1100, okLow: true }]);
ok(r.ok === false, '11 외부용: 입차시간 등 빠지면 막힘 (' + (r.msg || '') + ')');
const am2 = call('api_pmAvailMine', [T.B]);
ok(am2.until > '2027-01-01', '12 외부용: 근무 가능일 90일 (' + am2.until + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
