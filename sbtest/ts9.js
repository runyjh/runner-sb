// S14 쿠팡 어드민 업로드: 회전을 나눠 맡은 노선(408A(D1) · 408A (D2,F3))도 캠프 전체 회전으로 올림 · 물량조율 이슈 날은 그대로 (TZ=UTC)
//  사용: node sbtest/ts9.js <runner-allinone 폴더>
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
const D0 = addDays(today, 3), DB = addDays(today, 1), D1 = addDays(today, 4), D2 = addDays(today, 5), D3 = addDays(today, 6);
// 캠프 · 노선
call('adm_campSave', [tok, { name: '서초1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: 'F_삼성1캠프', rot: 'D1,D2' }]);
call('adm_campSave', [tok, { name: '일산5캠프', rot: 'D1,D2,F3' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['일산5캠프'], code: '408AB' }]);
const mk = (name, base, i) => call('adm_createDriver', [tok, { name, loginId: 'id' + i + '@df', driverType: '고정', phone: '010-3000-100' + i, schCampId: camps['일산5캠프'], baseRoute: base }]);
mk('이용석', '408A(D1),408B', 1); mk('용민경', '408A (D2,F3)', 2);
const drv = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { drv[d.name] = d; });
const A = addDays(today, 2), B = addDays(today, 3);
call('adm_schSave', [tok, [A, B].flatMap((d) => [{ row: drv['이용석'].id, date: d, value: '출근', old: '' }, { row: drv['용민경'].id, date: d, value: '출근', old: '' }])]);
const iss = call('adm_schIssueSave', [tok, { driverId: drv['용민경'].id, date: B, end: B, result: '물량조율', cut: 'F3', kind: '기타', reason: '시험' }]);
const dC = addDays(today, 4), dD = addDays(today, 5), dE = addDays(today, 6);
call('adm_schSave', [tok, [
  { row: drv['이용석'].id, date: dC, value: '출근', old: '' }, { row: drv['용민경'].id, date: dC, value: '휴무', old: '' },
  { row: drv['이용석'].id, date: dD, value: '408A', old: '' }, { row: drv['용민경'].id, date: dD, value: '휴무', old: '' },
  { row: drv['이용석'].id, date: dE, value: '휴무', old: '' }, { row: drv['용민경'].id, date: dE, value: '출근', old: '' }]]);
const up = call('adm_schUploadTable', [tok, A, '4w']);
const rows = [].concat(...up.weeks).filter((r) => r[2] === '일산5');
const row = (d, who) => rows.find((r) => r[0] === d && r[10] === who) || [];
const mis = (d) => up.missing.filter((r) => String(r[0]) === d && /408A/.test(r[7]));
const t = (r) => r.slice(6, 9).join(' / ');
ok(up.ok && row(A, '이용석')[7] === '408B' && row(A, '이용석')[6] === 'D1,D2,F3' && row(A, '이용석')[8] === '표시: 408A(D1)', '1 이용석 출근 → 쿠팡 ' + t(row(A, '이용석')));
ok(row(A, '용민경')[7] === '408A' && row(A, '용민경')[6] === 'D1,D2,F3' && row(A, '용민경')[8] === '표시: 408A(D2,F3)', '2 용민경 출근 → 쿠팡 ' + t(row(A, '용민경')));
ok(!mis(A).length && !up.dups.some((r) => String(r[0]) === A), '3 둘 다 출근한 날 408A 미입차 · 중복 없음');
ok(iss.ok !== false && row(B, '용민경')[7] === '408A' && row(B, '용민경')[6] === 'D2' && row(B, '이용석')[7] === '408B', '4 물량조율 날 용민경은 예전처럼 ' + t(row(B, '용민경')) + ' · 이용석 ' + t(row(B, '이용석')) + ' · 미입차 ' + JSON.stringify(mis(B).map((r) => r[6] + ' ' + r[7])));
ok(row(dC, '이용석')[7] === '408B' && mis(dC).length && mis(dC)[0][6] === 'D1,D2,F3' && /확인: 이용석 408A\(D1\)만 맡음/.test(mis(dC)[0][8]), '5 용민경 휴무 · 이용석 출근 → 쿠팡 ' + t(row(dC, '이용석')) + ' · 408A 미입차 줄 ' + JSON.stringify(mis(dC).map((r) => r[6] + ' ' + r[8])));
ok(row(dD, '이용석')[7] === '408A' && row(dD, '이용석')[6] === 'D1,D2,F3' && !mis(dD).length, '6 칸에 408A 를 직접 적은 날 → 쿠팡 적힌 그대로 ' + t(row(dD, '이용석')));
ok(row(dE, '용민경')[7] === '408A' && row(dE, '용민경')[6] === 'D2,F3' && /미입차\(D1\)/.test(row(dE, '용민경')[8]) && up.missing.some((r) => String(r[0]) === dE && /408A/.test(r[7]) && r[6] === 'D1'), '7 이용석 휴무 · 용민경 출근 → 쿠팡 적힌 그대로 ' + t(row(dE, '용민경')) + ' · D1 은 미입차 줄 (S31)');
// 8. 실제 칸처럼 기본노선 글자를 그대로 적어 둔 날 ('408A(D1),408B' · '408A (D2,F3)') 도 같은 규칙
{
  const dF = addDays(today, 8);
  call('adm_schSave', [tok, [{ row: drv['이용석'].id, date: dF, value: '408A(D1),408B', old: '' }, { row: drv['용민경'].id, date: dF, value: '408A (D2,F3)', old: '' }]]);
  const u = call('adm_schUploadTable', [tok, A, '4w']); const rr = [].concat(...u.weeks).filter((r) => r[2] === '일산5' && r[0] === dF);
  const a = rr.find((r) => r[10] === '이용석') || [], b = rr.find((r) => r[10] === '용민경') || [];
  ok(a[7] === '408B' && a[8] === '표시: 408A(D1)' && b[7] === '408A' && b[6] === 'D1,D2,F3' && b[8] === '표시: 408A(D2,F3)', '8 칸에 회전까지 적은 날: 이용석 ' + a.slice(6, 9).join(' / ') + ' · 용민경 ' + b.slice(6, 9).join(' / '));
}
