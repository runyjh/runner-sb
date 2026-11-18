// 7단계 점검 도구 시험 (TZ=UTC): 점검(dry)은 DB 에 아무것도 남기지 않는다 · 외부 연결 안 함 · 점검용 열쇠로만
const T1 = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js'), { sbMakeServer } = require('./server-core.js'), { sbMakeExt } = require('./ext.js'), { sbMakeHandler } = require('./api-handler.js'), CK = require('./checks/make.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = makeFakeDb(); db.seed(T1.seed.S);
  let ext = 0;
  const A = sbMakeServer({ engine: T1.F, gasNames: T1.GAS_NAMES, db, storage: db.storage, secrets: {}, ext: sbMakeExt({ fetch: async () => { ext++; throw new Error('x'); } }), Date: T1.KDate });
  await A.call('adm_login', ['boss', '', true], 'login');
  const snap = () => JSON.stringify([db.DB.seq, db.DB.rows.size, db.DB.props.size]);
  const before = snap();
  let r = await A.call('', ["appendObj_(SH.MEMO || 'work_memo', { id: 'X1', content: '점검이 쓴 줄' }); PropertiesService.getScriptProperties().setProperty('CHK', '1'); cache_().put('chk', '1', 60); try { UrlFetchApp.fetch('https://fcm.googleapis.com/x'); } catch (e) { String(e.message) }"], 'dry');
  ok(snap() === before && r.T.dropped > 0, '1 점검 중 쓴 것은 버림 (버린 것 ' + r.T.dropped + ' · DB 그대로)');
  ok(/외부 연결을 하지 않습니다/.test(String(r.out)) && ext === 0, '  외부 연결 안 함: ' + r.out);
  r = await A.call('', ["props_().CHK || cache_().get('chk') || '없음'"], 'eval'); ok(r.out === '없음', '  다음 호출에도 흔적 없음: ' + r.out);
  const N = CK.list.length; let bad = [], n = 0;
  for (let i = 0; i < N; i += 12) { r = await A.call('', [CK.sweep(i, i + 12)], 'dry'); if (!Array.isArray(r.out)) { bad.push(['batch ' + i, JSON.stringify(r.out).slice(0, 200)]); continue; } r.out.forEach((x) => { n++; if (x[1] === 'throw' || (x[1] === 'no' && /안 됩니다|서버 오류|not defined|undefined/.test(x[2]))) bad.push(x); }); }
  ok(n === N && !bad.length, '2 읽기 기능 ' + n + '/' + N + '개 돌림 · 문제 ' + bad.length + (bad.length ? ' ' + JSON.stringify(bad).slice(0, 600) : ''));
  ok(snap() === before, '  돌린 뒤에도 DB 그대로');
  r = await A.call('', [CK.stl(['2026-11'])], 'dry'); ok(Array.isArray(r.out) && r.out[0][1] !== 'throw', '3 정산 합계 점검: ' + JSON.stringify(r.out).slice(0, 200));
  const H = sbMakeHandler({ core: async () => A, db: {}, who: async (t) => (t === 'sbtest_k' ? 'test' : t === 'user' ? 'u1' : null), allowed: async () => true, origins: ['https://runyjh.github.io'] });
  const post = (tok) => H(new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: JSON.stringify({ op: 'check', data: { src: '1+1' } }) }));
  ok((await post('user')).status === 403, '4 보통 관리자 로그인으로는 점검 기능 못 씀 → 403');
  const j = await (await post('sbtest_k')).json(); ok(j.out === 2, '  점검용 열쇠 → 실행 ' + JSON.stringify(j.out));
  // 5. 가져오기가 끝나면 함께 쓰는 임시 기억을 비움 (2026-11-18: 정산 DB 를 다시 가져온 뒤 예전 색인이 남아 마감 목록이 비어 보였음)
  let cleared = 0;
  const H2 = sbMakeHandler({ core: async () => A, db: { cacheClear: async () => { cleared++; } }, who: async () => 'u1', allowed: async () => true, origins: ['https://runyjh.github.io'] });
  const res = await H2(new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer user' }, body: JSON.stringify({ op: 'imp-end' }) }));
  ok(res.status === 200 && cleared === 1, '5 가져오기 끝 → 임시 기억 비움 (' + cleared + '번)');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
