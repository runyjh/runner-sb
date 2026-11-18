// S41 달력 칸: 오늘 = 연두 바탕 + '오늘' 딱지 (기사앱 · 관리자앱 휴대폰) · 관리자앱 휴대폰 PDD = 굵은 파란 테두리 + 'PDD' 딱지
//  사용: node sbtest/ts31.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/\.mc\.td \{ background: #eaf6dc; border-color: #97c459; \}/.test(idx) && !/\.mc\.td \{ background: #fff3bf/.test(idx), '1 기사앱: 오늘 칸 = 연두 (노랑 아님)');
ok((idx.match(/=== r\.today \? '<em class="tdt">오늘<\/em>'/g) || []).length === 2, '2 기사앱: 내 스케줄 · 내 캠프 달력 두 곳에 오늘 딱지');
ok(/\.mc\.pdd \{ background: var\(--brand-weak\); border-color: var\(--brand\)/.test(idx), '3 기사앱: PDD 굵은 파란 테두리는 그대로');
ok(/\.smb-c\.pdd \{ background: #eef4ff; box-shadow: inset 0 0 0 3px #1b64da; \}/.test(adm), '4 관리자앱 휴대폰: PDD = 굵은 파란 테두리 상자');
ok(/\.smb-c\.td \{ background: #eaf6dc;/.test(adm) && /dt === smbToday \? ' td' : ''/.test(adm), '5 관리자앱 휴대폰: 오늘 칸 = 연두');
ok(/dt === pdd \? '<em class="pddt">PDD<\/em>' : dt === smbToday \? '<em class="tdt">오늘<\/em>' : ''/.test(adm), '6 관리자앱 휴대폰: PDD · 오늘 딱지');
ok(/const smbToday = SD\.today \|\| ymdLocal\(new Date\(\)\)/.test(adm), '7 오늘 = 서버가 알려 준 오늘 (없으면 기기 날짜)');
