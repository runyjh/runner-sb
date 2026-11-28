// (S262) 자동 로그인: 여는 순간 서버가 잠깐 못 답하면(만료 아님) 로그인이 풀리던 것
//  사용: node sbtest/ts262.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ad = fs.readFileSync(path.join(process.argv[2], "src", "Admin.html"), "utf8");
const gs = (f) => fs.readFileSync(path.join(process.argv[2], "src", f), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const lineOf = (sig, src) => { src = src || ad; const a = src.indexOf(sig); return a < 0 ? "" : src.slice(a, src.indexOf("\n", a)); };
const fnSrc = (sig) => { const a = ad.indexOf(sig); if (a < 0) return ""; let d = 0, b = ad.indexOf("{", a + sig.length - 1); for (; b < ad.length; b++) { if (ad[b] === "{") d++; else if (ad[b] === "}") { d--; if (!d) break; } } return ad.slice(a, b + 1); };
const a = ad.indexOf("call('adm_check', t).then((r) => {"), b = ad.indexOf("})();", a), blk = ad.slice(a, b);
// boot 의 답 처리만 떼어 돌려 본다
const run = async (r, kept) => { const ev = []; const body = blk.replace("call('adm_check', t)", "Promise.resolve(R)");
  await new Function("R", "kept", "store", "admKeep", "showLogin", "toast", "dcPaint", "showApp", "me", "$", body + ";")(r, kept, { del: () => ev.push("del") }, { clear: () => ev.push("clear"), me: () => {} }, () => ev.push("login"), (m) => ev.push("toast"), () => {}, () => ev.push("app"), null, () => ({}));
  await new Promise((x) => setTimeout(x, 5)); return ev.join(","); };
(async () => {
  const K = { name: "대표" };
  let e = await run({ ok: false, msg: "처리 중 오류가 발생했습니다." }, K); ok(!/del|login/.test(e) && /toast/.test(e), "1 잠깐의 서버 오류: 로그인 유지 · 안내만 (" + e + ")");
  e = await run({ ok: false, code: "BUSY", msg: "다른 저장 작업이 처리 중입니다." }, K); ok(!/del|login/.test(e), "2 저장이 겹친 때도 같음");
  e = await run({ ok: false, code: "EXPIRED", msg: "만료" }, K); ok(/del/.test(e) && /login/.test(e), "3 정말 만료면 예전처럼 로그인 화면으로 (" + e + ")");
  e = await run({ ok: false, msg: "오류" }, null); ok(/login/.test(e) && !/del/.test(e), "4 먼저 띄운 화면이 없으면 로그인 화면을 보이되 자동 로그인은 안 지움");
  e = await run({ ok: true, admin: { name: "대표", loginId: "boss" } }, null); ok(/app/.test(e), "5 정상이면 예전 그대로");
  END();
})();
