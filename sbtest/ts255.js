// (S255) 공지: 게시 시작일이 앞날인 공지를 올려도 「바로 보입니다」라고 나오던 것
//  사용: node sbtest/ts255.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a = ad.indexOf("ntClose(); toast(ntEdit ?"), l = ad.slice(a, ad.indexOf("\n", a));
const run = (n, ntEdit) => { let m = ""; new Function("ntClose", "toast", "ntEdit", "n", "ymdLocal", l)(() => {}, (x) => { m = x; }, ntEdit, n, () => "2026-11-29"); return m; };
ok(/2026-12-07 부터/.test(run({ status: "게시", start: "2026-12-07" })) && !/바로 보입니다/.test(run({ status: "게시", start: "2026-12-07" })), "1 앞날에 시작하는 공지는 그 날짜부터 보인다고 알림");
ok(/바로 보입니다/.test(run({ status: "게시", start: "" })) && /바로 보입니다/.test(run({ status: "게시", start: "2026-11-29" })), "2 오늘이거나 날짜가 없으면 예전 그대로");
ok(/숨김/.test(run({ status: "숨김", start: "" })) && /고쳤습니다/.test(run({ status: "게시" }, true)), "3 숨김 · 고치기는 예전 그대로");
END();
