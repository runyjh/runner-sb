// (S258) 대시보드 자동 점검 칸: 한 번 못 받으면 계속 「보고가 없습니다」 · 밤새 켜 둔 화면은 어제 보고까지만 보이던 것
//  사용: node sbtest/ts258.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const src = lineOf("function chkLoad(done)");
(async () => {
  const CKR = { rows: null, busy: false };
  let mode = "fail";
  const api = () => (mode === "fail" ? Promise.reject(new Error("net")) : mode === "no" ? Promise.resolve({ ok: false }) : Promise.resolve({ ok: true, rows: [{ d: "2026-11-29" }] }));
  const f = new Function("CKR", "api", src + "\nreturn chkLoad;")(CKR, api);
  await new Promise((r) => f(r)); ok(CKR.rows === null, "1 연결이 끊겨 못 받으면 「없음」으로 굳히지 않음");
  mode = "no"; await new Promise((r) => f(r)); ok(CKR.rows === null, "2 서버가 못 준다고 답해도 같음");
  mode = "ok"; await new Promise((r) => f(r)); ok(CKR.rows && CKR.rows.length === 1, "3 다시 열면 받음");
  ok(/CKR\.tried !== K\.d && \(!CKR\.rows\[0\] \|\| String\(CKR\.rows\[0\]\.d\) < String\(K\.d\)\)/.test(ad), "4 요약이 목록보다 새 날짜면 목록을 다시 받음 (날짜마다 한 번)");
  END();
})();
