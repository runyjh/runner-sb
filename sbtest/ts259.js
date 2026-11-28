// (S259) 이슈 관리: 다른 사람이 고쳐도 화면이 저절로 새로 안 받던 것 (수파베이스판)
//  사용: node sbtest/ts259.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const l = lineOf("const tick = () => { if (document.hidden ||");
ok(/\['sched', 'pumasi', 'dash', 'issue'\]\.includes\(currentView\)/.test(l), "1 이슈 관리 화면에서도 1분마다 바뀐 것을 확인");
ok(/function liveIssue\(\) \{\s*if \(currentView !== 'issue'\) return;/.test(ad), "2 바뀌었으면 이슈 목록을 새로 받는 것은 그대로");
END();
