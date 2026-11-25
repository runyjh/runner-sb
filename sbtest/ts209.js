// (S209) 받은 일감 카드: 「1건 · 1,100원」(받는 돈 합계처럼 보임) → 건당 단가 표시
//  사용: node sbtest/ts209.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const IX = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(!/ok\.length \+ '건 · ' \+ won\(okPrice\)/.test(IX) && !/const okPrice/.test(IX), '1 받은 일감 카드에 「1건 · 1,100원」 없음');
ok(/won\(j0\.price\) \+ '<small>건당 · VAT포함<\/small>' \/\* \(S209\)/.test(IX), '2 건당 단가로 표시');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '3 기사앱 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
