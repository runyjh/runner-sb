// S175 산재/고용 신고: 서버가 기사 정보의 입직신고 값(enr·enrAt)을 다시 돌려줌 (S158 때 주석 안으로 들어가 빠졌음) · 제외 탭에 하위 기사도
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
ok(/postLeave: insPostLeave_\(o, month\), enr: str_\(o\.enr\), enrAt: str_\(o\.enrAt\), \/\//.test(eng), '1 입직신고 값이 주석 밖 (화면으로 돌려줌)');
ok(!/\/\/[^\n]*enr: str_\(o\.enr\)/.test(eng), '2 주석 안에 남은 enr 없음');
ok(/\(!x\.parent \|\| IR\.tab === '제외'\)/.test(adm) && /y\.parent === x\.acct && !list\.includes\(y\)/.test(adm), '3 제외 탭에 하위 기사 보임 (두 번 나오지 않음)');
