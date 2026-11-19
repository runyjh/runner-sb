// S47 같이 짜기: 바뀌면 그때 답하기(live-core) · 보고 있는 칸 · 서버 함수 길 · 화면 연결 (TZ=UTC)
//  사용: node sbtest/ts38.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeLive } = require('./live-core.js'), { sbMakeHandler } = require('./api-handler.js');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const tick = () => new Promise((f) => setImmediate(f));
(async () => {
  // 가짜 시계 · 가짜 DB 신호
  let now = 1000000, timers = [], listeners = 0, subs = [], areas = JSON.stringify({ sch: 100, schBy: 'a', pm: 50, nb: 10 }), unl = 0, listenN = 0;
  const run = (ms) => { now += ms; timers.filter((t) => !t.off && t.at <= now).sort((a, b) => a.at - b.at).forEach((t) => { t.off = true; t.fn(); }); };
  const mk = () => sbMakeLive({
    now: () => now, setTimeout: (fn, ms) => { const t = { fn, at: now + ms, off: false }; timers.push(t); return t; }, clearTimeout: (t) => { if (t) t.off = true; },
    listeners: async () => listeners, readAreas: async () => areas,
    listen: async (ch, onMsg, onListen) => { listenN++; const s = { onMsg, unlisten: () => { unl++; subs.splice(subs.indexOf(s), 1); } }; subs.push(s); return s; },
    notify: async (ch, t) => { subs.slice().forEach((s) => s.onMsg(t)); }
  });
  const dbChange = (o) => { areas = JSON.stringify(o); subs.slice().forEach((s) => s.onMsg('A' + areas)); };
  const L = mk();
  // 1. 처음: 바로 답 · 지금 값
  let r = await L.wait({ first: true, id: 'a:1' });
  ok(r.ok && r.schAt === 100 && r.pmAt === 50 && r.nbAt === 10 && r.ph === '[]' && listenN === 1, '1 처음에는 바로 답 (지금 값) · 듣기 시작');
  // 2. 같은 값이면 기다림 → 스케줄이 바뀌는 순간 답
  let got = null; L.wait({ schAt: 100, pmAt: 50, nbAt: 10, ph: '[]', id: 'a:1' }).then((x) => { got = x; });
  await tick(); await tick();
  ok(got === null && L.stat().waiters === 1, '2 바뀐 게 없으면 쥐고 기다림');
  dbChange({ sch: 200, schBy: 'b', pm: 50, nb: 10 }); await tick();
  ok(got && got.schAt === 200 && got.schBy === 'b' && !got.idle && L.stat().waiters === 0, '3 스케줄이 바뀌면 바로 답 (바꾼 사람 포함)');
  // 3. 25초 동안 안 바뀌면 "변화 없음"
  got = null; L.wait({ schAt: 200, pmAt: 50, nbAt: 10, ph: '[]', id: 'a:1' }).then((x) => { got = x; });
  await tick(); await tick(); run(24000); await tick(); ok(got === null, '4 24초: 아직 기다림');
  run(1500); await tick(); ok(got && got.idle === true && got.schAt === 200, '5 25초: 변화 없음으로 답');
  // 4. 이미 바뀌어 있으면 기다리지 않음
  r = await L.wait({ schAt: 100, pmAt: 50, nbAt: 10, ph: '[]', id: 'a:1' });
  ok(r.schAt === 200, '6 놓친 변경이 있으면 바로 답');
  // 5. 보고 있는 칸: 남의 것만 · 내 것은 나를 깨우지 않음
  let gA = null, gB = null;
  L.wait({ schAt: 200, pmAt: 50, nbAt: 10, ph: '[]', id: 'a:1' }).then((x) => { gA = x; });
  L.wait({ schAt: 200, pmAt: 50, nbAt: 10, ph: '[]', id: 'b:1' }).then((x) => { gB = x; });
  await tick(); await tick();
  await L.here({ id: 'a:1', who: 'a', name: '유정훈', sel: 'D1|2026-11-20', view: '강서1 · 11월' }); await tick();
  ok(gA === null && gB && gB.pres.length === 1 && gB.pres[0].name === '유정훈' && gB.pres[0].sel === 'D1|2026-11-20', '7 A 가 칸을 고르면 B 만 받음 (A 자신은 안 깨움)');
  const phB = gB.ph;
  r = await L.wait({ first: true, id: 'a:1' }); ok(r.pres.length === 0, '8 A 에게는 자기 칸이 안 내려감');
  // 6. 나가면 사라짐 · 30초 소식 없으면 사라짐
  gB = null; L.wait({ schAt: 200, pmAt: 50, nbAt: 10, ph: phB, id: 'b:1' }).then((x) => { gB = x; }); await tick(); await tick();
  await L.here({ id: 'a:1', who: 'a', gone: true }); await tick();
  ok(gB && gB.pres.length === 0, '9 A 가 화면을 떠나면 B 화면에서 사라짐');
  await L.here({ id: 'a:1', who: 'a', name: '유정훈', sel: 'D1|2026-11-21' }); run(31000);
  r = await L.wait({ first: true, id: 'b:1' }); ok(r.pres.length === 0, '10 30초 동안 소식이 없으면 사라짐');
  // 7. 기다리는 요청이 없으면 30초 뒤 듣기를 끊음 (DB 연결 돌려줌) · 다시 오면 다시 들음
  gA = null; timers.forEach((t) => { t.off = true; }); // 남은 기다림 정리
  const L2 = mk(); const n0 = listenN, u0 = unl;
  await L2.wait({ first: true, id: 'c:1' }); ok(L2.stat().on && listenN === n0 + 1, '11 새 서버: 듣기 시작');
  run(29000); await tick(); ok(unl === u0, '12 29초: 아직 듣는 중');
  run(2000); await tick(); ok(unl === u0 + 1 && !L2.stat().on, '13 30초 동안 기다리는 요청이 없으면 듣기 끊음');
  await L2.wait({ first: true, id: 'c:1' }); ok(listenN === n0 + 2, '14 다시 오면 다시 들음');
  // 8. 듣는 연결이 이미 많으면 기다리지 않고 busy · 1분 동안은 다시 세지도 않음
  listeners = 6; const L3 = mk();
  r = await L3.wait({ first: true, id: 'd:1' }); ok(r.ok === false && r.busy === true, '15 듣는 연결이 6개 넘으면 busy (화면은 60초 확인으로)');
  listeners = 0; r = await L3.wait({ first: true, id: 'd:1' }); ok(r.busy === true, '16 1분 동안은 계속 busy');
  run(61000); r = await L3.wait({ first: true, id: 'd:1' }); ok(r.ok === true, '17 1분 뒤 다시 됨');
  // 9. 이상한 입력
  r = await L.here({}); ok(r.ok === false, '18 아이디 없는 알림은 무시');
  await L.here({ id: 'x:1', who: 'x', name: 'N'.repeat(500), sel: 'S'.repeat(500) }); r = await L.wait({ first: true, id: 'q:1' });
  ok(r.pres.length === 1 && r.pres[0].name.length === 40 && r.pres[0].sel.length === 80, '19 너무 긴 글자는 잘라 냄');
  // 10. 서버 함수 길: 로그인 필요 · 서버 프로그램(core)을 안 거침
  let coreCalls = 0;
  const H = sbMakeHandler({ core: async () => { coreCalls++; throw new Error('core 를 부르면 안 됨'); }, db: {}, who: async (t) => (t === 'good' ? 'u1' : null), allowed: async () => true, live: { wait: async (d) => ({ ok: true, echo: d.id }), here: async () => ({ ok: true }) }, origins: ['https://runyjh.github.io'] });
  const post = (tok, b) => H(new Request('https://x/api', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify(b) }));
  let h = await post('bad', { op: 'live-wait', data: { id: 'a' } }); ok(h.status === 401, '20 로그인 없이는 401');
  h = await post('good', { op: 'live-wait', data: { id: 'a' } }); const hj = await h.json(); ok(h.status === 200 && hj.echo === 'a' && coreCalls === 0, '21 로그인하면 됨 · 서버 프로그램을 거치지 않음');
  h = await post('good', { op: 'live-here', data: { id: 'a' } }); ok(h.status === 200 && coreCalls === 0, '22 칸 알리기도 같은 길');
  // 11. 화면 · 서버 함수 틀
  const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), boot = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8'), tpl = fs.readFileSync(path.join(__dirname, 'index.template.ts'), 'utf8');
  ok(/name !== 'live-wait' && name !== 'live-here'/.test(boot) && /window\.__sbOp = /.test(boot), '23 화면이 쓸 수 있는 작업은 두 가지뿐');
  ok(/__LIVE__/.test(tpl) && /sql\.listen\(ch, onMsg, onListen\)/.test(tpl) && /live, rate: db\.rate/.test(tpl), '24 서버 함수에 연결됨');
  ok(/liveLater\('sched', liveSched, LW\.on \? 150 : 1500\)/.test(adm) && /LIVE\.poll = setInterval\(tick, 60000\)/.test(adm), '25 연결 중이면 바로 반영 · 60초 확인은 그대로 남음');
  ok(/try \{ presPaint\(\); presMine\(\); \}/.test(adm) && /id="sPres"/.test(adm) && /presAt\(srows\[sAct\.r\]\.row/.test(adm), '26 칸 표시 · 이름 표시 · 같은 칸 안내');
  ok(/LW\.fail >= 3\) \{ LW\.fail = 0; LW\.pauseUntil = Date\.now\(\) \+ 300000; break; \}/.test(adm), '27 세 번 이어 실패하면 5분 쉼');
})();
