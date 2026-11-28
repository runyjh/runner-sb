// (S251) 찾기(Ctrl+K): 기사 정보관리를 한 번도 안 열었으면 기사가 안 찾아지던 것
//  사용: node sbtest/ts251.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a = ad.indexOf("function open() { TOC = null; cur = 0;"), l = ad.slice(a, a + 700);
ok(a > 0 && /if \(!all\.length\)[^\n]*loadList\(true\)[^\n]*render\(\)/.test(l), "1 찾기 창을 열 때 기사 목록이 없으면 받아서 다시 그림");
ok(/gsModal'\)\.classList\.contains\('hidden'\)/.test(l), "2 창을 이미 닫았으면 다시 그리지 않음");
END();
