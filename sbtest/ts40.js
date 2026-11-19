// S49 품앗이 정산 안내 문구: 배차 확정 화면 · 일감 상세 설명 기본 양식 → "정산은 사무실에서 합니다"
//  사용: node sbtest/ts40.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const app = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8');
ok(app.includes(" 기사님 일감입니다. 정산은 사무실에서 합니다 (기사님끼리 직접 주고받지 않음).</div>") && !app.includes('두 분이 정한 방법으로 직접'), '1 기사앱 배차 확정 안내 = 사무실 정산');
ok(eng.includes("'💰 정산 정보', '정산은 사무실에서 합니다.'") && !eng.includes('당일 이체 등') && !eng.includes('세금계산서 발행 여부 :'), '2 상세 설명 기본 양식 정산 줄 = 사무실 정산');
const m = eng.match(/const PM_DESC_TEMPLATE = (\[[\s\S]*?\])\.join\('\\n'\);/);
let tail = ''; try { tail = eval(m[1]).slice(-2).join(' / '); } catch (e) { tail = 'ERR ' + e.message; }
ok(tail === '💰 정산 정보 / 정산은 사무실에서 합니다.', '3 양식 끝 = ' + tail);
