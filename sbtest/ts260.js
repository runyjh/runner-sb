// (S260) 글자: 속도 측정 「앱을 쓰면 1분마다 쌓입니다」 → 5분마다 (실제로 5분마다 보냄)
//  사용: node sbtest/ts260.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
ok(/앱을 쓰면 5분마다 쌓입니다/.test(ad) && !/앱을 쓰면 1분마다 쌓입니다/.test(ad), "1 안내 글자가 실제와 같음");
ok(/setInterval\(perfFlush, 300000\)/.test(ad), "2 실제로 5분마다 보냄");
END();
