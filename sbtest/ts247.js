// (S247) 대시보드 업무스케줄: 다음 달로 넘겼다 바로 돌아오면 늦게 온 답이 이 달 화면을 비우던 것
//  사용: node sbtest/ts247.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
// dsMemo 를 떼어 내 돌려 본다: 11/30 → 12/1(요청 나감) → 11/30(받아 둔 것) → 12월 답 도착
const src = fnSrc("function dsMemo(day)");
ok(!!src, "0 함수를 찾음");
(async () => {
  let res = []; const painted = [];
  const DSB = { memoYm: "2026-11", memos: [{ id: "nov" }], memoDay: "2026-11-30" };
  const el = { value: "", textContent: "", innerHTML: "" };
  const api = (fn, ym) => new Promise((r) => res.push(() => r({ ok: true, memos: [{ id: "dec" }], pinned: [] })));
  const f = new Function("DSB", "$", "ymdLocal", "dsDay", "admKeep", "api", "dsMemoPaint", "dsLoad", "toast", src + "\nreturn dsMemo;")(DSB, () => el, () => "2026-11-29", (x) => x, { get: () => null, set: () => {} }, api, () => painted.push(DSB.memoDay + ":" + DSB.memos.map((m) => m.id)), "", () => {});
  f("2026-12-01"); f("2026-11-30"); res.forEach((g) => g()); await new Promise((r) => setTimeout(r, 5));
  ok(DSB.memos[0].id === "nov" && DSB.memoYm === "2026-11", "1 11/30 화면에 12월 자료가 덮이지 않음 (" + painted.slice(-1)[0] + ")");
  DSB.memos = null; res = []; f("2026-12-01"); res.forEach((g) => g()); await new Promise((r) => setTimeout(r, 5));
  ok(DSB.memos && DSB.memos[0].id === "dec", "2 다른 달로 그냥 넘기면 예전처럼 그 달 자료가 뜸");
  END();
})();
