// S37 서버: 기록 탭(admin_log) 끝에 붙이기 — 안 받은 탭이면 줄 전체를 받지 않고 새 줄만 보냄 · 스케줄 저장이 기록 탭(수천 줄)을 받느라 느려지던 것 (TZ=UTC)
//  사용: node sbtest/ts27.js
const T1 = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = makeFakeDb(); db.seed(T1.seed.S);
  // 기록 탭에 미리 줄 500개 (실제 3,000줄)
  const P = T1.makeServer(db);
  let r = await P.call('', ["const sh = sheet_(SH.ALOG); const v = []; for (let i = 0; i < 500; i++) v.push(['2026-11-01 00:00:00', '옛 기록', '이전 ' + i, '', '']); sh.getRange(sh.getLastRow() + 1, 1, v.length, 5).setValues(v); sh.getLastRow()"], 'eval');
  const before = r.out;
  ok(before >= 501, '0 기록 탭 줄 ' + before);
  r = await P.call('adm_login', ['boss', '', true], 'login'); const tok = r.out.token;
  const A = T1.makeServer(db), B = T1.makeServer(db); // A = 막 뜬 서버 (기록 탭을 아직 안 받음)
  await A.call('adm_schWeek', [tok, '2026-11-15']);
  // 1. 저장 → 기록 탭은 받지 않음
  r = await A.call('adm_schSave', [tok, [{ row: T1.seed.ids[0], date: '2026-11-20', value: '휴무', old: '출근' }]]);
  ok(r.out.ok, '1 칸 저장 됨');
  ok(!(r.T.load || []).includes('main:admin_log'), '2 저장할 때 기록 탭(admin_log)을 받지 않음 (받은 탭: ' + ((r.T.load || []).join(',') || '없음') + ')');
  r = await A.call('adm_schSave', [tok, [{ row: T1.seed.ids[0], date: '2026-11-20', value: '업무', old: '휴무' }]]);
  ok(r.out.ok && r.out.saved === 1 && r.T.runs === 1, '3 두 번째 저장도 한 번에 (runs ' + r.T.runs + ')');
  // 2. 다른 서버(B)에서 기록을 읽으면 맨 끝에 두 줄 · 순서대로
  r = await B.call('', ["const v = sheet_(SH.ALOG).getDataRange().getValues(); JSON.stringify({ n: v.length, last: v.slice(-2).map(function (x) { return x[2] + '|' + x[4]; }), maxRows: sheet_(SH.ALOG).getMaxRows() })"], 'eval');
  const o = JSON.parse(r.out);
  ok(o.n === before + 2, '4 기록 줄 수 = 원래 + 2 (' + o.n + ')');
  ok(o.last[0] === '스케줄 수정|2026-11-20' && o.last[1] === '스케줄 수정|2026-11-20' && o.n === before + 2, '5 새 기록이 맨 끝에 순서대로 (' + o.last.join(' / ') + ')');
  ok(o.maxRows >= o.n, '6 탭 크기(maxRows ' + o.maxRows + ')도 늘어남');
  // 3. 기록 탭을 받아 둔 서버(B)의 저장은 원래 방식 · 이어서 A 의 빠른 기록도 그 뒤에
  r = await B.call('adm_schSave', [tok, [{ row: T1.seed.ids[1], date: '2026-11-22', value: '휴무', old: '출근' }]]);
  ok(r.out.ok, '7 받아 둔 서버(B) 저장 됨');
  r = await A.call('adm_schSave', [tok, [{ row: T1.seed.ids[1], date: '2026-11-23', value: '휴무', old: '출근' }]]);
  r = await B.call('', ["const v = sheet_(SH.ALOG).getDataRange().getValues(); JSON.stringify(v.slice(-2).map(function (x) { return x[4]; }))"], 'eval');
  ok(r.out === JSON.stringify(['2026-11-22', '2026-11-23']), '8 두 서버 기록이 시간 순서대로 이어짐 (' + r.out + ')');
  // 4. 같은 실행에서 기록 탭을 읽기도 하면 → 받고 다시 실행 (원래 방식) · 줄이 두 번 들어가지 않음
  r = await A.call('', ["logAdmin_({ name: '대표', loginId: 'boss' }, '시험 기록', 'x', 'y'); sheet_(SH.ALOG).getLastRow()"], 'eval');
  const n2 = r.out;
  r = await B.call('', ["sheet_(SH.ALOG).getDataRange().getValues().filter(function (x) { return x[2] === '시험 기록'; }).length + '/' + sheet_(SH.ALOG).getLastRow()"], 'eval');
  ok(r.out === '1/' + n2, '9 기록하고 바로 읽는 실행: 한 줄만 · 줄 수 맞음 (' + r.out + ')');
  // 5. 오류 기록(errLog_)이 모든 탭을 받지 않음 (유지보수 사본은 새벽 작업 · [다시 점검] 때만)
  const C = T1.makeServer(db);
  r = await C.call('', ["errLog_('안내', 'adm_test', '시험 안내 ' + Date.now()); 1"], 'eval');
  ok((r.T.load || []).length <= 2 && !(r.T.load || []).some((k) => /^stl:/.test(k)), '10 오류 기록: 받은 탭 ' + (r.T.load || []).length + '개 (' + (r.T.load || []).join(',') + ') · 정산 탭 안 받음');
  const D = T1.makeServer(db);
  r = await D.call('adm_schSave', [tok, [{ row: T1.seed.ids[2], date: '2026-11-24', value: '휴무', old: '' }]]);
  ok(r.out.ok && (r.T.load || []).length <= 3, '11 막 뜬 서버의 첫 저장: 받은 탭 ' + (r.T.load || []).length + '개 (' + (r.T.load || []).join(',') + ')');
})();
