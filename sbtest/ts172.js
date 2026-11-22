// S172 노선관리 참고이미지 카드 머리글 깨진 글자(일본어 ミ) 고침 · 화면 전체에 일본어 가나가 섞이지 않았는지
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8'), app = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
ok(/<h4>참고이미지<small>' \+ imgs\.length \+ '장<\/small><\/h4>/.test(adm), '1 머리글 = 참고이미지');
ok(!/[぀-ヿ]/.test(adm) && !/[぀-ヿ]/.test(app), '2 관리자앱 · 기사앱에 일본어 가나 없음');
