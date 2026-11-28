// (S248) 대시보드 검색: 품앗이 자료를 못 받으면 「불러오는 중…」이 계속 남던 것
//  사용: node sbtest/ts248.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const src = fnSrc("function dsPm()");
(async () => {
  let fail = true, renders = 0; const DSB = { q: "기사1", pmQ: "", pm: null, seq: 0 };
  const api = () => (fail ? Promise.reject(new Error("net")) : Promise.resolve({ ok: true, jobs: [{ id: "j1", date: "2026-11-29", time: "" }] }));
  const f = new Function("DSB", "dsTerms", "dsYmd", "api", "dsRender", "currentView", src + "\nreturn dsPm;")(DSB, () => ["기사1"], () => "2026-11-29", api, () => renders++, "dash");
  f(); await new Promise((r) => setTimeout(r, 5));
  ok(Array.isArray(DSB.pm) && renders === 1, "1 못 받으면 빈 결과로 그려 「불러오는 중…」이 남지 않음");
  fail = false; f(); await new Promise((r) => setTimeout(r, 5));
  ok(DSB.pm && DSB.pm.length === 1, "2 같은 말로 다시 찾으면 다시 받음");
  END();
})();
