// (S176) 내부용 근무 가능일: 내 쉬는 날 목록(offDays) · 야간만 저장
//  사용: node sbtest/ts171.js <runner-allinone 폴더>
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
const PICK = (pt, jobId, who) => call('api_pmPick', [pt, [J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id")]]); // (S176) 선착순 없음 → 맡긴 기사가 고름
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-24', value: '212A', old: '' }, { row: D.B, date: '2026-11-25', value: '휴무', old: '' }, { row: D.B, date: '2026-11-26', value: '고정휴무', old: '' }]]);
let m = call('api_pmAvailMine', [T.B]);
const od = (m.offDays || []).map((x) => x.date + ':' + x.cell);
ok(Array.isArray(m.offDays) && od.length > 0, '1 쉬는 날 목록이 옴 (' + od.slice(0, 4).join(',') + ')');
ok(!od.some((x) => x.startsWith('2026-11-24')), '2 근무일(212A)은 목록에 없음');
ok(od.includes('2026-11-25:휴무') && od.includes('2026-11-26:고정휴무') && od.includes('2026-11-27:'), '3 휴무 · 고정휴무 · 빈칸 표시');
ok(!od.some((x) => x.slice(0, 10) > '2026-12-31') && od.some((x) => x.startsWith('2026-12-31')), '4 익월 말까지만');
let r = call('api_pmAvailSave', [T.B, [{ date: '2026-11-25', kind: '주간' }, { date: '2026-11-24', kind: '야간' }], '하이탑', {}]);
const rows = J("readAll_(SH.PAVAIL).map(function (a) { return pmDate_(a.date) + ':' + a.kind; })");
ok(r.ok && rows.length === 1 && rows[0] === '2026-11-25:야간', '5 야간으로만 저장 · 근무일은 빠짐 (' + rows.join(',') + ')');
// 확정된 날은 목록에서 빠짐
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-27', value: '212A', old: '' }]]);
const ids = call('api_pmGive', [T.P, { date: '2026-11-27', codes: ['212A'] }]).ids;
call('api_pmApply', [T.B, ids[0], '']); PICK(T.P, ids[0], 'B');
m = call('api_pmAvailMine', [T.B]);
ok(!(m.offDays || []).some((x) => x.date === '2026-11-27'), '6 품앗이 확정된 날은 목록에서 빠짐');
// 7 익월 뒤에 올려 둔 날(예전 화면)은 새 화면에서 저장해도 지워지지 않음
ev("appendObj_(SH.PAVAIL, { id: 'VX1', driverId: '" + D.B + "', name: '기사B', date: '2027-01-18', kind: '야간', memo: '', createdAt: nowText_() }); pmTouch_(); 1");
call('api_pmAvailSave', [T.B, [{ date: '2026-11-25', kind: '야간' }], '', {}]);
ok(J("readAll_(SH.PAVAIL).some(function (a) { return pmDate_(a.date) === '2027-01-18'; })"), '7 익월 뒤 날은 남아 있음');
ev("appendObj_(SH.PAVAIL, { id: 'VX2', driverId: '" + D.B + "', name: '기사B', date: '2026-11-28', kind: '무관', memo: '', createdAt: nowText_() }); pmTouch_(); 1");
let L = call('api_pmAvailList', [T.C]), b = (L.drivers || []).find((x) => x.id === D.B) || { dates: [] };
ok(b.dates.some((v) => v.date === '2026-11-28' && v.kind === '야간'), '8 예전 무관도 야간으로 보임');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-28', value: '212B', old: '' }]]);
L = call('api_pmAvailList', [T.C]); b = (L.drivers || []).find((x) => x.id === D.B) || { dates: [] };
ok(!b.dates.some((v) => v.date === '2026-11-28') && !b.dates.some((v) => v.date > '2026-12-31'), '9 근무가 생긴 날 · 익월 뒤 날은 안 보임');
const pl = call('api_pmList', [T.C, { q: '' }]);
ok(!(pl.gives || []).some((g) => g.id === D.B && (g.date === '2026-11-28' || g.date > '2026-12-31')), '10 품앗이 목록 카드도 같음 (' + (pl.gives || []).filter((g) => g.id === D.B).map((g) => g.date).join(',') + ')');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-29', value: '휴가', old: '' }, { row: D.B, date: '2026-11-30', value: '병가', old: '' }]]);
const m2 = call('api_pmAvailMine', [T.B]);
ok(!(m2.offDays || []).some((x) => x.date === '2026-11-29' || x.date === '2026-11-30'), '11 휴가 · 병가인 날은 목록에 없음');
call('api_pmAvailSave', [T.B, [{ date: '2026-11-29', kind: '야간' }, { date: '2026-11-25', kind: '야간' }], '', {}]);
ok(!J("readAll_(SH.PAVAIL).some(function (a) { return pmDate_(a.date) === '2026-11-29'; })"), '12 휴가인 날은 억지로 보내도 저장 안 됨');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
