// (S252) 문구 편집: 고치는 창에서 Esc 를 누르면 편집 모드까지 꺼지던 것
//  사용: node sbtest/ts252.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a0 = ad.indexOf("inp.addEventListener('keydown', (e) => {", ad.indexOf("#uiPopOk")), l = ad.slice(a0, a0 + 300);
ok(/e\.stopPropagation\(\); uiPopClose\(\)/.test(l), "1 Esc 는 창만 닫고 위로 번지지 않음");
ok(/e\.key === 'Escape' && UI\.edit && !\$\('#uiPop'\)\) uiEditMode\(false\)/.test(ad), "2 창이 없을 때 Esc 로 편집 모드를 끄는 것은 그대로");
END();
