// (S236) 기사앱 내 스케줄: 홈에서 다시 열면 지난번에 넘겨 본 달이 그대로 뜨던 것(달이 바뀐 뒤 · 다음 로그인에도) → PDD가 있는 달부터
//  사용: node sbtest/ts236.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const src = fnSrc('  function openSched(');
function sim(scMonth0, keep) {
  const f = new Function('menuBlocked', 'paintScMode', 'show', 'loadSched', 'ymdOf', 'Date', 'keep', "let scMode = '', scMonth = '" + scMonth0 + "', scSel = 'x';\n" + src + '\nopenSched(keep); return { scMonth, scSel, scMode };');
  class D extends Date { constructor(...a) { if (a.length) super(...a); else super(2026, 11, 31, 10); } } // 12월 31일 → PDD는 1월 1일
  return f(() => false, () => {}, () => {}, () => {}, (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'), D, keep);
}
let r = sim('2026-10', undefined);
ok(r.scMonth === '2027-01' && r.scSel === '', '1 홈에서 열면 지난번 달(10월)이 아니라 PDD가 있는 달 (' + r.scMonth + ') · 12월 31일이면 다음 해 1월');
r = sim('', undefined); ok(r.scMonth === '2027-01', '2 처음 열 때도 같음');
r = sim('2026-11', true); ok(r.scMonth === '2026-11' && r.scSel === 'x', '3 변경 상자 · 피크 띠가 날짜를 정해 열면 그 달 · 그 날 그대로');
ok(/openSched\(L\.length > 0\)/.test(ix) && /openSched\(!!scMonth\)/.test(ix), '4 날짜를 정해 여는 두 곳은 그대로 두라고 알림');
const rs = lineOf('  window.scReset = ');
ok(/scMonth = ''; scSel = '';/.test(rs), '5 로그아웃하면 보던 달도 비움');
END();
