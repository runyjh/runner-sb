// (S193) 폰이 잠든(화면 가려진) 사이 끊긴 요청은 「시간 초과」 오류로 세지 않음 · 속도 기록에서도 뺌
//  사용: node sbtest/ts193.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2], 'src');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
['Index.html', 'Admin.html'].forEach((f) => {
  const H = fs.readFileSync(path.join(SRC, f), 'utf8');
  ok(/HID_AT = performance\.now\(\)/.test(H), f + ' 1 화면 가려진 때 기억');
  ok(/AbortError' && \(HID_AT >= t0 \|\| document\.visibilityState === 'hidden'\)\) errAdd\('net'/.test(H), f + ' 2 잠든 사이 끊김은 참고 기록(연결 실패)으로');
  ok(/if \(HID_AT < t0 && document\.visibilityState !== 'hidden'\) perfAdd\(fn/.test(H), f + ' 3 잠든 사이 걸린 요청은 속도 기록에서 뺌');
});
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
