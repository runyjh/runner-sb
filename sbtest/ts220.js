// (S220) 앱을 다시 설치해 알림 권한이 초기화된 폰: 최근 등록 기록이 있어도 「알림 켜기」 창을 띄움
//  사용: node sbtest/ts220.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const m = src.match(/if \(recent([^)]*\)[^;]*)?\) return;/);
ok(!!m, '0 최근 등록이면 창을 안 띄우는 줄을 찾음');
// 그 줄의 조건을 그대로 돌려 본다
const skip = (recent, st) => new Function('recent', 'st', 'return !!(' + m[0].replace(/^if \(/, '').replace(/\) return;$/, '') + ');')(recent, st);
ok(skip(true, { pm: 'prompt', q: 'prompt' }) === false, '1 폰이 「아직 안 물어봄」이라고 답하면 최근 등록이어도 창을 띄움');
ok(skip(true, { pm: '-', q: '-' }) === true && skip(true, { pm: 'err', q: 'err' }) === true, '2 폰이 답을 못 하는 경우는 예전처럼 창을 안 띄움');
ok(skip(false, { pm: '-', q: '-' }) === false, '3 최근 등록이 없으면 예전처럼 창을 띄움');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
