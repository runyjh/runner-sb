// (S190) 품앗이 일감 주기: 기본노선이 여러 개(204D,205AB)면 '출근' 날도 코드 전부 · 지워진 일감 알림은 열지 않음
//  사용: node sbtest/ts190.js <runner-allinone 폴더>
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
call('adm_createDriver', [tok, { name: '김도윤', loginId: 'kdy01', driverType: '백업', phone: '010-4300-1010', schCampId: C1, baseRoute: '204D,205AB' }]);
call('adm_createDriver', [tok, { name: '기사X', loginId: 'kx01', driverType: '고정', phone: '010-4300-1011', schCampId: C1, baseRoute: '204D' }]);
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name] = d.id; });
const T = ev("createSession_('" + D['김도윤'] + "', true).token"), TX = ev("createSession_('" + D['기사X'] + "', true).token");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-27', value: '출근', old: '' }, { row: D['김도윤'], date: '2026-11-28', value: '204D,205AB', old: '' }]]);
const Q = call('api_pmQuick', [T]);
const day = (d) => ((Q.days || []).find((x) => x.date === d) || { codes: [] }).codes.map((c) => c.code).join(',');
ok(day('2026-11-27') === '204D,205A,205B', '1 「출근」 날도 기본노선 코드 전부 (' + day('2026-11-27') + ')');
ok(day('2026-11-28') === '204D,205A,205B', '2 칸에 노선을 적은 날도 전부 (' + day('2026-11-28') + ')');
// 지워진 일감 알림
const gv = call('api_pmGive', [T, { date: '2026-11-28' }]), ids = gv.ids || [];
ok(gv.ok && gv.route === '204D,205AB', '2b (S205) 두 번호 노선도 통째로 1건 (' + (gv.route || gv.msg) + ')');
call('adm_schSave', [tok, [{ row: D['기사X'], date: '2026-11-28', value: '휴무', old: '' }]]);
call('api_pmApplyMany', [TX, ids, '']);
const before = (call('api_pmAlerts', [T, '']).alerts || []).filter((a) => a.jobId === ids[0]);
call('adm_pmDelete', [tok, ids]);
KDate.__setClock(() => Date.parse('2026-11-24T11:05:00+09:00')); // 시험 시계가 멈춰 있어 알림 버전이 같은 값으로 올라가지 않게
ev("readAll_(SH.PALERT).forEach(function (o) { }); pmAlertBump_ && pmAlertBump_('" + D['김도윤'] + "'); 1");
const after = (call('api_pmAlerts', [T, '']).alerts || []).filter((a) => a.jobId === ids[0]);
ok(before.length && !before[0].gone && after.length && after.every((a) => a.gone), '3 지워진 일감 알림은 gone (전 ' + before.length + ' · 뒤 ' + after.map((a) => a.gone).join(',') + ')');
const H = require('fs').readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/a\.gone \? '' : a\.jobId/.test(H) && /\(지워진 일감\)/.test(H), '4 기사앱: 지워진 일감 알림은 눌러도 안 열림 · 표시');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
