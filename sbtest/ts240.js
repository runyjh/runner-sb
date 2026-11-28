// (S240) 기사앱: 로그아웃 뒤 다른 기사가 로그인하면 마이페이지 · 내 정보 · 품앗이 확인 숫자에 앞 기사 내용이 남던 것 → 비움
//  사용: node sbtest/ts240.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const src = fnSrc('  function myReset() ');
ok(!!src, '0 로그아웃 때 마이페이지를 비우는 기능이 있음');
if (src) {
  const els = {}; ['#myCard', '#miBody', '#myPerf', '#myFb', '#myFk', '#myCa'].forEach((q) => { els[q] = { innerHTML: '<b>앞 기사 이름 · 연락처 · 계좌</b>', classList: { add: (c) => { els[q].hid = c; } } }; });
  const r = new Function('$', "let PMC = { posted: [1], applied: [1, 2] }, pmSel = { J1: false }, PMT = { jobs: [1] }, pmFormData = { a: 1 };\n" + src + '\nmyReset(); return { PMC, pmSel, PMT, pmFormData };')((q) => els[q]);
  ok(/불러오는 중/.test(els['#myCard'].innerHTML) && !/앞 기사/.test(els['#myCard'].innerHTML), '1 마이페이지 맨 위 카드는 「불러오는 중」으로');
  ok(['#miBody', '#myPerf', '#myFb', '#myFk', '#myCa'].every((q) => els[q].innerHTML === ''), '2 내 정보 · 수행률 · 가중요인 · 허위 배송 · 캠프 안내를 비움');
  ok(['#myPerf', '#myFb', '#myFk', '#myCa'].every((q) => els[q].hid === 'hidden'), '3 펼쳐 둔 칸은 접음');
  ok(r.PMC.posted.length === 0 && r.PMC.applied.length === 0 && !Object.keys(r.pmSel).length && !r.PMT.jobs.length && r.pmFormData === null, '4 품앗이 확인 숫자 · 고른 코드 · 받아 둔 목록 · 양식도 비움');
}
ok(/function clearSession\(\)[^\n]*myReset\(\);/.test(ix), '5 로그아웃이 이것을 부름');
ok(/const myCardFail = \(\) => \{ if \(\/불러오는 중\//.test(ix), '6 답을 못 받으면 「불러오지 못했습니다」로 바뀌는 것은 그대로 (불러오는 중일 때)');
END();
