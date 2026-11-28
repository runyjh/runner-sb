// (S257) 노선관리 전체 단가표: 제목을 눌러 정렬하면 걸러 보기 · 엑셀 복사 때 정렬이 풀리던 것
//  사용: node sbtest/ts257.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
ok(/xp-table"><table data-tsb="own"><thead>/.test(ad), "1 단가표는 자기 정렬을 씀 (공용 표 정렬이 가로채지 않음)");
ok(/!tb\.dataset\.tsb && !spanRows\(tb\)/.test(ad) && /if \(!tb \|\| tb\.dataset\.tsb\) return;/.test(ad), "2 공용 표 정렬은 표시가 있는 표를 건너뜀");
ok(/const th = e\.target\.closest\('\[data-xps\]'\);/.test(ad), "3 단가표 자기 정렬 그대로");
END();
