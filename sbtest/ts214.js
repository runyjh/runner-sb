// S214 기사스케줄 품앗이 칸에 마우스 → 같은 날 상대(맡긴·받은) 기사 칸 점멸 (올리고 있는 동안 계속) · 화면 밖이면 ↑↓ 안내
//  정적 검사 · 브라우저 시험은 ts214-browser.js (로컬 시험 서버 · 배차 확정 일감 1건 넣고 5항목)
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const adm = fs.readFileSync(path.join(process.argv[2] || path.join(__dirname, '..'), 'admin', 'index.html'), 'utf8');
ok(/#sGrid td\.c\.pm-hot \{ animation: pmhot \.8s ease-in-out infinite; \}/.test(adm), '1 상대 칸: 올리고 있는 동안 계속 깜빡임');
ok(/t\.fromId === me \? t\.toId : t\.toId === me \? t\.fromId/.test(adm), '2 상대는 기사번호로 찾음 (동명이인 걱정 없음 · 여러 명이면 모두)');
ok(/'↓ ' \+ p\.name \+ ' \(아래 '/.test(adm) && /' · 지금 화면에 없음'/.test(adm), '3 화면 밖 · 화면에 없음 안내');
ok(/if \(document\.documentElement\.classList\.contains\('m'\)\) return; \/\/ 휴대폰/.test(adm), '4 휴대폰은 하지 않음');
ok(/sHovSet\(-1\); pmHotOff\(\);/.test(adm), '5 표 밖으로 나가면 끔');
