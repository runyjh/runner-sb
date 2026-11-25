// (S210) 쉬는 날 올리면 그날 일하는 기사 · 사무실에 알림 · 일감 주기에서 그 기사를 맨 위에
//  사용: node sbtest/ts210.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-24T11:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '삼성1캠프' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['204D', '205A', '205B'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
call('adm_createDriver', [tok, { name: '쉬는A', loginId: 'ra01', driverType: '백업', phone: '010-4300-1010', schCampId: C1, baseRoute: '204D' }]);
call('adm_createDriver', [tok, { name: '일하는B', loginId: 'wb01', driverType: '고정', phone: '010-4300-1011', schCampId: C1, baseRoute: '205AB' }]);
call('adm_createDriver', [tok, { name: '쉬는C', loginId: 'rc01', driverType: '고정', phone: '010-4300-1012', schCampId: C1, baseRoute: '204D' }]);
call('adm_createDriver', [tok, { name: '실장', loginId: 'boss01', driverType: '고정', phone: '010-4300-1019', schCampId: C1, baseRoute: '' }]);
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '12345678', title: o.name === '실장' ? '운영자' : '' }); }); 1");
const TK = (n) => ev("createSession_('" + D[n] + "', true).token");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const AL = (n) => J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D[n] + "' && a.kind === 'avail'; }).map(function (a) { return a.jobId + '|' + a.text; })");
call('adm_schSave', [tok, [{ row: D['쉬는A'], date: '2026-11-27', value: '휴무', old: '' }, { row: D['일하는B'], date: '2026-11-27', value: '205AB', old: '' }, { row: D['쉬는C'], date: '2026-11-27', value: '휴무', old: '' },
  { row: D['쉬는A'], date: '2026-11-28', value: '휴무', old: '' }, { row: D['일하는B'], date: '2026-11-28', value: '휴무', old: '' }, { row: D['쉬는C'], date: '2026-11-28', value: '휴무', old: '' }]]);
let r = call('api_pmAvailSave', [TK('쉬는A'), [{ date: '2026-11-27' }, { date: '2026-11-28' }], '하이탑 있음']);
ok(r.ok && r.count === 2, '0 쉬는 날 2일 올림 ' + (r.msg || ''));
const b = AL('일하는B'), c = AL('쉬는C'), s = AL('실장');
ok(b.length === 1 && /^AV-2026-11-27\|/.test(b[0]) && /쉬는A 기사님이 11\/27\(금\) 품앗이 일할 수 있다고/.test(b[0]) && !/11\/28/.test(b[0]), '1 그날 일하는 기사(B)에게 그 날만 알림 (' + (b[0] || '') + ')');
ok(!c.length, '2 그날 쉬는 기사(C)에게는 안 감');
ok(s.length === 1 && /11\/27\(금\) · 11\/28\(토\)/.test(s[0]), '3 사무실(관리자 직함)에는 두 날 모두 한 건 (' + (s[0] || '') + ')');
ok(!AL('쉬는A').length, '4 올린 본인에게는 안 감');
r = call('api_pmAvailSave', [TK('쉬는A'), [{ date: '2026-11-27' }, { date: '2026-11-28' }], '하이탑 있음']);
ok(AL('일하는B').length === 1 && AL('실장').length === 1, '5 같은 날을 다시 저장하면 알림 다시 안 감');
const IX = require('fs').readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/<div id="pfAvTop" class="hidden"><\/div>/.test(IX) && /🙋 이 날 일하고 싶다고 올린 기사 ' \+ av\.length \+ '명/.test(IX) && /그 밖에 그날 휴무인 기사 ' \+ rest \+ '명/.test(IX), '6 일감 주기: 올린 기사는 맨 위에 이름 · 한마디 · 나머지는 인원만');
ok(/String\(id\)\.indexOf\('AV-'\) === 0\) return openPmForm\('', 'tabs', null, null, String\(id\)\.slice\(3\)\)/.test(IX), '7 알림 누르면 일감 주기 그 날짜로');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '8 기사앱 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
