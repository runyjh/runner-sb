// (S188) 기사앱 일감 주기 › 그날 일할 수 있는 기사: 이름 없이 인원만
//  사용: node sbtest/ts188.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
const code = H.slice(H.indexOf('function pfAvailLoad('), H.indexOf('function openPmForm('));
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(!/escH\(x\.name\)/.test(code) && !/gvdrv/.test(code), '1 기사 이름 · 카드를 그리지 않음');
ok(/'이 날 일할 수 있는 기사 ' \+ list\.length \+ '명'/.test(code), '2 인원만 보임');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
