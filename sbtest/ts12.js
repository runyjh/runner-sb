// S18 퇴사일 이후 칸: 지우면 빗금 칸으로 다시 그림 · 고정휴무 채우기가 퇴사일 이후를 채우지 않음
//  사용: node sbtest/ts12.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const gone = H.match(/const drvGone = \(d, dt\) => [^\n]*;/)[0];
const drvGone = new Function(gone + ' return drvGone;')();
const d = { workStatus: '퇴사', leaveDate: '2026-11-16' };
// 1. 고정휴무 채우기: 퇴사일 이후 빈칸은 건너뜀
const cond = H.match(/if \(dt < SD\.today \|\| sget\(r\.row, dt\) \|\| drvGone\(r\.d, dt\)\) return;/);
ok(!!cond, '1 고정휴무 채우기에 퇴사일 이후 건너뛰기 조건이 있음');
const SD = { today: '2026-11-18' }, sget = () => '', r = { d, row: 'X' };
const fill = (dt) => !(dt < SD.today || sget(r.row, dt) || drvGone(r.d, dt));
ok(!fill('2026-12-04') && !fill('2026-12-31') && fill.length === 1, '2 유희상(퇴사 11/16): 12/4 · 12/31 채우지 않음');
ok(fill('2026-12-04') === false && (() => { const a = { workStatus: '재직', leaveDate: '' }; return !(SD.today > '2026-12-04' || sget() || drvGone(a, '2026-12-04')); })(), '3 재직 기사는 그대로 채움');
// 4. 화면 다시 그리기: 퇴사일 이후 칸이 비면 빗금(rcoff) 칸으로 바꾸는 코드
const i0 = H.indexOf("if (r.kind === 'd' && drvGone(r.d, dt) && !sget(r.row, dt)) {"), blk = i0 < 0 ? '' : H.slice(i0, i0 + 700);
ok(/rcoff/.test(blk) && /td\.innerHTML = ''/.test(blk) && /td\.__v = undefined/.test(blk), '4 지운 칸을 빗금 칸으로 다시 그림');
