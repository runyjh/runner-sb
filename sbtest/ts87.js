// S87 이슈 관리 표 머리글: 날짜 → 날짜 (PDD) (화면만 · 서버 그대로)
//  사용: node sbtest/ts87.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
ok(/<thead><tr><th>날짜 \(PDD\)<\/th><th>기사<\/th><th>캠프<\/th><th>결과<\/th><th>사유<\/th>/.test(adm), '1 이슈 관리 표 머리글 = 날짜 (PDD)');
ok(/<label class="lb" for="isMDate">시작일 \(PDD\)<\/label>/.test(adm), '2 이슈 등록 창(S86)과 같은 표기');
