// (S208) 노선 1건 방식 뒤 남은 글자 정리: 품앗이 확인 박스 · 맡기기 버튼 「202AB」 · 코드별 안내 빼기 · 입차시간 빈 칸
//  사용: node sbtest/ts208.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const SRC = path.join(process.argv[2], 'src');
const IX = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), P = fs.readFileSync(path.join(SRC, 'Pumasi.gs'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(/lab\[j\.id\] = j\.route \|\| cl\.labs\[i\]/.test(IX) && /const l = j\.route \|\| cl\.labs\[i\]/.test(IX), '1 품앗이 확인 박스에 노선 전체 (AB → 202AB)');
ok(!/\(cl\.head \|\| ''\) \+ labs\.join/.test(IX) && /escH\(pmCodesJoin\(labs\)\) \+ ' 맡기기'/.test(IX), '2 맡기기 버튼 「202AB 맡기기」 (202202AB 아님)');
ok(/\(js\.length > 1 \? '<p class="hint" style="margin:8px 0 0">코드마다 다른 기사님을/.test(IX) && /\(js\.length > 1 \? ' 일부 코드만 확정될 수도 있습니다\.' : ''\)/.test(IX), '3 노선 1건이면 「코드마다 · 일부 코드만」 안내 빼기');
ok(/p\.workAdd === '출근' \? '' : '\('/.test(IX), '4 「출근(출근)」 겹침 없앰');
ok(/\(str_\(j\.time\) \? ' · ' \+ j\.time : ''\)/.test(P) && !/\(j\.route \|\| j\.area\) \+ ' · ' \+ j\.time/.test(P), '5 입차시간이 비면 「·  (」 빈 칸 없음');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '6 기사앱 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
