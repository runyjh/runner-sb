// S86 이슈 등록: 날짜 = PDD 기준 표시 · 대신 뛴 우리 기사 칸은 PDD(내일)부터 바꿈 (오늘 칸은 어젯밤 입차해 끝난 배송 = 실제 기록)
//  사용: node sbtest/ts86.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
const pick = (n) => (eng.match(new RegExp('function ' + n + '\\([^)]*\\) \\{[^\\n]*\\}')) || [''])[0];
let fn = null;
try {
  fn = new Function('TODAY', [pick('parseYmd_'), pick('addDays_'), 'function ymd_(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }', 'function todayText_() { return TODAY; }', pick('issPddText_'), 'return issPddText_();'].join('\n'));
} catch (e) { /* 없음 */ }
const cases = [['2026-11-20', '2026-11-21'], ['2026-11-30', '2026-12-01'], ['2026-12-31', '2027-01-01'], ['2027-02-28', '2027-03-01']];
ok(!!fn && cases.every(([t, w]) => fn(t) === w), '1 PDD = 오늘 기준 내일 (월말 · 연말 넘어감)');
ok((eng.match(/const pdd = issPddText_\(\);/g) || []).length === 2 && !/const pdd = todayText_\(\);/.test(eng), '2 이슈 연동 · 칸 저장 두 곳 모두 PDD(내일)부터 (오늘부터 쓰던 것 없앰)');
ok(/<label class="lb" for="isMDate">시작일 \(PDD\)<\/label>/.test(adm) && /<label class="lb" for="isMEnd">종료일 \(PDD\) <span/.test(adm), '3 이슈 등록 창 날짜 칸 이름 = PDD 기준');
ok(/자동 배정 <span class="sub">\(PDD ' \+ esc\(isMd0\(pdd\)\) \+ '부터 · 오늘까지는 실제 기록이라 그대로\)/.test(adm), '4 미리보기 문구와 서버 동작이 같음 (PDD부터)');
