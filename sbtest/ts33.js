// S43 서버: 기능별 필요한 탭 목록을 DB(__learn)에 기억 → 새로 시작한 서버도 첫 실행 전에 한 번에 받음 (서버 함수는 200초마다 새로 시작)
//  사용: TZ=UTC node sbtest/ts33.js <runner-allinone 폴더>
const T1 = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const db = makeFakeDb(); db.seed(T1.seed.S);
  const propOf = (k) => { const p = db.DB.props.get(k); return p ? (p.v !== undefined ? p.v : p) : ''; };
  const A = T1.makeServer(db);
  const tok = (await A.call('adm_login', ['boss', '', true], 'login')).out.token;
  // 1. 처음 서버: 탭이 없어 다시 실행 (지금까지와 같음)
  const a1 = await A.call('adm_routeAll', [tok]);
  ok(a1.out.ok && a1.T.runs >= 2 && (a1.T.load || []).length > 0, '1 처음 서버: 탭을 받고 다시 실행 (실행 ' + a1.T.runs + '번 · 받은 탭 ' + (a1.T.load || []).length + '개)');
  await A.call('adm_live', [tok]); await wait(50);
  const saved = JSON.parse(String(propOf('__learn') || '{}'));
  ok(Array.isArray(saved.adm_routeAll) && saved.adm_routeAll.length === a1.T.load.length, '2 배운 목록을 DB 에 적음 (adm_routeAll ' + (saved.adm_routeAll || []).length + '개)');
  // 2. 새로 시작한 서버: 첫 실행 전에 한 번에 받음
  const B = T1.makeServer(db);
  const b1 = await B.call('adm_routeAll', [tok]);
  ok(b1.out.ok && b1.T.runs === 1 && !b1.T.load, '3 새 서버: 한 번에 실행 (실행 ' + b1.T.runs + '번)');
  ok(JSON.stringify(b1.out) === JSON.stringify(a1.out), '  결과는 같음');
  // 3. 묶음 호출은 들어 있는 기능 이름으로 구분
  const calls = [{ fn: 'adm_pmList', args: [tok, {}] }, { fn: 'adm_memoMonth', args: [tok, '2026-11'] }];
  const c1 = await B.call('adm_batch', [tok, calls]); await wait(20100); await B.call('adm_live', [tok]); await wait(50);
  const saved2 = JSON.parse(String(propOf('__learn') || '{}')), bk = 'adm_batch:adm_memoMonth,adm_pmList';
  ok(c1.T.runs >= 2 && Array.isArray(saved2[bk]) && saved2[bk].length > 0 && !saved2.adm_batch, '4 묶음 호출: "' + bk + '" 로 기억 (' + (saved2[bk] || []).length + '개)');
  const C = T1.makeServer(db), c2 = await C.call('adm_batch', [tok, calls.slice().reverse()]);
  ok(c2.T.runs === 1, '  새 서버 · 순서가 달라도 한 번에 (실행 ' + c2.T.runs + '번)');
  // 4. 큰 기록 탭은 적지 않음 · 점검(dry)은 적지 않음 · 설정값은 엔진에서 그대로
  const src = require('fs').readFileSync(require('path').join(__dirname, 'server-core.js'), 'utf8');
  ok(/LEARN_BIG = 4000/.test(src) && /if \(!big\[t\] && list\.indexOf\(t\) < 0\)/.test(src), '5 4,000줄 넘는 탭(정산 원본 · 속도 기록)은 적지 않음');
  const before = String(propOf('__learn'));
  await C.call('', ["readAll_(SH.NOTICE || 'notices').length"], 'dry'); await wait(50);
  ok(String(propOf('__learn')) === before, '6 점검(읽기만) 호출은 목록을 바꾸지 않음');
  const d = await C.call('adm_listDrivers', [tok]); ok(d.out.ok, '7 그 뒤 호출 정상');
  // 5. 목록이 깨져 있어도 그냥 넘어감
  const D = T1.makeServer(db); db.DB.props.set('__learn', typeof db.DB.props.get('__learn') === 'object' ? Object.assign({}, db.DB.props.get('__learn'), { v: '{깨짐' }) : '{깨짐');
  const e = await D.call('adm_listDrivers', [tok]); ok(e.out.ok, '8 목록 글자가 깨져 있어도 정상 동작');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
