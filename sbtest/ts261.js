// (S261) 로그인 화면에서 [뒤로]를 누르면 앞서 보던 화면들을 하나씩 다시 열려다 「로그인 만료」가 거듭 뜨던 것
//  사용: node sbtest/ts261.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const sl = fnSrc("function showLogin()");
ok(/viewHist\.length = 0/.test(sl), "1 로그인 화면으로 갈 때 지나온 화면 기록을 비움");
const a = ad.indexOf("window.addEventListener('popstate', () => {"), b = ad.indexOf("const ms = openModals();", a), blk = ad.slice(a, b);
ok(/if \(\$\('#app'\)\.classList\.contains\('hidden'\)\) \{ viewHist\.length = 0; return; \}/.test(blk), "2 로그인 화면에서는 [뒤로]가 화면을 옮기지 않음");
END();
