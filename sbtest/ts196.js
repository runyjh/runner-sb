// (S196) 관리자 세금계산서 발행 체크: 처리일을 한국 날짜로 (예전: 새벽 0~9시엔 어제 날짜) · 기사앱 달력 360px 폰에서 「202AB」 끝 글자 잘림 · 정산서 없을 때 빈 달 칸 · 관리자 휴대폰 수파베이스 표시가 제목 가림 · 좁은 칸에서 잘리던 안내 글
//  사용: node sbtest/ts196.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2], 'src', 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(!/x\.at = new Date\(\)\.toISOString\(\)/.test(H) && /x\.at = dToday\(\);/.test(H), '1 발행 체크 처리일 = 한국 날짜');
// 화면 코드에서 UTC 날짜를 오늘로 쓰는 곳이 더 없는지 (엑셀 날짜 숫자 변환은 제외)
const left = (H.match(/new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/g) || []).length;
ok(left === 0, '2 화면에서 오늘 날짜를 세계 표준시로 만드는 곳 없음 (' + left + ')');
const I = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
ok(/@media \(max-width: 380px\) \{ \.mc \.v:not\(\.long\) \{ font-size: 9\.5px/.test(I), '3 기사앱 달력: 좁은 폰에서 노선 글자 작게 (잘림 방지)');
ok(/\$\('#slMonth'\)\.parentNode\.classList\.add\('hidden'\)/.test(I) && /\$\('#slMonth'\)\.parentNode\.classList\.remove\('hidden'\)/.test(I), '4 정산서가 없으면 빈 달 고르기 칸 숨김 · 생기면 다시 보임');
ok(/max-width:420px\)\{html\.m #sbPill span\{display:none\}/.test(fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8')), '5 관리자 휴대폰: 수파베이스 표시가 제목을 가리지 않게');
ok(/placeholder="로그인 아이디">/.test(I) && /placeholder="주소를 검색하세요">/.test(I), '6 기사 회원가입: 360px 폰에서 잘리던 안내 글 줄임');
const A = H;
ok(/function phSwap\(\)/.test(A) && (A.match(/data-ph-m="/g) || []).length >= 3, '7 관리자 휴대폰 화면: 긴 안내 글은 짧게 (대시보드 검색 · 메모 · 세금계산서 검색)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
