// (S256) 기사 정보관리: 검색칸이 둘이라 「표 안에서 찾기」로 줄인 뒤 모두 선택하면 안 보이는 기사까지 골라지던 것
//  사용: node sbtest/ts256.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const l = lineOf("const own = sec &&");
ok(/classList\.contains\('search'\)/.test(l), "1 화면에 검색칸(.search)이 있으면 표 찾기를 숨김");
// 실제 판정을 돌려 본다: 기사 정보관리의 검색칸
const m = /<input class="([^"]*)" id="q" placeholder="([^"]*)"/.exec(ad);
const inp = (cls, ph) => ({ closest: () => null, placeholder: ph, classList: { contains: (c) => cls.split(" ").includes(c) } });
const own = (list) => new Function("sec", l + "\nreturn !!own;")({ querySelectorAll: () => list });
ok(m && own([inp(m[1], m[2])]), "2 기사 정보관리: 표 찾기 숨김 (검색칸 하나만)");
ok(own([inp(m[1], "이름 · 아이디 · 연락처 · 차량")]), "3 휴대폰 문구일 때도 같음");
ok(!own([inp("inp", "메모")]) && own([inp("inp", "노선코드·메모 검색")]), "4 검색칸이 없는 화면은 표 찾기 그대로 · 있던 화면은 그대로");
END();
