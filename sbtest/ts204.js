// (S204) 기사앱 품앗이 카드 표시 되돌림 + 문구 잘림 정리
//  사용: node sbtest/ts204.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const SRC = path.join(process.argv[2], 'src');
const IX = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(/escH\(j\.route \|\| lab\)/.test(IX), '1 코드 박스에 노선 전체 (123B · 147개)');
ok(/'배차 확정' : '모집 마감'\) \+ '<\/span><\/div><\/div>'/.test(IX) && !/\.pmc\.pmg \.pmst \{ position: static/.test(IX), '2 배차 확정 띠는 예전처럼 가운데 큼직하게');
ok(!/function pmTakers\(/.test(IX) && /\(j\.taker \? '<dt>수행 기사<\/dt>/.test(IX), '3 수행 기사 이름은 [자세히 보기]에서만');
ok(/escH\(j0\.camp\) \+ \(cl\.head \? ' · ' \+ escH\(cl\.head\) : ''\) \+ ' <small/.test(IX) && !/class="pmq"/.test(IX), '4 카드 제목은 캠프 · 번호 (합계 수량 없음)');
ok(/body \{ word-break: keep-all; overflow-wrap: anywhere; \}/.test(IX) && !/word-break: break-(all|word)/.test(IX + A), '5 한글 낱말 중간 줄바꿈 없앰 (기사앱 · 관리자)');
ok(/'<option value="">날짜 고르기<\/option>'/.test(IX) && /style="flex:1\.45"><label class="lb" for="pfDate">/.test(IX), '6 일감 주기 배차일자 칸: 글자가 화살표에 가리지 않게');
ok(!/내 근무일 \(' \+ pmDay/.test(IX) && !/근무일입니다 \(' \+ pmDay/.test(IX), '7 괄호 겹침 「(12/31 (목))」 없앰');
ok(/\.mc \.v \.to \{ display: block/.test(IX) && /'<i class="to">→'/.test(IX), '8 달력 맡김 칸: 받은 기사 이름이 잘리지 않게 다음 줄로');
ok(/\.pmacts \{ display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 12px; \}/.test(IX) && /j\.myApp === '확정' \? '확정 취소' : '신청 취소'/.test(IX), '9 상세: 버튼 아래 여백 · 확정된 일감은 「확정 취소」');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '10 기사앱 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
