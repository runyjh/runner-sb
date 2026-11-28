// (S254) 기사 목록 「배정 캠프 · 라우트」 정렬: 미배정이 맨 뒤가 아니라 맨 앞에 오던 것
//  사용: node sbtest/ts254.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const l = lineOf("const dsVal = (r, k) =>");
const dsVal = new Function("docKeys", l + "\nreturn dsVal;")(() => []);
ok(dsVal({}, "camp") === "", "1 미배정은 빈 칸으로 봄 (맨 뒤 규칙에 걸림)");
ok(dsVal({ schCamp: "군포1", baseRoute: "200AB" }, "camp") === "군포1 200AB", "2 배정된 기사는 그대로");
ok(dsVal({ schCamp: "군포1" }, "camp") === "군포1", "3 노선만 없는 기사");
END();
