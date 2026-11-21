// S100 확인이 안 뜨거나 잘못 세던 것: ① 이슈 기록 · 삭제로 바뀐 칸도 [확인했습니다] ② 정산서 메뉴를 끈 기사는 정산서를 세지 않음
//  ③ 앱을 끄지 않고 다시 열면 확인을 다시 받아 옴 · 확인 다시 알림을 누르면 홈으로 ④ 앱을 보고 있어도 다시 알림이 뜸(알림함에 남김)
//  ⑤ 금 · 토에 고친 다음 주 칸은 그 주 일요일부터 뜸 ⑥ 본 내용(바뀐 시각)까지만 확인 (TZ=UTC)
//  사용: node sbtest/ts100.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
at('2026-11-20T15:00:00'); // 금요일
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['군포1캠프'], code: '212AB' }]);
const mk = (name, i) => call('adm_createDriver', [tok, { name, loginId: 'id' + i + '@df', driverType: '고정', phone: '010-3000-200' + i, schCampId: camps['군포1캠프'], baseRoute: '212AB' }]);
mk('전광성', 1); mk('이용석', 2);
const drv = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { drv[d.name] = d.id; });
const X = drv['전광성'], Y = drv['이용석'];
ev("[" + JSON.stringify(X) + ", " + JSON.stringify(Y) + "].forEach(function (id) { var r = findRow_(SH.DRIVERS, 'id', id); writeFields_(SH.DRIVERS, r, { status: ST.ACTIVE }); }); 1");
const TX = ev("createSession_(" + JSON.stringify(X) + ", true).token");
const seenRows = (k) => JSON.parse(ev("JSON.stringify(readAll_(SH.SEEN).filter(function (o) { return o.kind === " + JSON.stringify(k || 'sch') + "; }).map(function (o) { return { d: o.driverId, key: o.key, old: o.old, text: o.text, at: o.at, ack: o.ackAt, name: o.name }; }))"));
// 칸 채우기 (처음 채우는 것 → 변경 아님)
const SAT = '2026-11-21', MON = '2026-11-23';
call('adm_schSave', [tok, [{ row: X, date: SAT, value: '출근', old: '' }, { row: X, date: MON, value: '출근', old: '' }, { row: Y, date: SAT, value: '출근', old: '' }]]);
ok(seenRows().length === 0, '0 빈칸을 처음 채운 것은 변경 아님');

// ① 이슈 기록으로 바뀐 칸 → 확인 기록 · 이슈를 지우면(원래 값) 취소로 닫힘
const iss = call('adm_schIssueSave', [tok, { driverId: X, date: SAT, end: SAT, result: '미입차', kind: '기타', reason: '독감' }]);
let R = seenRows();
ok(iss.ok !== false && R.length === 1 && R[0].d === X && R[0].key === SAT && R[0].old === '출근' && R[0].text === '미입차' && !R[0].ack, '1 이슈 기록(미입차)으로 바뀐 칸 → 기사앱 [확인했습니다] 기록 ' + JSON.stringify(R.map((r) => r.old + '→' + r.text)));
ok(R[0].name === '전광성', '1b 기록에 기사 이름도 (관리자 홈 「미확인 기사」 이름)');
let A = call('api_seen', [TX, [{ k: 'open', key: '' }]]);
ok(A.ok && A.changes.length === 1 && A.changes[0].date === SAT && A.changes[0].value === '미입차', '2 기사앱에 내일 변경이 바로 뜸');
const del = call('adm_schIssueDel', [tok, iss.issue && iss.issue.id]);
R = seenRows();
ok(del.ok && R.length === 1 && R[0].ack === '취소', '3 이슈를 지워 칸이 원래 값으로 → 확인 전이면 취소로 닫힘 (' + (R[0] && R[0].ack) + ')');
A = call('api_seen', [TX, []]);
ok(A.changes.length === 0, '3b 기사앱 확인 창도 사라짐');

// ⑤ 다음 주 칸 (금요일에 고침) → 기록은 남고 · 아직 안 뜸 · 일요일부터 뜸
call('adm_schSave', [tok, [{ row: X, date: MON, value: '휴무', old: '출근' }]]);
R = seenRows().filter((r) => r.key === MON);
ok(R.length === 1 && !R[0].ack, '4 금요일에 고친 다음 주 월요일 칸 → 기록은 남김 (예전에는 아예 안 남아 끝까지 안 떴음)');
at('2026-11-20T16:00:00');
A = call('api_seen', [TX, []]);
ok(A.changes.length === 0, '5 이번 주가 아니라 아직 기사앱에 안 뜸');
let L = call('adm_seenList', [tok]);
ok(L.rows.filter((r) => r.k === 'sch' && r.key === MON)[0].skip === 1, '6 확인 기록: 「아직 안 보냄 · 그 주 일요일부터」 (미확인으로 안 셈)');
at('2026-11-22T08:00:00'); // 일요일
A = call('api_seen', [TX, []]);
ok(A.changes.length === 1 && A.changes[0].date === MON && A.changes[0].old === '출근' && A.changes[0].value === '휴무', '7 일요일이 되면 그 주 변경으로 뜸');
L = call('adm_seenList', [tok]);
ok(!L.rows.filter((r) => r.k === 'sch' && r.key === MON)[0].skip && L.items[X] && L.items[X].items.some((y) => y.g === 'need' && /11\/23/.test(y.t)), '8 확인 기록 · 챙길 사람에도 「꼭 확인」으로');

// ⑥ 본 내용까지만 확인: 기사가 본 뒤 또 바뀌면 그 확인은 새 값에 안 먹음
const seenAt = A.changes[0].at;
call('adm_schSave', [tok, [{ row: X, date: MON, value: '휴가', old: '휴무' }]]);
let K = call('api_seenAck', [TX, [{ d: MON, at: seenAt }]]);
R = seenRows().filter((r) => r.key === MON);
ok(K.ok && K.n === 0 && !R[0].ack && R[0].text === '휴가', '9 기사가 본 뒤(휴무) 또 바뀜(휴가) → 확인으로 안 침 (예전에는 못 본 새 값까지 확인됨)');
at('2026-11-22T08:20:00');
A = call('api_seen', [TX, []]);
ok(A.changes.length === 1 && A.changes[0].value === '휴가' && A.changes[0].at !== seenAt, '10 새 값으로 다시 뜸');
K = call('api_seenAck', [TX, [{ d: MON, at: A.changes[0].at }]]);
ok(K.ok && K.n === 1 && K.changes.length === 0 && seenRows().filter((r) => r.key === MON)[0].ack, '11 본 값으로 누르면 확인 · 남은 것 없음');
call('adm_schSave', [tok, [{ row: X, date: MON, value: '출근', old: '휴가' }]]);
at('2026-11-22T08:40:00');
K = call('api_seenAck', [TX, [MON]]);
ok(K.ok && K.n === 1, '12 예전 앱(날짜만 보냄)도 그대로 확인됨');

// ② 정산서 메뉴를 끈 기사: 정산서 · 정산서 알림을 세지 않음 (예외 기사는 셈)
ev("appendObj_(SH.PALERT, { id: 'PS1', driverId: " + JSON.stringify(X) + ", kind: 'slip', jobId: 'SL-2026-10', text: '정산서 금액 변경 · x', createdAt: nowText_(), readAt: '' }); appendObj_(SH.PALERT, { id: 'PS2', driverId: " + JSON.stringify(Y) + ", kind: 'slip', jobId: 'SL-2026-10', text: '정산서 금액 변경 · x', createdAt: nowText_(), readAt: '' }); 1");
const items = (pre) => JSON.parse(ev((pre || '') + "seenSlipOwners_ = function () { var o = {}; o[" + JSON.stringify(X) + "] = 1; o[" + JSON.stringify(Y) + "] = 1; return o; }; seenLastClosed_ = function () { return '2026-10'; }; stlDates_ = function () { return { pay: '2026-12-20' }; }; JSON.stringify(seenItems_())"));
const has = (I, id, m) => !!(I[id] && I[id].items.some((y) => y.m === m));
let I = items();
ok(has(I, X, 'slip') && has(I, Y, 'slip'), '13 정산서 메뉴가 켜져 있으면 정산서 · 정산서 알림을 셈');
ev("var r = findRow_(SH.APPSET, 'key', 'appMenu'); if (r) writeFields_(SH.APPSET, r, { value: JSON.stringify({ sched: 1, settle: 0, pm: 1, my: 1 }) }); else appendObj_(SH.APPSET, { key: 'appMenu', value: JSON.stringify({ sched: 1, settle: 0, pm: 1, my: 1 }) }); appendObj_(SH.APPSET, { key: 'appMenuEx', value: JSON.stringify([" + JSON.stringify(Y) + "]) }); cache_().remove('appset'); 1");
I = items("cache_().remove('appset'); ");
ok(!has(I, X, 'slip') && has(I, Y, 'slip'), '14 정산서 메뉴를 「준비 중」으로 끄면 그 기사는 정산서를 안 셈 (기사가 열 수 없음) · 예외 기사(이용석)는 그대로');
const U = JSON.parse(ev("cache_().remove('appset'); seenSlipOwners_ = function () { var o = {}; o[" + JSON.stringify(X) + "] = 1; return o; }; JSON.stringify(seenUnseen_('slip', '2026-10'))"));
ok(!U[X], '15 정산서 「안 연 사람에게 알림」에서도 빠짐');

// ④ 다시 알림 → 기사앱 알림함에도 남김 (앱을 보고 있으면 화면 위 안내로 뜸) · 누르면 홈(CHK-)
call('adm_schSave', [tok, [{ row: X, date: MON, value: '휴무', old: '출근' }]]);
at('2026-11-22T09:00:00');
const rm = call('adm_seenRemind', [tok, { kind: 'drv', driverId: X }]);
const PA = JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).filter(function (a) { return a.kind === 'seen' && String(a.text).indexOf('📅 스케줄이 바뀌었습니다') !== 0; }).map(function (a) { return { d: a.driverId, j: a.jobId, t: a.text }; }))"));
ok(rm.ok && rm.target === 1 && PA.length === 1 && PA[0].d === X && PA[0].j === 'SC-CHK' && /확인할 것이/.test(PA[0].t), '16 (S114 바로 알림 「📅 스케줄이 바뀌었습니다」는 빼고 셈) 다시 알림이 기사앱 알림함에도 남음 · 누르면 홈 (예전 화면은 내 스케줄) (' + JSON.stringify(PA[0]) + ')');
ok(rm.people === 0 && rm.off.length === 1, '17 결과에 받은 기사 수 · 알림 꺼진 기사 이름');
I = JSON.parse(ev("JSON.stringify(seenItems_())"));
ok(!(I[X] && I[X].items.some((y) => /알림/.test(y.t) && y.m !== 'sched')), '18 다시 알림 자체는 「안 읽은 알림」으로 안 셈');
const au0 = JSON.parse(ev("JSON.stringify(seenAutoRemind_())"));
ok(au0.target === 0, '19a (S110) 낮에 사무실이 직접 다시 알림을 보낸 기사는 그날 저녁 자동 다시 알림을 건너뜀');
ev("PropertiesService.getScriptProperties().deleteProperty(SEEN_MAN); _props = null; 1");
const au = JSON.parse(ev("JSON.stringify(seenAutoRemind_())"));
const PA2 = JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).filter(function (a) { return a.kind === 'seen' && String(a.text).indexOf('📅 스케줄이 바뀌었습니다') !== 0; }).length)"));
ok(au.target === 1 && PA2 === 2, '19 저녁 자동 다시 알림도 알림함에 남음 (사무실이 안 보낸 날)');

// ③ 기사앱: 다시 열 때 확인 다시 받기 · CHK- → 홈 · 본 시각까지 보내기
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/function seenResume\(\)/.test(ix) && /addEventListener\('visibilitychange', seenResume\)/.test(ix) && /e\.persisted\) seenResume\(\)/.test(ix), '20 앱을 끄지 않고 화면으로 돌아오면 확인을 다시 받아 옴 (1분에 한 번)');
ok(/String\(id\) === 'SC-CHK'\) \{ show\('home'\)/.test(ix) && ix.indexOf("String(id) === 'SC-CHK'") < ix.indexOf("String(id).indexOf('SC-') === 0"), '21 확인 다시 알림을 누르면 홈으로 가서 [확인했습니다] 다시 확인 (내 스케줄 열기보다 먼저 봄)');
ok(/api\('api_seenAck', token, L\.map\(\(x\) => \(\{ d: x\.date, at: x\.at \|\| '' \}\)\)\)/.test(ix) && /SEEN\.chg = Array\.isArray\(r\.changes\)/.test(ix), '22 [확인했습니다]는 본 변경 시각까지 보냄 · 남은 것은 다시 띄움');
const sync = fs.readFileSync(path.join(SRC, 'IssueSync.gs'), 'utf8');
ok(/seenSchLater_\(a, out\)/.test(sync), '23 이슈로 칸을 쓰는 곳(본인 · 대신 뛴 기사)이 모두 같은 기록을 남김');
