// (S253) 화면 문구: 하나를 저장하면 아직 저장 안 한 다른 칸에 쓴 글이 지워지던 것
//  사용: node sbtest/ts253.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const src = fnSrc("function uiSave(list)");
(async () => {
  const UI = { map: {}, log: [], draft: { a: "가", b: "나", c: "다" } };
  const f = new Function("UI", "api", "toast", "uiRepaint", src + "\nreturn uiSave;")(UI, () => Promise.resolve({ ok: true, map: { a: "가" }, changed: 1 }), () => {}, () => {});
  await f([{ key: "a", text: "가" }]);
  ok(!("a" in UI.draft), "1 저장한 칸은 비움");
  ok(UI.draft.b === "나" && UI.draft.c === "다", "2 저장 안 한 다른 칸은 그대로");
  END();
})();
