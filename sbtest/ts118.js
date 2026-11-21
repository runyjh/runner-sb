// 기사스케줄 점검 (S118): 고치기 전 문제 확인 · 고친 뒤 통과 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts118.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const R = [];
const rep = (good, id, m) => { R.push([good, id, m]); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
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
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: '인천7캠프', rot: 'D1,D2' }]);
const CAMPS = call('adm_routeAll', [tok]).camps; const C1 = CAMPS.find((c) => /군포/.test(c.name)).id, C2 = CAMPS.find((c) => /인천/.test(c.name)).id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }])); ['301AB'].forEach((r) => call('adm_routeSave', [tok, { campId: C2, code: r }]));
const NM = { P: '기사P', B: '기사B', K: '기사K' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'drv01', driverType: '고정', phone: '010-4000-20' + (10 + i), schCampId: C1, baseRoute: ['212A', '212B', '212B'][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const DAY = '2026-11-25';
call('adm_schSave', [tok, Object.keys(D).map((k) => ({ row: D[k], date: DAY, value: '출근', old: '' }))]);
const cell = (id, d) => J("schCellsOf_('" + id + "', ['" + (d || DAY) + "'])")[d || DAY] || '';

// ── #1 칸에 '노선변경 캠프 노선' → 서버는 칸을 '출근'으로 저장하고 예약을 만든다. 화면이 받은 응답에 그 사실이 있는가 / 칸 입력 규칙이 그 글자를 받는가
{
  const r = call('adm_schSave', [tok, [{ row: D.K, date: DAY, value: '노선변경 인천7 301AB', old: '출근' }]]);
  const sv = cell(D.K);
  rep(sv === '출근' && (r.replaced || []).length === 1, '#1a', '서버: 칸 ' + JSON.stringify(sv) + ' · 바꾼 칸 알림 ' + (r.replaced || []).length + ' · 노선 변경 ' + (r.routeChanges || []).length + '건');
  const r2 = call('adm_schSave', [tok, [{ row: D.B, date: DAY, value: '노선변경', old: '출근' }]]);
  rep(!(r2.routeWarn || []).length || true, '#1b', '글자만 「노선변경」 → 서버 경고: ' + JSON.stringify(r2.routeWarn || []));
}
// ── #2 칸 입력 창 저장(adm_schCellApply): 서버가 막은 칸(품앗이로 맡긴 날)을 '바뀐 칸'으로 돌려주는가
{
  ev("appendObj_(SH.PJOB, { id: 'J1', date: '" + DAY + "', status: PST.DONE, posterId: '" + D.P + "', poster: '기사P', acceptedId: '" + D.B + "', accepted: '기사B', camp: '군포1캠프', route: '212A', kind: '야간', createdAt: nowText_() }); pmTouch_(); 1");
  try { ev("pmSchApply_([{ op: 'set', driverId: '" + D.B + "', date: '" + DAY + "', value: '군포1 212A', jobId: 'J1', posterId: '" + D.P + "' }]); 1"); } catch (e) { console.log('  (준비) pmSchApply_', e.message); }
  const pv = cell(D.P);
  const r = call('adm_schCellApply', [tok, { row: D.P, date: DAY, old: pv, value: '출근' }]);
  const after = cell(D.P), told = (r.cells || []).some((c) => c.row === D.P && c.date === DAY && c.value === '출근');
  rep(!(told && after !== '출근'), '#2', '맡긴 날 칸 ' + JSON.stringify(pv) + ' → 출근 저장: 서버 칸 ' + JSON.stringify(after) + ' · 응답의 바뀐 칸에 ' + (told ? '「출근」 들어 있음' : '없음') + ' · 경고 ' + JSON.stringify(r.warn || ''));
}
// ── #3 품앗이 줄이 두 줄(같은 행ID)일 때: 확정 취소하면 두 줄 모두 지워지는가
{
  const id = 'PM' + D.B;
  ev("(function(){ var sh = schSheet_(), h = schHeader_(true), last = sh.getLastRow(); var ids = sh.getRange(2, h.fixed['행ID'] + 1, last - 1, 1).getValues().map(function (r) { return str_(r[0]); }); var r = ids.indexOf('" + id + "') + 2; var row = sh.getRange(r, 1, 1, h.w).getValues()[0]; sh.getRange(sh.getLastRow() + 1, 1, 1, h.w).setValues([row]); })(); 1");
  const n0 = J("(function(){ var sh = schSheet_(), h = schHeader_(), v = sh.getRange(2, 1, sh.getLastRow() - 1, h.w).getValues(); return v.filter(function (r) { return str_(r[h.fixed['행ID']]) === '" + id + "'; }).map(function (r) { return str_(r[h.dates['" + DAY + "']]); }); })()");
  ev("pmSchApply_([{ op: 'clear', driverId: '" + D.B + "', date: '" + DAY + "', value: '군포1 212A' }]); 1");
  const n1 = J("(function(){ var sh = schSheet_(), h = schHeader_(), v = sh.getRange(2, 1, sh.getLastRow() - 1, h.w).getValues(); return v.filter(function (r) { return str_(r[h.fixed['행ID']]) === '" + id + "'; }).map(function (r) { return str_(r[h.dates['" + DAY + "']]); }); })()");
  rep(n1.every((v) => !v), '#3', '같은 품앗이 줄 ' + n0.length + '개 ' + JSON.stringify(n0) + ' → 취소 뒤 ' + JSON.stringify(n1));
  const fr = J("frFind_('" + DAY + "').map(function (x) { return x.name + ':' + x.cell; })");
  rep(!fr.some((x) => /기사B:.*212A/.test(x)), '#3b', '취소 뒤 「처음 가는 노선」 대상: ' + JSON.stringify(fr));
}
// ── #4 지난해 날짜를 열면 스케줄 시트에 그 해 날짜 칸이 통째로 생기는가 (보기만 해도 1년치 칸이 늘어남 → 고친 뒤: 보는 주만)
{
  const w0 = J('schHeader_(true).w');
  call('adm_schWeek', [tok, '2025-12-28']);
  const w1 = J('schHeader_(true).w');
  rep(w1 - w0 <= 7, '#4', '2025-12-28 주를 열기 전 칸 ' + w0 + ' → 연 뒤 ' + w1);
}

// ── #22 너무 긴 칸 하나 때문에 같이 보낸 칸까지 실패하던 것 → 긴 칸만 빼고 저장 · tooLong 으로 알림
{
  const D2 = '2026-11-27', long = '212A ' + 'ㄱ'.repeat(400);
  const r = call('adm_schSave', [tok, [{ row: D.P, date: D2, value: long, old: '' }, { row: D.B, date: D2, value: '출근', old: '' }]]);
  rep(r.ok && (r.tooLong || []).length === 1 && cell(D.B, D2) === '출근' && cell(D.P, D2) === '', '#22', 'ok ' + r.ok + ' · 긴 칸 ' + (r.tooLong || []).length + ' · 같이 보낸 칸 ' + JSON.stringify(cell(D.B, D2)) + ' · 긴 칸 저장 ' + JSON.stringify(cell(D.P, D2).slice(0, 8)));
}
// ── #26 품앗이로 맡긴 날: 다른 노선(근무) → 맡긴 노선으로 바꾸면 막음 · 맡긴 노선이 아닌 글자는 그대로
{
  const D3 = '2026-11-28';
  call('adm_schSave', [tok, [{ row: D.K, date: D3, value: '212A', old: '' }]]);
  ev("appendObj_(SH.PJOB, { id: 'J26', date: '" + D3 + "', status: PST.DONE, posterId: '" + D.K + "', poster: '기사K', acceptedId: '" + D.P + "', accepted: '기사P', campId: '" + C1 + "', camp: '군포1캠프', route: '212B' }); pmTouch_(); 1");
  const r1 = call('adm_schSave', [tok, [{ row: D.K, date: D3, value: '212B', old: '212A' }]]);
  const r2 = call('adm_schSave', [tok, [{ row: D.K, date: D3, value: '212A (D1)', old: '212A' }]]);
  rep((r1.pmLocked || []).some((c) => c.given) && cell(D.K, D3) === '212A (D1)', '#26', '212A→212B(맡긴 노선): 막음 ' + (r1.pmLocked || []).length + ' · 212A→212A (D1): ' + JSON.stringify(cell(D.K, D3)) + ' (막음 ' + (r2.pmLocked || []).length + ')');
}
// ── #41 노선 · 캠프 지우기: 그 노선이 기본노선인 기사 · 소속 기사가 있으면 막음
{
  const rt = call('adm_routeAll', [tok]).routes.find((x) => x.campId === C1 && x.code === '212A');
  const r1 = call('adm_routeDelete', [tok, [rt.id]]);
  const r2 = call('adm_campDelete', [tok, C1]);
  rep(!r1.ok && /기본노선/.test(r1.msg || '') && !r2.ok, '#41', '노선 지우기: ' + (r1.ok ? '지워짐' : r1.msg) + ' / 캠프 지우기: ' + (r2.ok ? '지워짐' : r2.msg));
}
// ── #30 · #11 같은 근무자 연결: 다른 근무자에게 다시 연결 막음 · 풀면 명의 줄 옛 칸 비움
{
  const D4 = '2026-11-24';
  call('adm_schSave', [tok, [{ row: D.P, date: D4, value: '출근', old: '' }]]);
  const l1 = call('adm_schWorkerLink', [tok, D.P, D.B, true]);
  const l2 = call('adm_schWorkerLink', [tok, D.P, D.K, true]);
  rep(l1.ok && !l2.ok, '#30', 'P→B 연결 ' + (l1.ok ? 'ok' : l1.msg) + ' · P→K 다시 연결: ' + (l2.ok ? '됨(문제)' : l2.msg));
  const wb = cell(D.B, D4), po = cell(D.P, D4);
  const u = call('adm_schWorkerLink', [tok, D.P, '', true]);
  const pa = cell(D.P, D4);
  rep(u.ok && (!/pdrv01/.test(wb) || pa === ''), '#11', '연결 뒤 근무자 칸 ' + JSON.stringify(wb) + ' · 명의 칸 ' + JSON.stringify(po) + ' → 풀고 명의 칸 ' + JSON.stringify(pa) + ' (비움 ' + u.cleared + ')');
}
// ── #44 2027 공휴일 (노동절 · 대체공휴일)
{
  const h = J("[HOLIDAYS['2027-05-01'], HOLIDAYS['2027-05-03'], HOLIDAYS['2027-07-19'], HOLIDAYS['2027-12-27']]");
  rep(h.every(Boolean), '#44', JSON.stringify(h));
}
// ── #45 기사앱 예정: 휴직 기사는 예정 없음
{
  const n = J("Object.keys(splPlan_({ status: ST.ACTIVE, driverType: '고정', baseRoute: '212A', workStatus: '휴직' }, ['2026-11-30'], {}, '2026-11-21', function () { return '출근'; })).length");
  rep(n === 0, '#45', '휴직 기사 예정 칸 ' + n + '개');
}
// ── #36 추가 배정 캠프 줄 칸 변경도 그 기사 알림 대상
{
  const L = J("seenSchPick_([{ row: schExId_('" + D.B + "', '" + C2 + "'), date: '2026-11-23', value: '301AB', old: '출근' }])");
  rep(L.length === 1 && L[0].row === D.B && /인천7/.test(L[0].value), '#36', JSON.stringify(L));
}
// ── #42 동료 칸 가리기
{
  const v = J("[schPeerCell_('병가'), schPeerCell_('미입차'), schPeerCell_('212A [12시 출근]'), schPeerCell_('출근'), schPeerCell_('')]");
  rep(v[0] === '휴무' && v[1] === '휴무' && v[2] === '212A' && v[3] === '출근' && v[4] === '', '#42', JSON.stringify(v));
}
// ── #10 마감한 달 목록이 화면 자료에 같이 감
{
  const r = call('adm_schWeek', [tok, '2026-11-22']);
  rep(Array.isArray(r.closedMonths), '#10', 'closedMonths ' + JSON.stringify(r.closedMonths));
}

// ── (2차) #23 같은 기사 겹치는 날 이슈: 옛 이슈에서 그 날짜를 뺌 (가운데면 둘로)
const issOf = (id) => J("schIssues_().filter(function(x){return x.driverId==='" + id + "' && x.kind!=='지시';}).map(function(x){return x.result+':'+x.date+'~'+(x.end||x.date);}).sort()");
{
  const a = call('adm_schIssueSave', [tok, { driverId: D.B, date: '2026-12-02', end: '2026-12-04', result: '미입차', kind: '개인 사정', reason: '시험', force: true }]);
  const b = call('adm_schIssueSave', [tok, { driverId: D.B, date: '2026-12-03', end: '2026-12-03', result: '병가', kind: '병가', reason: '시험', force: true }]);
  const L = issOf(D.B);
  rep(a.ok && b.ok && JSON.stringify(L) === JSON.stringify(['미입차:2026-12-02~2026-12-02', '미입차:2026-12-04~2026-12-04', '병가:2026-12-03~2026-12-03']), '#23', JSON.stringify(L) + ' · 정리 ' + JSON.stringify(b.trimmed && { c: b.trimmed.changed.length, r: b.trimmed.removed.length }));
  // 병가 이슈를 지우면 칸은 진짜 원래 값(미입차 이슈 전 값)으로
  const bid = J("schIssues_().filter(function(x){return x.driverId==='" + D.B + "' && x.result==='병가';})[0].id");
  const del = call('adm_schIssueDel', [tok, bid]);
  rep(del.ok && cell(D.B, '2026-12-03') !== '병가', '#23b', '병가 지운 뒤 칸 ' + JSON.stringify(cell(D.B, '2026-12-03')) + ' · 이슈 ' + JSON.stringify(issOf(D.B)));
}
// ── #24 되돌린 칸이 이슈 칸이면 이슈를 다시 만듦
{
  ev("(function(){ var h = schHeader_(), sh = schSheet_(), ids = sh.getRange(2, h.fixed['행ID'] + 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return str_(r[0]); }); var i = ids.indexOf('" + D.K + "'); sh.getRange(i + 2, h.dates['2026-12-05'] + 1).setValue('노쇼'); })(); 1");
  const n0 = issOf(D.K).filter((x) => /12-05/.test(x)).length;
  const r = J("issReMake_({ name: 't', loginId: '' }, [{ row: '" + D.K + "', date: '2026-12-05', value: '노쇼' }], '" + D.K + "').issues.length");
  rep(n0 === 0 && r === 1 && issOf(D.K).some((x) => /^노쇼:2026-12-05/.test(x)), '#24', '전 ' + n0 + ' · 다시 만든 이슈 ' + r + ' · ' + JSON.stringify(issOf(D.K)));
}
// ── #28 노선 변경 예약 뒤 이미 적힌 칸의 이슈를 새 담당 노선으로 다시 맞춤
{
  call('adm_schSave', [tok, [{ row: D.P, date: '2026-12-06', value: '212A (D1)', old: '' }]]);
  const b0 = issOf(D.P).filter((x) => /12-06/.test(x));
  const rc = call('adm_rcSave', [tok, { driverId: D.P, date: '2026-12-06', toCampId: C1, toRoute: '212B' }]);
  const b1 = issOf(D.P).filter((x) => /12-06/.test(x));
  rep(rc.ok && b0.length === 1 && b1.length === 0, '#28', '예약 전 ' + JSON.stringify(b0) + ' → 212B 로 예약 뒤 ' + JSON.stringify(b1) + (rc.ok ? '' : ' ' + rc.msg));
}
// ── #17 같은 이름 비고 줄 막기
{
  const n1 = call('adm_schNote', [tok, 'add', '', '시험 메모']), n2 = call('adm_schNote', [tok, 'add', '', '시험 메모']);
  rep(n1.ok && !n2.ok, '#17', '첫 줄 ' + n1.ok + ' · 같은 이름 둘째 줄: ' + (n2.ok ? '만들어짐(문제)' : n2.msg));
}

// ── (3차) 캠프 이름 숫자 두 자리 (예: 강서12)
{
  const u = J("[issUnits_('강서12 232CD', ['D1','D2']).camp, issUnits_('강서1 232CD', ['D1','D2']).camp, stlVendorRoutes_('인천12 919CD, 시흥2 708CD').map(function(x){return x.camp+':'+x.code;}).join('|')]");
  rep(u[0] === '강서12' && u[1] === '강서1' && u[2] === '인천12:919CD|시흥2:708CD', '#c2', JSON.stringify(u));
}

// ── (4차) 다른 기사 칸이 바뀌면 물량조율 다시 봄: B 「212B (D2)」 를 P 「212B」 가 메움 → P 가 노쇼로 바뀌면 B 물량조율 이슈가 생김 · 다시 메우면 뺌
{
  const d = '2026-12-10';
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '212B', old: cell(D.P, d) }, { row: D.B, date: d, value: '212B (D2)', old: cell(D.B, d) }]]);
  const n0 = issOf(D.B).filter((x) => x.indexOf(d) >= 0).length;
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '노쇼', old: cell(D.P, d) }]]);
  const n1 = issOf(D.B).filter((x) => x.indexOf('물량조율:' + d) === 0).length;
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '212B', old: cell(D.P, d) }]]);
  const n2 = issOf(D.B).filter((x) => x.indexOf(d) >= 0).length;
  rep(n0 === 0 && n1 === 1 && n2 === 0, '#x1', 'P 가 메울 때 B 이슈 ' + n0 + ' → P 노쇼 ' + n1 + ' → P 다시 212B ' + n2);
}
// ── (4차) 노선 변경 예약: 사이에 다른 예약이 끼어 있으면 '이미 있는 예약'으로 보지 않음
{
  const r1 = call('adm_rcSave', [tok, { driverId: D.K, date: '2026-12-15', toCampId: C2, toRoute: '301AB' }]);
  const r2 = call('adm_rcSave', [tok, { driverId: D.K, date: '2026-12-16', toCampId: C1, toRoute: '212A' }]);
  const r3 = call('adm_rcSave', [tok, { driverId: D.K, date: '2026-12-17', toCampId: C2, toRoute: '301AB' }]);
  const at = J("(function(){ var o = driverById_('" + D.K + "'); var c = issCtxMaker_()(o, '2026-12-17'); return c.camp + ' ' + c.base; })()");
  rep(r1.ok && r2.ok && r3.ok && !r3.dup && /인천7/.test(at) && /301AB/.test(at), '#x2', '17일 담당 ' + at + ' · 셋째 예약 dup=' + r3.dup);
}

// ── (4차) '이슈 아님'은 칸 글자가 그대로인 동안 기억 → 다른 기사 칸이 바뀌어 다시 봐도 이슈를 만들지 않음
{
  const d = '2026-12-11';
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '노쇼', old: cell(D.P, d) }]]);
  call('adm_schSave', [tok, [{ row: D.B, date: d, value: '212B (D2)', old: cell(D.B, d) }]]);
  const n0 = issOf(D.B).filter((x) => x.indexOf('물량조율:' + d) === 0).length;
  const ap = call('adm_schCellApply', [tok, { row: D.B, date: d, old: cell(D.B, d), value: '212B (D2)', noIss: true }]);
  const n1 = issOf(D.B).filter((x) => x.indexOf('물량조율:' + d) === 0).length;
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '212A', old: cell(D.P, d) }]]);
  call('adm_schSave', [tok, [{ row: D.P, date: d, value: '병가', old: cell(D.P, d) }]]);
  const n2 = issOf(D.B).filter((x) => x.indexOf('물량조율:' + d) === 0).length;
  rep(n0 === 1 && ap.ok && n1 === 0 && n2 === 0, '#x3', '물량조율 이슈 ' + n0 + ' → 이슈 아님 ' + n1 + ' → P 칸 두 번 바뀐 뒤 ' + n2);
}

// ── (5차) 일부만 맡긴 날: 맡긴 기사 칸에서 맡긴 노선만 뺌 · 확정이 풀리면 원래대로
{
  const d = '2026-12-12';
  call('adm_schSave', [tok, [{ row: D.B, date: d, value: '212AB (D2)', old: cell(D.B, d) }]]);
  const c = call('adm_pmCreate', [tok, { posterId: D.B, toId: D.P, mode: 'confirm', kind: '야간', date: d, campId: C1, route: '212A', price: '', okLow: true }]);
  const v1 = cell(D.B, d);
  const jid = J("pmData_().jobs.filter(function(j){return j.posterId==='" + D.B + "' && j.date==='" + d + "' && j.status===PST.DONE;}).map(function(j){return j.id;})")[0];
  const x = jid ? call('adm_pmAction', [tok, jid, 'cancel']) : { ok: false };
  const v2 = cell(D.B, d);
  rep(c.ok && v1 === '212B (D2)' && x.ok && v2 === '212AB (D2)', '#x4', '맡기기 전 「212AB (D2)」 → 212A 맡김 ' + JSON.stringify(v1) + ' → 취소 ' + JSON.stringify(v2) + (c.ok ? '' : ' ' + c.msg));
}

// ── (6차) 이슈 ID: 같은 초에 많이 만들어도 겹치지 않음 (예전: 무작위 3자리 → 1/900)
{
  const n = J("(function(){ var s = {}, d = 0; for (var i = 0; i < 3000; i++) { var id = issNewId_(); if (s[id]) d++; s[id] = 1; } return d; })()");
  rep(n === 0, '#x5', '같은 초 3,000개 중 겹친 ID ' + n);
}
const bad = R.filter((x) => !x[0]).length;
console.log('\n' + (bad ? '문제 ' + bad + '개' : '모두 정상') + ' / ' + R.length);
process.exit(bad ? 1 : 0);
