// (S250) 비밀번호 일괄 변경: 서버가 안 된다고 답하면 단추가 「바꾸는 중…」으로 멈추던 것
//  사용: node sbtest/ts250.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a = ad.indexOf("api('adm_setTempPasswordBulk'"), l = ad.slice(a, ad.indexOf("const rows", a));
ok(/if \(!r\.ok\) \{[^}]*#bpwGo'\)\.disabled = false[^}]*textContent = '바꾸기'[^}]*return toast\(r\.msg\)/.test(l), "1 안 된다는 답을 받으면 단추가 다시 「바꾸기」로 돌아옴");
END();
