// (S205) 품앗이는 노선 통째로 1건 (코드별 맡기기 금지 · 일부만은 사무실 대행 등록에서만)
//  사용: node sbtest/ts205.js <runner-allinone 폴더>
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
call('adm_createDriver', [tok, { name: '기사Y', loginId: 'ky01', driverType: '고정', phone: '010-4300-1012', schCampId: C1, baseRoute: '205AB' }]);
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name] = d.id; });
const TK = (n) => ev("createSession_('" + D[n] + "', true).token");
const T = TK('김도윤'), TX = TK('기사X'), TY = TK('기사Y');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const JOB = (id) => J("readAll_(SH.PJOB).filter(function (j) { return j.id === '" + id + "'; })[0]");
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-27', value: '출근', old: '' }, { row: D['기사X'], date: '2026-11-27', value: '휴무', old: '' }, { row: D['기사Y'], date: '2026-11-27', value: '휴무', old: '' }]]);
// 1 노선 통째로 1건
let r = call('api_pmGive', [T, { date: '2026-11-27' }]);
ok(r.ok && r.ids.length === 1 && r.route === '204D,205AB' && JOB(r.ids[0]).route === '204D,205AB', '1 그날 노선 통째로 일감 1건 (' + (r.route || r.msg) + ')');
const J1 = r.ids[0];
// 2 일부 코드만 맡기기는 막힘 (예전 앱이 코드를 골라 보내도)
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-28', value: '204D,205AB', old: '' }]]);
r = call('api_pmGive', [T, { date: '2026-11-28', codes: ['205A'] }]);
ok(r.ok === false && /통째로/.test(r.msg || '') && /사무실/.test(r.msg || ''), '2 일부 코드만 맡기기는 막힘 · 사무실 안내 (' + (r.msg || '') + ')');
r = call('api_pmGive', [T, { date: '2026-11-28', codes: ['204D', '205A', '205B'] }]);
ok(r.ok && r.ids.length === 1, '3 코드를 다 보내면 그대로 1건');
// 4 받는 쪽: 한 사람만 · 카드 하나
r = call('api_pmApplyMany', [TX, [J1], '']); const r2 = call('api_pmApplyMany', [TY, [J1], '']);
const apX = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + J1 + "' && a.driverId === '" + D['기사X'] + "'; })[0].id");
r = call('api_pmPick', [T, [apX]]);
ok(r.ok && JOB(J1).accepted === '기사X' && JOB(J1).status === '배차 확정', '4 한 사람(기사X)만 확정');
ok(J("schCellsOf_('" + D['김도윤'] + "', ['2026-11-27'])['2026-11-27']") === '휴무', '5 맡긴 기사 칸은 휴무 (노선 전체를 맡김)');
// 6 사무실 대행 등록은 일부 코드만 가능
call('adm_schSave', [tok, [{ row: D['김도윤'], date: '2026-11-29', value: '204D,205AB', old: '' }]]);
r = call('adm_pmCreate', [tok, { posterId: D['김도윤'], kind: '야간', date: '2026-11-29', campId: C1, route: '205A', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'open', okLow: true }]);
ok(r.ok, '6 사무실 대행 등록은 코드 일부(205A)만도 됨 ' + (r.msg || ''));
r = call('api_pmGive', [T, { date: '2026-11-29' }]);
ok(r.ok && r.route === '204D,205B', '7 그 뒤 기사가 맡기면 사무실이 올린 코드를 뺀 나머지 통째로 (' + (r.route || r.msg) + ')');
// 8 화면
const IX = require('fs').readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/if \(PMG\) \{ \/\/ \(S205\) 내 노선 맡기기/.test(IX) && /if \(PMG\) return; \/\/ \(S205\) 노선 통째로만/.test(IX), '8 기사앱 일감 주기: 코드 고르기 없음 (노선 표시만)');
ok(/' 노선 맡기기<\/button>/.test(IX) && !/data-pqc="/.test(IX), '9 스케줄에서 맡기기 창도 노선 통째로 (코드 체크 없음)');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '10 기사앱 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
