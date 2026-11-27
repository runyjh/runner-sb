// (S229) 기사앱 글자 교정 (뜻은 그대로): 조사 · 띄어쓰기 · 끊긴 문장
//  사용: node sbtest/ts229.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
[['일감</b>로 ', '일감</b>으로 '], ['에게만 보여집니다', '에게만 보입니다'], ["' 을(를) 추가", "'을(를) 추가 물량으로"], ["변경 문의는 사무실로.'", "변경 문의는 사무실로 연락해 주세요.'"]]
  .forEach(([o, n], i) => ok(ix.indexOf(o) < 0 && ix.indexOf(n) > 0, (i + 1) + ' 「' + o + '」 → 「' + n + '」'));
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
