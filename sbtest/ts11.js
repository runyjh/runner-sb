// S17 '이슈 아님': 담당 노선 일부만 타도 정상인 날 (동승자 없이 혼자 · 계획된 조정) → 물량조율 이슈를 만들지 않음 / 지움 · 칸은 그대로 (TZ=UTC)
//  사용: node sbtest/ts11.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
const today = ev('todayText_()');
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2,F3' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['강서1캠프'], code: '529AB' }]);
call('adm_createDriver', [tok, { name: '계동희', loginId: 'gye@df', driverType: '고정', phone: '010-3000-1001', schCampId: camps['강서1캠프'], baseRoute: '529AB' }]);
const id = call('adm_listDrivers', [tok]).rows.find((d) => d.name === '계동희').id;
const A = addDays(today, 2), B = addDays(today, 3), C = addDays(today, 4);
call('adm_schSave', [tok, [A, B, C].map((d) => ({ row: id, date: d, value: '출근', old: '' }))]);
const cell = (d) => ev("schCellsOf_('" + id + "', ['" + d + "'])['" + d + "']");
const issOn = (d) => ev('schIssues_()').filter((x) => x.driverId === id && x.result === '물량조율' && x.date <= d && d <= (x.end || x.date));
// 1. 예전처럼: 529B 만 → 물량조율 이슈 생김
const r1 = call('adm_schCellApply', [tok, { row: id, date: A, old: '출근', value: '529B', issue: { result: '물량조율' } }]);
ok(r1.ok && issOn(A).length === 1 && cell(A) === '529B', '1 이슈 아님 안 고르면 예전처럼 물량조율 이슈 (' + (issOn(A)[0] || {}).cut + ')');
// 2. 저장할 때 '이슈 아님' → 칸은 529B · 이슈 없음
const r2 = call('adm_schCellApply', [tok, { row: id, date: B, old: '출근', value: '529B', noIss: true, issue: { result: '물량조율' } }]);
ok(r2.ok && cell(B) === '529B' && !issOn(B).length && !(r2.issues || []).some((x) => x.date === B), '2 이슈 아님으로 저장 → 칸 ' + cell(B) + ' · 이슈 ' + issOn(B).length + '건');
// 3. 이미 생긴 이슈를 칸에서 '이슈 아님' (값은 그대로) → 이슈만 지움
const r3 = call('adm_schCellApply', [tok, { row: id, date: A, old: '529B', value: '529B', noIss: true }]);
ok(r3.ok && cell(A) === '529B' && !issOn(A).length && (r3.removed || []).length === 1, '3 이미 있던 이슈를 이슈 아님으로 → 이슈 지움 · 칸 ' + cell(A) + ' 그대로');
// 4. 이슈 팝업의 '이슈 아님' (adm_schIssueDel keepCell) → 칸 그대로
call('adm_schCellApply', [tok, { row: id, date: C, old: '출근', value: '529B', issue: { result: '물량조율' } }]);
const x = issOn(C)[0];
const r4 = call('adm_schIssueDel', [tok, x.id, true]);
ok(r4.ok && !issOn(C).length && cell(C) === '529B' && !(r4.cells || []).length, '4 사유 묻는 창의 이슈 아님 → 이슈 지움 · 칸 ' + cell(C) + ' 그대로');
// 5. 보통 이슈 삭제는 예전처럼: 이슈가 넣은 칸은 원래 값으로 되돌림
const Dd = addDays(today, 5);
call('adm_schSave', [tok, [{ row: id, date: Dd, value: '출근', old: '' }]]);
const sv = call('adm_schIssueSave', [tok, { driverId: id, date: Dd, end: Dd, result: '물량조율', cut: '529A', kind: '기타', reason: '시험' }]);
const c5 = cell(Dd), r5 = call('adm_schIssueDel', [tok, sv.issue.id]);
ok(r5.ok && !issOn(Dd).length && c5 !== '출근' && cell(Dd) === '출근', '5 보통 이슈 삭제는 예전처럼 칸 되돌림 (' + c5 + ' → ' + cell(Dd) + ')');
