// (S249) 기사앱 창 안에서 열린 관리자 화면: 설치 안내 띠의 ✕ 가 안 눌리던 것
//  사용: node sbtest/ts249.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a = ad.indexOf("기사앱 창 안에서 열린 관리자 화면 (예전 기사앱 범위가"), b = ad.indexOf("return;", a), blk = ad.slice(a, b);
ok(a > 0 && /#aInstMx/.test(blk) && /addEventListener\('click'/.test(blk.slice(blk.indexOf("#aInstMx"))) && /aInstM'\)\.classList\.add\('hidden'\)/.test(blk), "1 그 경우에도 ✕ 를 누르면 띠가 닫힘");
ok(/id="aInstMx"/.test(ad), "2 ✕ 단추가 화면에 있음");
END();
