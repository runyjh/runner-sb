// (S206) 품앗이 임박 · 지원자 없음 → 맡긴 기사 + 사무실(관리자 직함) 알림 · 관리자 목록 「지원자 없음」
//  사용: node sbtest/ts206.js <runner-allinone 폴더>
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
call('adm_createDriver', [tok, { name: '김도윤', loginId: 'kdy01', driverType: '고정', phone: '010-4300-1010', schCampId: C1, baseRoute: '204D' }]);
call('adm_createDriver', [tok, { name: '기사X', loginId: 'kx01', driverType: '고정', phone: '010-4300-1011', schCampId: C1, baseRoute: '205AB' }]);
call('adm_createDriver', [tok, { name: '실장', loginId: 'boss01', driverType: '고정', phone: '010-4300-1019', schCampId: C1, baseRoute: '' }]);
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name] = d.id; });
ev("writeFields_(SH.DRIVERS, findRow_(SH.DRIVERS, 'id', '" + D['실장'] + "'), { title: '운영자' }); 1");
const TK = (n) => ev("createSession_('" + D[n] + "', true).token");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const AL = (n, k) => J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D[n] + "' && a.kind === '" + k + "'; }).map(function (a) { return a.text; })");
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-26', value: '204D', old: '' }, { row: D['기사X'], date: '2026-11-26', value: '205AB', old: '' }, { row: D['김도윤'], date: '2026-11-25', value: '204D', old: '' }]]);
const j1 = call('api_pmGive', [TK('김도윤'), { date: '2026-11-26' }]).ids[0];
const j2 = call('api_pmGive', [TK('기사X'), { date: '2026-11-26' }]).ids[0];
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-26', value: '휴무', old: '' }]]);
call('api_pmApplyMany', [TK('김도윤'), [j2], '']); // 기사X 일감에는 신청자 있음
// 저녁 18시: 내일 밤 입차(11/26) 일감
KDate.__setClock(() => Date.parse('2026-11-24T18:00:00+09:00'));
const n = J("pmRemind_('tomorrow')");
const a1 = AL('김도윤', 'nobody'), s1 = AL('실장', 'nobody');
ok(a1.length === 1 && /204D/.test(a1[0]) && /내일 밤 입차/.test(a1[0]) && /사무실에도/.test(a1[0]), '1 맡긴 기사에게 「아직 아무도 안 맡음」 (' + (a1[0] || '') + ')');
ok(s1.length === 1 && /김도윤 기사님 일감에 신청한 기사가 없습니다/.test(s1[0]), '2 사무실(관리자 직함)에도 알림 (' + (s1[0] || '') + ')');
ok(!AL('기사X', 'nobody').length && AL('기사X', 'remind').length === 1, '3 신청자 있는 일감은 「골라 주세요」만 (지원자 없음 알림 아님)');
const L = call('adm_pmList', [tok, {}]).jobs || [];
ok((L.find((j) => j.id === j1) || {}).nobody === true && (L.find((j) => j.id === j2) || {}).nobody === false, '4 관리자 품앗이 목록에 「지원자 없음」 표시');
const A = require('fs').readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/j\.nobody \? '<span class="badge b-반려"[^>]*>⚠ 지원자 없음<\/span>'/.test(A), '5 관리자 화면 표시');
// 아침 7시: 오늘 밤 입차 — 한 번 더
KDate.__setClock(() => Date.parse('2026-11-25T07:00:00+09:00'));
J("pmRemind_('today')");
ok(AL('김도윤', 'nobody').some((t) => /오늘 밤 입차/.test(t)), '6 아침 7시에 한 번 더 (오늘 밤 입차)');
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
