// (S239) 기사앱 내 캠프: 날짜를 누르면(화면을 다시 그림) 쓰던 노선 메모가 지워지던 것 → 그대로
//  사용: node sbtest/ts239.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const g = lineOf('  const riDraftGet = '), p = lineOf('  const riDraftPut = ');
ok(!!g && !!p, '0 쓰던 글을 들고 있다가 되돌리는 기능이 있음');
if (g && p) {
  let els = { '#riTx': { value: '1동 공동현관 비번' }, '#riRt': { value: '200A' } };
  const RI = { edit: '', campId: 'C1' };
  const M = new Function('$', 'RI', g + '\n' + p + '\nreturn { get: riDraftGet, put: riDraftPut };')((q) => els[q] || null, RI);
  const k = M.get(); els = { '#riTx': { value: '' }, '#riRt': { value: '' } }; M.put(k);
  ok(els['#riTx'].value === '1동 공동현관 비번' && els['#riRt'].value === '200A', '1 다시 그린 뒤에도 쓰던 글 · 고른 노선이 그대로');
  els = { '#riTx': { value: '' }, '#riRt': { value: '' } }; RI.campId = 'C2'; M.put(k);
  ok(els['#riTx'].value === '', '2 다른 캠프로 바뀌었으면 옮기지 않음');
  RI.campId = 'C1'; els = { '#riTx': { value: '새로 쓴 글' }, '#riRt': { value: '' } }; M.put(k);
  ok(els['#riTx'].value === '새로 쓴 글', '3 이미 글이 있으면 덮지 않음');
  els = {}; ok(M.get() === null, '4 메모 칸이 없으면 아무것도 안 함'); M.put(k);
}
ok((ix.match(/dk = riDraftGet\(\); renderCampSched\(\); riDraftPut\(dk\);/g) || []).length === 2, '5 날짜를 누를 때 · 물량이 늦게 와 다시 그릴 때 둘 다');
END();
