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
const F = new Function('SD', 'SchedCalc', 'ymdLocal', 'koSort', H.slice(j0, j1) + ' return { unassignedRoutes, unOffAt };')(SD, SchedCalc, () => '2026-11-18', (a, b) => String(a).localeCompare(String(b)));
const UN = F.unassignedRoutes();
ok(JSON.stringify(UN.I7) === '["919CD"]' && !UN.K1, '1 인천7 919CD 는 담당 없음 줄이 나옴 (12/2 전까지 담당 없음) · 917CD · 527B 는 안 나옴');
ok(!F.unOffAt('I7', '919C', '2026-12-01') && F.unOffAt('I7', '919C', '2026-12-02') && F.unOffAt('I7', '919D', '2026-12-03'), '2 12/1 까지는 열린 칸 · 12/2 부터 빗금 (황의식 담당)');
// 3. 이전 방식이었다면 919CD 는 늘 담당으로 보여 줄이 없었음 → 날짜별로 바뀐 것 확인
ok(/SD\.dates\.forEach\(\(dt\) => \{ const sg = d\.segs\.find/.test(H) && /if \(c\.off\) return \{ html: '', cls: 'uc-off' \}/.test(H), '3 칸 그리기: 담당이 생긴 날은 빗금 칸 (uc-off) · 눌러도 배정 창 안 열림');
