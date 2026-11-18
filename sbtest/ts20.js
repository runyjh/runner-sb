// S26 담당 없음 노선을 날짜별로: 노선 변경 예약으로 12/2 부터 담당이 생기는 919CD → 그 전까지 '담당 없음' 줄 · 12/2 부터 빗금
//  사용: node sbtest/ts20.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const i0 = H.indexOf('const SchedCalc = (function () {'), i1 = H.indexOf('return { compute, routeExpand, isWorkDay };', i0);
const SchedCalc = new Function(H.slice(i0, i1) + 'return { compute, routeExpand, isWorkDay }; })(); return SchedCalc;')();
const j0 = H.indexOf('  let UNOFF = null;'), j1 = H.indexOf('  // ── 담당 없음 노선: 그날 누가 뛰는지');
const dates = ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'];
const SD = { dates, camps: [{ id: 'I7', name: '인천7캠프' }, { id: 'K1', name: '강서1캠프' }], routes: { I7: ['919CD', '917CD'], K1: ['527B'] },
  drivers: [
    { id: 'H', name: '황의식', status: '승인', campId: 'K1', baseRoute: '백업', segs: [{ from: '2026-12-02', to: '2026-12-03', campId: 'I7', baseRoute: '919CD' }] },
    { id: 'A', name: '김', status: '승인', campId: 'I7', baseRoute: '917CD' },
    { id: 'B', name: '박', status: '승인', campId: 'K1', baseRoute: '527B' },
    { id: 'C', name: '최', status: '승인', campId: 'K1', baseRoute: '백업', segs: [{ from: '2026-11-29', to: '2026-12-03', campId: 'K1', baseRoute: '527B' }] }] };
const shortCamp = (n) => String(n || '').replace(/\s*캠프\s*$/, '');
const drvGone = new Function(H.match(/const drvGone = [^\n]*;/)[0] + ' return drvGone;')();
const F = new Function('SD', 'SchedCalc', 'ymdLocal', 'koSort', 'shortCamp', 'drvGone', H.slice(j0, j1) + ' return { unassignedRoutes, unOffAt };')(SD, SchedCalc, () => '2026-11-18', (a, b) => String(a).localeCompare(String(b)), shortCamp, drvGone);
const UN = F.unassignedRoutes();
ok(JSON.stringify(UN.I7) === '["919CD"]' && !UN.K1, '1 인천7 919CD 는 담당 없음 줄이 나옴 (12/2 전까지 담당 없음) · 917CD · 527B 는 안 나옴');
ok(!F.unOffAt('I7', '919C', '2026-12-01') && F.unOffAt('I7', '919C', '2026-12-02') && F.unOffAt('I7', '919D', '2026-12-03'), '2 12/1 까지는 열린 칸 · 12/2 부터 빗금 (황의식 담당)');
// 3. 이전 방식이었다면 919CD 는 늘 담당으로 보여 줄이 없었음 → 날짜별로 바뀐 것 확인
ok(/const sg = \(d\.segs \|\| \[\]\)\.find/.test(H) && /if \(c\.off\) return \{ html: '', cls: 'uc-off' \}/.test(H), '3 칸 그리기: 담당이 생긴 날은 빗금 칸 (uc-off) · 눌러도 배정 창 안 열림');
// 4. 노선 이관 (서초1 404 → F_삼성1 204 · 11/19): 옮겨 가기 전 담당이 있던 404 는 이관 날부터 없는 노선 · 204 는 이관 전에는 없는 노선 → 담당 없음 줄 안 생김
{
  const D2 = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  const SD2 = { dates: D2, camps: [{ id: 'S', name: '서초1캠프' }, { id: 'F', name: 'F_삼성1캠프', parent: 'S' }], routes: { S: ['404ABCD', '410AB'], F: ['204ABCD'] },
    routeMoves: [{ date: '2026-11-19', fromCamp: '서초1캠프', from: '404', toCamp: 'F_삼성1캠프', to: '204' }],
    drivers: [
      { id: 'Y', status: '승인', campId: 'S', baseRoute: '404ABCD', segs: [{ from: '2026-11-17', to: '2026-11-18', campId: 'S', baseRoute: '404ABCD' }, { from: '2026-11-19', to: '2026-11-20', campId: 'F', baseRoute: '204ABCD' }] },
      { id: 'Z', status: '승인', campId: 'S', baseRoute: '410AB' }] };
  const G = new Function('SD', 'SchedCalc', 'ymdLocal', 'koSort', 'shortCamp', 'drvGone', H.slice(j0, j1) + ' return { unassignedRoutes, unOffAt };')(SD2, SchedCalc, () => '2026-11-18', (a, b) => String(a).localeCompare(String(b)), shortCamp, drvGone);
  const U2 = G.unassignedRoutes();
  ok(!U2.S && !U2.F, '4 노선 이관: 서초1 404ABCD · F_삼성1 204ABCD 에 담당 없음 줄이 생기지 않음 (' + JSON.stringify(U2) + ')');
  const SD3 = Object.assign({}, SD2, { routeMoves: [] });
  const U3 = new Function('SD', 'SchedCalc', 'ymdLocal', 'koSort', 'shortCamp', 'drvGone', H.slice(j0, j1) + ' return { unassignedRoutes };')(SD3, SchedCalc, () => '2026-11-18', (a, b) => String(a).localeCompare(String(b)), shortCamp, drvGone).unassignedRoutes();
  ok(U3.S && U3.F, '5 (이관 기록이 없으면 날짜별로 비는 날이 있어 담당 없음 줄이 나옴 — 이관 규칙이 막아 준 것 확인)');
}
// 6. 담당 없음 줄 끼우는 순서도 서브캠프 정렬과 같게
ok(/const ckey = \(c\) => campSortKey\(c, SD\.camps\)/.test(H) && /filter\(\(c\) => koSort\(ckey\(c\), nm\) < 0\)/.test(H), '6 담당 없음 줄 순서 = 캠프 정렬(서브캠프 포함)과 같음 (시흥2 · 인천7 줄이 F_삼성1 위에 끼지 않음)');
// 7. 퇴사 예정 기사 (전성남 · 마지막 근무 11/18 → 서버가 주는 퇴사일 = 11/19): 그 날부터 527B 담당 없음
{
  const D4 = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  const SD4 = { dates: D4, camps: [{ id: 'K', name: '강서1캠프' }], routes: { K: ['527B', '529AB'] }, routeMoves: [],
    drivers: [{ id: 'J', status: '승인', workStatus: '퇴사', leaveDate: '2026-11-19', campId: 'K', baseRoute: '527B' }, { id: 'G', status: '승인', campId: 'K', baseRoute: '529AB' },
      { id: 'X', status: '승인', workStatus: '휴직', campId: 'K', baseRoute: '529AB' }] };
  const G4 = new Function('SD', 'SchedCalc', 'ymdLocal', 'koSort', 'shortCamp', 'drvGone', H.slice(j0, j1) + ' return { unassignedRoutes, unOffAt };')(SD4, SchedCalc, () => '2026-11-18', (a, b) => String(a).localeCompare(String(b)), shortCamp, drvGone);
  const U4 = G4.unassignedRoutes();
  ok(JSON.stringify(U4.K) === '["527B"]' && G4.unOffAt('K', '527B', '2026-11-18') && !G4.unOffAt('K', '527B', '2026-11-19'), '7 퇴사 예정(마지막 근무 11/18): 11/19 부터 527B 담당 없음 · 그 전은 빗금 · 휴직 기사가 있어도 다른 담당(529AB)이 있으면 그대로');
}
