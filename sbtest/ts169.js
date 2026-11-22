// (S169) 점검: 코드별 일감 — 두 기사가 나눠 맡은 뒤 한 명 취소 · 맡긴 기사 칸 되돌림
//  사용: node sbtest/ts169.js <runner-allinone 폴더>
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
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '', carName: o.name === '기사P' ? '봉고3 하이탑' : '포터2' }); }); 1"); // 자격증 번호 없음
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });



let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const cell = (id, d) => J("schCellsOf_('" + id + "', ['" + d + "'])")[d] || '';
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-24', value: '212AB', old: '' }]]);
let r = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A', '212B'], time: '21:30' }]);
const [ja, jb] = r.ids;
call('api_pmApply', [T.B, ja, '']);
console.log('  B 가 212A 맡은 뒤 P 칸:', JSON.stringify(cell(D.P, '2026-11-24')));
call('api_pmApply', [T.C, jb, '']);
console.log('  C 가 212B 맡은 뒤 P 칸:', JSON.stringify(cell(D.P, '2026-11-24')));
ok(/휴무/.test(cell(D.P, '2026-11-24')), '1 둘 다 맡겨지면 맡긴 기사 칸은 휴무');
// B 확정 풀기 (맡긴 기사 P 가)
const apB = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + ja + "' && a.status === '확정'; })[0].id");
r = call('api_pmDecide', [T.P, ja, apB, 'back']);
console.log('  B 확정 풀린 뒤 P 칸:', JSON.stringify(cell(D.P, '2026-11-24')));
ok(cell(D.P, '2026-11-24').replace(/\s+/g, '') === '212A', '2 한 명(212A) 풀리면 P 칸은 212A 만 (212B 는 C 가 계속)');
// C 도 풀기
const apC = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jb + "' && a.status === '확정'; })[0].id");
call('api_pmDecide', [T.P, jb, apC, 'back']);
console.log('  C 도 풀린 뒤 P 칸:', JSON.stringify(cell(D.P, '2026-11-24')));
ok(cell(D.P, '2026-11-24').replace(/\s+/g, '') === '212AB', '3 둘 다 풀리면 원래 212AB');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
