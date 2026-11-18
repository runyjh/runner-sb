// 서버 실행기 시험 (TZ=UTC 로 실행 — 수파베이스 서버와 같은 조건)
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeServer } = require('./server-core.js'), { sbMakeKDate } = require('./kdate.js'), { makeFakeDb } = require('./fake-db.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const E = engineSource(path.join(__dirname, '..', 'runyjh', 'runner-allinone', 'src').replace('/sbtest/..', ''));
const F = new Function(...E.params, E.code);
const KDate = sbMakeKDate();
// 1) 시험 자료: 엔진을 직접 돌려 만든다 (관리자 1 · 캠프 3 · 노선 · 기사 30 · 스케줄 칸)
function seedStore() {
  const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
  ['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
  Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
  const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
  const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
  fresh().ensureColumns_();
  fresh().__sbEval("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.ADMINS, { id: 'A2', loginId: 'op', name: '운영', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); Object.keys(STL_TABS).forEach(function (n) { stlSheet_(n); });");
  const tok = fresh().__sbLogin('boss', true).token;
  ['군포1캠프', '인천7캠프', '시흥2캠프'].forEach((n) => call('adm_campSave', [tok, { name: n, rot: 'D1,D2' }]));
  const camps = call('adm_routeAll', [tok]).camps.map((c) => c.id); const routes = [];
  camps.forEach((cid, i) => { for (let k = 0; k < 4; k++) { const code = (200 + i * 100 + k) + 'AB'; call('adm_routeSave', [tok, { campId: cid, code }]); routes.push([cid, code]); } });
  for (let i = 0; i < 30; i++) { const r = routes[i % routes.length]; call('adm_createDriver', [tok, { name: '기사' + i, loginId: 'd' + i + '@df', driverType: '고정', phone: '010-2' + String(1000000 + i).slice(1), schCampId: r[0], baseRoute: r[1] }]); }
  const ids = call('adm_schRange', [tok, '2026-11-01', '2026-11-30']).drivers.map((d) => d.id);
  const ch = []; ids.forEach((id, i) => { for (let d = 1; d <= 30; d++) ch.push({ row: id, date: '2026-11-' + String(d).padStart(2, '0'), value: (i + d) % 7 ? '출근' : '휴무', old: '' }); });
  call('adm_schSave', [tok, ch]);
  // 세션은 시험마다 새로
  const st = S.books.main.tabs.find((t) => t.name === 'sessions'); st.rows.splice(1);
  S.takeDirty();
  return { S, ids, call, fresh };
}
const seed = seedStore();
module.exports = { seed, F, E, KDate, GAS_NAMES, makeServer: (db, secrets) => sbMakeServer({ engine: F, gasNames: GAS_NAMES, db, secrets: secrets || {}, Date: KDate }) };
if (require.main === module) (async () => {
  const db = makeFakeDb(); db.seed(seed.S);
  const A = module.exports.makeServer(db), B = module.exports.makeServer(db);
  const t0 = Date.now();
  let r = await A.call('adm_login', ['boss', '', true], 'login'); console.log('A 로그인', r.out.ok, 'runs', r.T.runs, 'db', r.T.db, 'ms');
  const tok = r.out.token;
  r = await A.call('adm_check', [tok]); console.log('A check', r.out.ok, r.T);
  r = await A.call('adm_schWeek', [tok, '2026-11-15']); console.log('A schWeek', r.out.ok, 'drivers', (r.out.drivers || []).length, 'runs', r.T.runs, r.T);
  r = await A.call('adm_schWeek', [tok, '2026-11-15']); console.log('A schWeek 두 번째', r.T);
  // 다른 서버(B)에서 같은 토큰으로 → 세션이 DB 를 통해 보여야 함
  r = await B.call('adm_check', [tok]); console.log('B 같은 토큰 check', r.out.ok, r.out.msg || '', r.T);
  // 날짜: 오늘 (한국) — 서버는 UTC
  const today = await A.call('', ["Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd') + ' / ' + todayText_() + ' / ' + new Date(2026,10,18).getDate()"], 'eval'); console.log('날짜', today.out, '(TZ=' + process.env.TZ + ')');
  // 저장 → 다른 서버가 바로 봄
  const id = seed.ids[0];
  r = await A.call('adm_schSave', [tok, [{ row: id, date: '2026-11-20', value: '휴무', old: '출근' }]]); console.log('A 칸 저장', r.out.ok, r.out.saved, r.T);
  r = await B.call('adm_schRange', [tok, '2026-11-15', '2026-11-28']); console.log('B 가 읽은 칸', r.out.cells[id]['2026-11-20'], r.T);
  // 동시 저장 (A·B 가 같은 시각에 다른 칸) → 둘 다 저장, 한쪽은 다시 계산
  const [x, y] = await Promise.all([A.call('adm_schSave', [tok, [{ row: seed.ids[1], date: '2026-11-21', value: '휴무', old: '출근' }]]), B.call('adm_schSave', [tok, [{ row: seed.ids[2], date: '2026-11-21', value: '휴무', old: '출근' }]])]);
  console.log('동시 저장', x.out.saved, y.out.saved, 'conflicts', x.T.conflicts + y.T.conflicts);
  // 같은 칸을 둘이 다르게 (화면에 있던 값 old 기준) → 뒤쪽은 conflicts 로 돌려받아야 함
  const [p, q] = await Promise.all([A.call('adm_schSave', [tok, [{ row: seed.ids[4], date: '2026-11-22', value: '휴무', old: '출근' }]]), B.call('adm_schSave', [tok, [{ row: seed.ids[4], date: '2026-11-22', value: '업무', old: '출근' }]])]);
  console.log('같은 칸 충돌', JSON.stringify([p.out.saved, p.out.conflicts && p.out.conflicts.length, q.out.saved, q.out.conflicts && q.out.conflicts.length]));
  // 메모 저장·삭제
  r = await B.call('adm_memoSave', [tok, { date: '2026-11-18', content: '서버 시험 메모' }]); console.log('B 메모', r.out.ok);
  r = await A.call('adm_memoMonth', [tok, '2026-11']); console.log('A 가 본 메모', JSON.stringify(r.out).includes('서버 시험 메모'));
  // 손으로 표를 고친 경우
  db.manualEdit('drivers', '기사5', 3, '기사오');
  r = await A.call('adm_listDrivers', [tok]); console.log('손으로 고친 이름 반영', JSON.stringify(r.out).includes('기사오'));
  // 다른 화면들
  for (const fn of ['adm_home', 'adm_routeAll', 'adm_issueList', 'adm_pmList', 'adm_noticeList', 'adm_stlMonth', 'adm_homeStl', 'adm_uiText', 'adm_batch']) {
    const args = fn === 'adm_stlMonth' ? [tok, '2026-10'] : fn === 'adm_batch' ? [tok, [{ fn: 'adm_uiText', args: [tok] }, { fn: 'adm_check', args: [tok] }, { fn: 'adm_listDrivers', args: [tok] }]] : [tok];
    r = await A.call(fn, args); console.log(('  ' + fn).padEnd(18), r.out && r.out.ok === false ? 'FAIL ' + r.out.msg : 'ok', 'runs', r.T.runs, 'eng', Math.round(r.T.eng) + 'ms');
  }
  console.log('A', JSON.stringify(A.stat()), '\nB', JSON.stringify(B.stat()), '\nDB 부름', db.DB.calls.length, '· 전체', Date.now() - t0, 'ms');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
