// (S134) 노선 이관 취소 때 스케줄 칸 · 같이 바꾼 예약 되돌리기, 쿠팡 캠프코드 겹침 막기,
//  예약 뒤 캠프 이름을 바꿔도 적용 때 기사 소속캠프는 지금 이름, 이관 때 기사 노선 글자도 새 캠프에 만들기
//  사용: TZ=UTC node sbtest/ts134.js <runner-allinone 폴더>
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
let NOW = Date.parse('2026-11-21T10:00:00+09:00'); KDate.__setClock(() => NOW);
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
['서초1캠프', 'F_삼성1캠프', '군포1캠프', '인천7캠프'].forEach((n) => call('adm_campSave', [tok, { name: n, rot: 'D1,D2' }]));
const C = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { C[c.name] = c.id; });
['404ABCD', '410AB'].forEach((code) => call('adm_routeSave', [tok, { campId: C['서초1캠프'], code }]));
call('adm_routeSave', [tok, { campId: C['군포1캠프'], code: '300D' }]);
call('adm_routeSave', [tok, { campId: C['인천7캠프'], code: '501A' }]);
const mk = (name, type, camp, base) => call('adm_createDriver', [tok, { name, loginId: name + 'x1', driverType: type, phone: '010-2000-' + String(1000 + name.length * 37 + base.length).slice(-4), schCampId: C[camp], baseRoute: base }]);
mk('고정가', '고정', '서초1캠프', '404ABC'); mk('백업나', '백업', '서초1캠프', '백업'); mk('고정다', '고정', '서초1캠프', '410AB'); mk('고정라', '고정', '군포1캠프', '300D'); mk('고정마', '고정', '인천7캠프', '501A');
const DR = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { DR[d.name] = d.id; });
const D0 = '2026-11-25', D1 = '2026-11-26';
call('adm_schSave', [tok, [[D0, '404ABC'], [D1, '410AB']].map(([d, v]) => ({ row: DR['백업나'], date: d, value: v, old: '' }))]);
// 고정다: 12/1 부터 서초1 404D 로 가는 예약 → 같은 날 404 이관이 그 예약도 바꾼다
let x = call('adm_rcSave', [tok, { driverId: DR['고정다'], date: D0, toCampId: C['서초1캠프'], toRoute: '404D' }]); if (!x.ok) console.log('예약', x.msg);
const mv = call('adm_rcMove', [tok, { fromCampId: C['서초1캠프'], fromNum: '404', toCampId: C['F_삼성1캠프'], toNum: '204', date: D0, backups: [DR['백업나']] }, false]);
const cellsOf = () => { const s = call('adm_schRange', [tok, D0, D1]).cells[DR['백업나']]; return [s[D0], s[D1]].join(' | '); };
const rcOf = (n) => J("rcRows_(true).filter(function(c){return c.driverId===" + JSON.stringify(DR[n]) + " && c.status===RCS.WAIT;}).map(function(c){return c.toCamp+' '+c.toRoute;})").join();
console.log('  이관 뒤 백업나 칸', cellsOf(), '· 고정다 예약', rcOf('고정다'));
x = call('adm_rcCancel', [tok, mv.moveId]);
ok(cellsOf() === '404ABC | 410AB', '1 이관 취소 뒤 스케줄 칸 되돌림 (' + cellsOf() + ')');
ok(/서초1캠프 404D/.test(rcOf('고정다')), '2 이관이 같이 바꾼 예약도 되돌림 (' + rcOf('고정다') + ')');
// 3) 쿠팡 캠프코드 겹침
x = call('adm_campSave', [tok, { id: C['서초1캠프'], name: '서초1캠프', cpCode: 'SCH_1' }]); if (!x.ok) console.log('코드', x.msg);
x = call('adm_campSave', [tok, { id: C['군포1캠프'], name: '군포1캠프', cpCode: 'sch_1' }]);
ok(!x.ok && /SCH_1/.test(x.msg), '3 다른 캠프와 같은 쿠팡 캠프코드 막음 (' + (x.ok ? '저장됨' : x.msg) + ')');
// 4) 예약 뒤 캠프 이름 바꾸기 → 적용 때 기사 소속캠프는 지금 이름
x = call('adm_rcSave', [tok, { driverId: DR['고정마'], date: D0, toCampId: C['서초1캠프'], toRoute: '410A' }]); if (!x.ok) console.log('예약2', x.msg);
x = call('adm_campSave', [tok, { id: C['서초1캠프'], name: '서초2캠프', cpCode: 'SCH_1' }]); if (!x.ok) console.log('이름', x.msg);
NOW = Date.parse('2026-11-25T10:00:00+09:00');
call('adm_rcList', [tok]);
const dm = J("(function(){var d=driverById_(" + JSON.stringify(DR['고정마']) + ");return [d.schCamp,d.baseRoute];})()");
ok(dm[0] === '서초2캠프' && dm[1] === '410A', '4 적용 때 소속캠프 이름은 지금 이름 (' + dm.join(' ') + ')');
// 5) 이관: 옛 캠프 노선은 300D 뿐인데 기사 기본노선이 300CD → 새 캠프에 777C 도 만든다
ev("(function(){var d=driverById_(" + JSON.stringify(DR['고정라']) + ");writeFields_(SH.DRIVERS,d._row,{baseRoute:'300CD'});forgetDriver_(d);})(); 1");
x = call('adm_rcMove', [tok, { fromCampId: C['군포1캠프'], fromNum: '300', toCampId: C['인천7캠프'], toNum: '777', date: '2026-12-01' }, false]);
const codes = call('adm_routeAll', [tok]).routes.filter((r) => r.campId === C['인천7캠프']).map((r) => r.code);
ok(codes.some((c) => /^777[A-Z]*C/.test(c)), '5 이관 때 기사 노선 글자(C)도 새 캠프에 만듦 (' + codes.join(',') + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
