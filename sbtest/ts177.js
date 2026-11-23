// (S177) 품앗이 일감 받기: 지원할 코드가 하나도 없는 카드(모두 확정 · 마감)는 흐리게 「배차 확정」 · 「모집 마감」 띠 · 목록 아래로
//  사용: node sbtest/ts177.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const m = src.match(/function pmGrpState\(js\) \{[\s\S]*?\n  \}/);
ok(!!m, '1 카드 상태 함수가 있음');
let f = null; try { f = eval('(' + m[0] + ')'); } catch (e) { f = null; }
const J = (status, accepted) => ({ status, accepted: !!accepted });
ok(f && f([J('배차 확정'), J('배차 확정')]) === 'done', '2 모두 다른 기사 확정 → 배차 확정 (흐림)');
ok(f && f([J('모집 마감')]) === 'closed', '3 모집 마감 → 흐림');
ok(f && f([J('배차 확정'), J('모집 중')]) === '', '4 하나라도 모집 중이면 그대로');
ok(f && f([J('배차 확정', true)]) === '', '5 내가 맡은 카드는 흐리지 않음');
ok(/class="pmc pmg s-' \+ gs \+ '"/.test(src) && /<div class="pmst"><span>' \+ \(gs === 'done' \? '배차 확정' : '모집 마감'\)/.test(src), '6 흐린 카드에 상태 띠');
ok(/pmGrpState\(g\) \? 1 : 0/.test(src), '7 흐린 카드는 목록 아래로');
ok(/data-pmdet="' \+ escH\(okId\) \+ '">✅ 맡은 일감 보기/.test(src) && /closest\('\[data-pmdet\]'\)/.test(src), '8 내가 다 맡은 카드는 [맡은 일감 보기] (꺼진 「코드를 고르세요」 대신)');
const q = src.match(/const pmQtyTxt = \(j\) => [^\n]*/);
let qt = null; try { const escH = (x) => String(x); qt = eval('(' + q[0].replace(/^const pmQtyTxt = /, '').replace(/;\s*$/, '') + ')'); } catch (e) { qt = null; }
ok(qt && qt({ vq: '312개', qty: '350' }) === '312개' && qt({ vq: '', qty: '350' }) === '350개' && qt({ qty: '약 280개' }) === '280개' && qt({ qty: '' }) === '', '9 수량: 정산서 평균 먼저 · 숫자만 적힌 수량엔 개 붙임');
const eng = fs.readFileSync(path.join(process.argv[2], 'src', 'Pumasi.gs'), 'utf8');
ok(/vq: pmVolOf_\(j\)/.test(eng) && /function pmVolOf_\(j\)/.test(eng), '10 서버가 카드에 전월 정산서 평균(vq)을 내려 줌');
ok(/코드 아래 숫자 = ' \+ \(js\.every\(\(j\) => !pmQtyNum\(j\) \|\| j\.vq\) \? '최근 한 달 하루 평균 수량'/.test(src) && /'최근 한 달 하루 평균'\) \+ '<\/small>'/.test(src) /* (S178) 정산 자료가 없으면 「올린 쪽이 적은 수량」 */, '11 「최근 한 달 하루 평균 수량」 안내 (카드 · 정보 팝업)');
ok(/합계 <b>' \+ allQ\.toLocaleString/.test(src) && /고른 코드 <b style="color:var\(--brand\)">' \+ selQ/.test(src), '12 코드별 수량 + 합계 (일부만 고르면 고른 코드 합계도)');
ok(/else if \(pmSel\[j\.id\] !== false\) \{ cls = 'on'/.test(src) && /pmSel\[cc\.dataset\.cc\] = pmSel\[cc\.dataset\.cc\] === false/.test(src), '13 처음엔 모든 코드가 골라져 있음 (누르면 빼기) · 코드 하나인 카드는 바로 [맡을게요]');
ok(/'품앗이 지원하기'/.test(src) && /'코드를 고르세요'/.test(src) && /'신청함'/.test(src) && />신청 취소<\/button>/.test(src), '14 버튼 「품앗이 지원하기」 · 「신청함」 · 「신청 취소」');
const eng2 = fs.readFileSync(path.join(process.argv[2], 'src', 'Pumasi.gs'), 'utf8');
ok(/'🙋 품앗이 신청'/.test(eng2), '15 맡긴 기사 알림 「품앗이 신청」');
ok(!/맡을게요 \(선착순 바로 확정\)/.test(src) && !/선착순이라 먼저 누른 기사님으로/.test(src), '16 상세 화면에 남아 있던 「선착순 바로 확정」 문구 없앰 (S176 때 빠짐)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
