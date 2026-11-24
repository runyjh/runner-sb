// S30 관리자앱 휴대폰 스케줄: 품앗이 날을 기사앱처럼 — 받은 날 🤝 캠프 노선 · 맡긴 날 🤝 맡김 → 받은 기사
//  사용: node sbtest/ts22.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const i0 = H.indexOf('  function mobCell(r, dt) {'), i1 = H.indexOf('  // 로그인한 사람의 줄', i0);
const tips = {
  A: { '2026-11-24': [{ from: '한민석', to: '김창호', camp: '인천8캠프', route: '119AB' }] },
  B: { '2026-11-24': [{ from: '김창호', to: '윤진', camp: '강서1캠프', route: '527B' }] },
  C: { '2026-11-24': [{ from: '윤진', to: '이용', camp: '강서1캠프', route: '527B' }] } };
const env = {
  sget: () => '', pmMark: () => '◀', yongParse: () => null, cellNorm: () => null, cellKindRow: () => '', groupRoutes: (x) => x,
  pmOnly: () => true, pmTipList: (r, dt) => (tips[r.row] || {})[dt] || [], shortCamp: (n) => String(n || '').replace(/\s*캠프\s*$/, ''),
  pmLabel: (r) => '🤝 품앗이 ' + r.row,
  // (S199) 코드 합치기 · 사람별 묶기 함수는 화면 코드에서 그대로 가져옴
  pmGroupTips: (() => { const j0 = H.indexOf('  function pmCodesJoin(arr) {'), j1 = H.indexOf('  /** 품앗이 칸에서 숨길 칸 글자'); return j0 < 0 ? null : new Function(H.slice(j0, j1) + ' return pmGroupTips;')(); })() };
const mobCell = new Function(...Object.keys(env), H.slice(i0, i1) + ' return mobCell;')(...Object.values(env));
const a = mobCell({ row: 'A', d: { name: '김창호', camp: '강서1캠프' }, camp: '강서1캠프' }, '2026-11-24');
ok(a.kind === 'pmk' && a.top === '🤝 인천8 119AB' && a.pmRoute === '인천8 119AB' && /받음 · 한민석/.test(a.pill), '1 받은 날 (다른 캠프): 🤝 인천8 119AB · 품앗이 받음 · 한민석');
const b = mobCell({ row: 'B', d: { name: '김창호', camp: '강서1캠프' } }, '2026-11-24');
ok(b.top === '🤝 맡김' && /맡김 → 윤진 527B/.test(b.pill) && !b.pmRoute, '2 맡긴 날: 🤝 맡김 · 품앗이 맡김 → 윤진 527B (S199 코드도)');
const c = mobCell({ row: 'C', d: { name: '이용', camp: '강서1캠프' } }, '2026-11-24');
ok(c.top === '🤝 527B' && c.pmRoute === '527B', '3 받은 날 (같은 캠프): 캠프 이름 없이 🤝 527B');
ok(/c\.kind === 'pmk' && c\.pmRoute \? '🤝 ' \+ c\.pmRoute : base/.test(H) && /c\.kind === 'pmk' && c\.pmRoute\) t = c\.pmRoute/.test(H), '4 캠프 하루 목록 노선 칸 · 예상 물량도 품앗이 노선으로');
