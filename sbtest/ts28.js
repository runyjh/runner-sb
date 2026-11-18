// S38 예약 작업 실패 알림: 실패하면 서버 오류 기록 + 대시보드 '자동 작업이 멈췄습니다' 경고 · 그 뒤에 성공하면 사라짐 (TZ=UTC)
//  사용: node sbtest/ts28.js
const T1 = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js'), { sbMakeHandler } = require('./api-handler.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = makeFakeDb(); db.seed(T1.seed.S);
  const A = T1.makeServer(db);
  const logged = [];
  let boom = true;
  const core = { call: (fn, args, mode) => { if (mode === 'cron' && boom) return Promise.reject(new Error('invalid input syntax for type uuid')); return A.call(fn, args, mode); } };
  const H = sbMakeHandler({ core: async () => core, db: { errLog: async (fn, msg) => { logged.push(fn + ' ' + msg); } }, who: async () => null, allowed: async () => true, cronOk: async (k) => k === 'sbcron_k', origins: ['https://runyjh.github.io'] });
  const post = (b) => H(new Request('https://x/api', { method: 'POST', headers: { authorization: 'Bearer sbcron_k', 'content-type': 'application/json' }, body: JSON.stringify(b) }));
  const items = async () => (await A.call('', ["JSON.stringify(hbItems_(true))"], 'eval')).out;
  // 1. 실패 → 500 + 기록 + 경고
  let r = await post({ op: 'cron', fn: 'firstRunNotify' });
  ok(r.status === 500, '1 실패하면 500');
  ok(logged.length === 1 && /^cron:firstRunNotify invalid input/.test(logged[0]), '2 서버 오류 기록에 남음 (' + logged[0] + ')');
  let it = JSON.parse(await items());
  ok(it.items.length === 1 && it.items[0].k === 'hb' && it.items[0].list.some((x) => /처음 가는 노선 알림 실패/.test(x) && /uuid/.test(x)), '3 대시보드 경고: ' + (it.items[0] ? it.items[0].list.join(' / ') : '없음'));
  // 2. 그 뒤에 성공 → 경고 사라짐 · 마지막 실행 시각 보임
  boom = false; await new Promise((f) => setTimeout(f, 5));
  r = await post({ op: 'cron', fn: 'firstRunNotify' });
  ok(r.status === 200, '4 다시 돌면 200');
  it = JSON.parse(await items());
  ok(!it.items.length, '5 성공한 뒤에는 경고 없음');
  ok(it.rows.some((x) => /처음 가는 노선 알림\(매일 18시\): 20/.test(x)), '6 마지막 실행 시각 표시 (' + it.rows.filter((x) => /처음/.test(x))[0] + ')');
  // 3. 새벽 작업 실패도 같은 방식
  boom = true; r = await post({ op: 'cron', fn: 'cleanupSessions' });
  it = JSON.parse(await items());
  ok(r.status === 500 && it.items.length === 1 && it.items[0].list.some((x) => /새벽 작업 실패/.test(x)), '7 새벽 작업 실패 경고');
  // 4. 열쇠가 틀리면 기록도 안 함
  const n0 = logged.length;
  r = await H(new Request('https://x/api', { method: 'POST', headers: { authorization: 'Bearer sbcron_bad', 'content-type': 'application/json' }, body: JSON.stringify({ op: 'cron', fn: 'firstRunNotify' }) }));
  ok(r.status === 401 && logged.length === n0, '8 열쇠가 틀리면 401 · 기록 없음');
})();
