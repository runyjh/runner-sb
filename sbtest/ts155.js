// (S155) 할 일 없는 줄 숨김 — 기사앱 캠프 스케줄(서버): 퇴사일이 그 달 전이고 칸이 없는 퇴사자 · 노선 변경 예약으로 그 캠프에 며칠만 걸치고 그 날들이 모두 휴무인 기사는 목록에서 뺌
//  관리자 기사스케줄(화면)은 Admin.html schIdleRow — 같은 기준 (정적 확인)
//  사용: node sbtest/ts155.js <runner-allinone 폴더>
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
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: '인천7캠프', rot: 'D1,D2' }]);
const CAMPS = call('adm_routeAll', [tok]).camps; const C1 = CAMPS.find((c) => /강서/.test(c.name)).id, C2 = CAMPS.find((c) => /인천/.test(c.name)).id;
['527B', '529A'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }])); ['919CD'].forEach((r) => call('adm_routeSave', [tok, { campId: C2, code: r }]));
const NM = { Y: '보는기사', X: '퇴사갑', W: '퇴사을', Z: '옮김병' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'drv01', driverType: '고정', phone: '010-4000-21' + (10 + i), schCampId: C1, baseRoute: k === 'Y' ? '527B' : '백업' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("['" + D.X + "','" + D.W + "'].forEach(function(id){ const o = readAll_(SH.DRIVERS).filter(function(d){return d.id===id;})[0]; writeFields_(SH.DRIVERS, o._row, { workStatus: '퇴사', leaveDate: '2026-11-10' }); forgetDriver_(o); }); 1");
call('adm_schSave', [tok, [{ row: D.W, date: '2026-12-03', value: '출근', old: '' }, { row: D.X, date: '2026-11-05', value: '출근', old: '' }]]);
let x = call('adm_rcSave', [tok, { driverId: D.Z, date: '2026-12-02', toCampId: C2, toRoute: '919CD' }]); if (!x.ok) console.log('예약', x.msg);
const ytok = ev("createSession_('" + D.Y + "', true).token");
const names = (month, cid) => { const r = call('api_campSchedule', [ytok, month, cid || '']); if (!r.ok) { console.log('캠프 스케줄', r.msg); return []; } return (r.drivers || []).map((d) => d.name); };
let dec = names('2026-12'), nov = names('2026-11');
ok(nov.includes('퇴사갑'), '1 11월(퇴사한 달): 퇴사자 보임 (' + nov.join(',') + ')');
ok(!dec.includes('퇴사갑'), '2 12월: 퇴사일이 그 달 전 · 칸 없는 퇴사자 빠짐 (' + dec.join(',') + ')');
ok(dec.includes('퇴사을'), '3 12월: 퇴사 후 칸이 적힌 퇴사자는 보임');
ok(dec.includes('옮김병'), '4 12월 강서1: 노선 변경 예약 전날(12/1)이 빈 칸이면 보임 (아직 안 정함)');
call('adm_schSave', [tok, [{ row: D.Z, date: '2026-12-01', value: '휴무', old: '' }]]);
dec = names('2026-12');
ok(!dec.includes('옮김병'), '5 12월 강서1: 그 날(12/1)이 휴무면 빠짐 (' + dec.join(',') + ')');
call('adm_createDriver', [tok, { name: '인천기사', loginId: 'qdrv01', driverType: '고정', phone: '010-4000-2199', schCampId: C2, baseRoute: '919CD' }]);
const qid = call('adm_listDrivers', [tok]).rows.find((d) => d.name === '인천기사').id, qtok = ev("createSession_('" + qid + "', true).token");
const inc = (() => { const r = call('api_campSchedule', [qtok, '2026-12', '']); return r.ok ? (r.drivers || []).map((d) => d.name) : [r.msg]; })();
ok(inc.includes('옮김병'), '6 12월 인천7: 새 캠프 쪽은 그대로 보임 (' + inc.join(',') + ')');
ok(dec.includes('보는기사'), '7 보는 기사 본인 · 평소 기사는 그대로');
// 관리자 화면 (정적): 같은 기준 함수 · 검색 / '정지·대기 기사도 보기' 면 보임 · 방금 고친 줄은 숨기지 않음 · 휴대폰 한 달 달력은 숨긴 줄 칸도 씀
const A = require('fs').readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/function schIdleRow\(d\)/.test(A) && /if \(!q && !sf\.all && !sKeep\.has\(d\.id\) && schIdleRow\(d\)\)/.test(A), '8 관리자 기사스케줄: 할 일 없는 줄 숨김 (검색 · 전체 보기 · 방금 고친 줄은 예외)');
ok(/v \? !CE_OFF\.test\(v\) : noAssign\(r, dt, ''\)/.test(A), '9 관리자: 옛 캠프 구간 빈 칸이 「배정 안 된 칸」이면 숨기지 않음');
ok(/srows\.concat\(sHidRows\)/.test(A), '10 휴대폰 한 달 달력: 숨긴 줄 날도 그대로 보임');
const syn = [...A.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => { try { new Function(m[1]); return ''; } catch (e) { return e.message; } }).filter(Boolean);
ok(!syn.length, '11 관리자 화면 코드 문법 오류 없음 ' + syn.join(','));
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
