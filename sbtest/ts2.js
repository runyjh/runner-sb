// 동시 저장 시험: 서버 3개 · 저장 60건을 한꺼번에 → 전부 들어갔는지 DB 에서 확인
const { seed, makeServer } = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js');
(async () => {
  const db = makeFakeDb({ lag: 3 }); db.seed(seed.S);
  const srv = [makeServer(db), makeServer(db), makeServer(db)];
  const tok = (await srv[0].call('adm_login', ['boss', '', true], 'login')).out.token;
  const jobs = [];
  for (let i = 0; i < 60; i++) {
    const row = seed.ids[i % 30], day = 1 + Math.floor(i / 30) * 2, date = '2026-11-' + String(day).padStart(2, '0');
    const cur = ((i % 30) + day) % 7 ? '출근' : '휴무';
    jobs.push(srv[i % 3].call('adm_schSave', [tok, [{ row, date, value: '업무' + i, old: cur }]]).then((r) => ({ i, row, date, r })));
  }
  const t0 = Date.now(); const res = await Promise.all(jobs); const ms = Date.now() - t0;
  const bad = res.filter((x) => !x.r.out.ok || x.r.out.saved !== 1);
  const conflicts = res.reduce((s, x) => s + x.r.T.conflicts, 0), runs = res.reduce((s, x) => s + x.r.T.runs, 0);
  // DB 에서 직접 확인
  const sch = [...db.DB.tabs.values()].find((t) => t.tab === 'schedule'); const rows = [...db.DB.rows.values()].filter((r) => r.tab_uid === sch.uid).sort((a, b) => a.pos - b.pos);
  const head = rows[0].cells; let ok = 0;
  res.forEach((x) => { const r = rows.find((y) => y.cells[0] === x.row); if (r && r.cells[head.indexOf(x.date)] === '업무' + x.i) ok++; });
  console.log('저장 60건 · 실패', bad.length, bad.slice(0, 3).map((x) => JSON.stringify(x.r.out).slice(0, 160)), '· DB 확인', ok + '/60', '· 다시 계산', conflicts, '· 실행', runs, '·', ms + 'ms');
  // 세 서버가 같은 모습인지
  const views = await Promise.all(srv.map((s) => s.call('adm_schRange', [tok, '2026-11-01', '2026-11-03'])));
  console.log('세 서버가 같은 칸을 봄', new Set(views.map((v) => JSON.stringify(v.out.cells))).size === 1);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
