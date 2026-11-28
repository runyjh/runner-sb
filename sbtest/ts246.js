// (S246) 대시보드 확인할 것 「산재·고용 입직신고 안 된 기사」를 누르면 정산관리가 아니라 산재/고용 신고 상황으로
//  사용: node sbtest/ts246.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const h = gs("Home.gs"), l = lineOf("todo('enr'", h);
ok(/'insrep'\)/.test(l) && !/'settle'\)/.test(l), "1 입직신고 줄이 여는 화면 = 산재/고용 신고 상황");
ok(/<section id="view-insrep"/.test(ad) && /a[^>]*data-view="insrep"/.test(ad) && /입직신고 대상/.test(ad), "2 그 화면에 입직신고 대상 목록이 있음");
END();
