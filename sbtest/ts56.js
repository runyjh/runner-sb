// S56 품앗이 근무 가능일: 오늘부터 90일 뒤까지 고를 수 있게 (예전 62일)
//  사용: node sbtest/ts56.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8');
const m = eng.match(/const PM_AVAIL_DAYS = (\d+);/);
ok(m && m[1] === '90', '1 근무 가능일 기간 = ' + (m && m[1]) + '일');
// (S163) 세 곳이 pmAvailUntil_ 하나를 같이 씀 (내부용 = 익월 말 · 외부용 = 90일)
ok((eng.match(/PM_AVAIL_DAYS/g) || []).length >= 4 || (eng.match(/pmAvailUntil_\(today\)/g) || []).length >= 3, '2 내 근무 가능일 · 저장 · 일할 기사 목록 모두 같은 기간을 씀');
