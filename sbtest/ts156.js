// (S156) 퇴사 후 근무: 퇴사일 이후라도 칸이 적힌 날은 쿠팡 업로드 표 · 관리자 홈 출근 수에 들어감 (쉬는 칸 · 빈 칸은 예전처럼 뺌) · 퇴사 예정 기사의 퇴사일 전 날은 홈 출근 수에 셈
//  관리자 기사스케줄 화면(퇴사 후 칸 입력 · 계산 · 업로드 안내)은 Admin.html — 정적 확인
//  사용: node sbtest/ts156.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
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


let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2' }]);
const C1 = call('adm_routeAll', [tok]).camps.find((c) => /군포/.test(c.name)).id;
['212A', '212B', '213A'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
const NM = { P: '퇴사갑', Q: '보통을', R: '예정병', U: '모름정' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'drv01', driverType: '고정', phone: '010-4000-22' + (10 + i), schCampId: C1, baseRoute: ['212A', '212B', '213A', '212B'][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const setLeave = (id, ld) => ev("(function(){ const o = readAll_(SH.DRIVERS).filter(function(d){return d.id==='" + id + "';})[0]; writeFields_(SH.DRIVERS, o._row, { workStatus: '퇴사', leaveDate: '" + ld + "' }); forgetDriver_(o); return 1; })()");
setLeave(D.P, '2026-11-20'); setLeave(D.R, '2026-11-25'); setLeave(D.U, '');
call('adm_schSave', [tok, [
  { row: D.P, date: '2026-11-21', value: '출근', old: '' }, { row: D.Q, date: '2026-11-21', value: '출근', old: '' }, { row: D.R, date: '2026-11-21', value: '출근', old: '' },
  { row: D.P, date: '2026-11-23', value: '출근', old: '' }, { row: D.P, date: '2026-11-24', value: '휴무', old: '' }, { row: D.U, date: '2026-11-21', value: '출근', old: '' }, { row: D.U, date: '2026-11-23', value: '출근', old: '' }]]);
// ① 관리자 홈 오늘(11/21) 출근 수
const H = call('adm_home', [tok, true]);
ok(H.tiles && H.tiles.work === 3, '1 홈 오늘 출근 = 3 (보통 1 + 퇴사 후 근무 1 + 퇴사 예정 1 · 퇴사일 모르는 퇴사자는 안 셈) · 지금 ' + (H.tiles && H.tiles.work));
// ② 쿠팡 업로드 표: 퇴사 후 출근 칸은 올리고, 휴무 · 빈 칸은 안 올림
const up = call('adm_schUploadTable', [tok, '2026-11-22', '4w']);
const rowsOf = (dt) => [].concat(...(up.weeks || [])).filter((r) => r[0] === dt && r[10] === '퇴사갑');
ok(up.ok && rowsOf('2026-11-23').length && rowsOf('2026-11-23').some((r) => String(r[7]).indexOf('212A') >= 0), '2 업로드표 11/23 퇴사갑 212A 출근 줄 있음 (' + JSON.stringify(rowsOf('2026-11-23').map((r) => r[7])) + ')');
ok(!rowsOf('2026-11-24').length && !rowsOf('2026-11-25').length, '3 업로드표 11/24(휴무) · 11/25(빈 칸) 퇴사갑 줄 없음');
ok(!(up.missing || []).some((r) => String(r[0]) === '2026-11-23' && /212A/.test(r[7])), '4 11/23 212A 미입차 아님 (퇴사갑이 뜀)');
ok((up.missing || []).some((r) => String(r[0]) === '2026-11-25' && /212A/.test(r[7])), '5 11/25 212A 는 그대로 미입차 (담당 없음 · 아무도 안 뜀)');
ok(![].concat(...(up.weeks || [])).some((r) => r[10] === '모름정'), '5b 퇴사일 모르는 퇴사자 칸은 예전처럼 안 올림');
// ③ 관리자 화면 (정적)
const A = require('fs').readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/const drvOff = \(d, dt\) => drvGone\(d, dt\) && !drvPost\(d, dt\);/.test(A) && /segIn\(d\._seg, dt\) && !drvOff\(d, dt\) \? pmGaveCut/.test(A), '6 화면 계산: 퇴사 후 칸이 적힌 날은 셈 (쉬는 칸 · 미입차 칸은 뺌)');
ok(/퇴사 후 근무로 적을까요\?/.test(A) && /휴직 중입니다\. 입력하려면/.test(A), '7 퇴사일 이후 칸: 한 번 묻고 입력 · 휴직은 그대로 막음');
ok(/퇴사자 아이디 포함: /.test(A) && /퇴사 후 근무 \(맞는지 확인\)/.test(A), '8 쿠팡 업로드 받을 때 퇴사자 아이디 알림 · 점검 「확인 필요」에 퇴사 후 근무 칸');
const syn = [...A.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => { try { new Function(m[1]); return ''; } catch (e) { return e.message; } }).filter(Boolean);
ok(!syn.length, '9 관리자 화면 코드 문법 오류 없음 ' + syn.join(','));
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
