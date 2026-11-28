// (S238) 기사앱 공지 사진: 못 받으면 「사진 불러오는 중…」이 계속 남던 것 → 못 받았다고 알리고 눌러서 다시
//  사용: node sbtest/ts238.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const a = ix.indexOf('  const NTPH = {}'), b = ix.indexOf('\n  }\n', ix.indexOf('  function ntPhLoad(n, box) {', a)) + 5;
async function sim(mode) {
  const boxes = [{ outerHTML: '' }], calls = []; let clickH = null;
  const doc = { querySelectorAll: () => boxes, addEventListener: (ev, f) => { clickH = f; } };
  const api = () => { calls.push(1); return mode[calls.length - 1] === 'ok' ? Promise.resolve({ ok: true, mime: 'image/png', data: 'AA' }) : mode[calls.length - 1] === 'no' ? Promise.resolve({ ok: false }) : Promise.reject(new Error('net')); };
  const M = new Function('document', 'api', 'store', 'TOKEN', 'escH', 'CSS', ix.slice(a, b) + '\nreturn { load: ntPhLoad, html: ntPhHtml };')(doc, api, { get: () => 't' }, 'T', (x) => String(x), { escape: (x) => x });
  const n = { id: 'N1', photos: 1, updatedAt: 'u' };
  M.load(n); await new Promise((r) => setTimeout(r, 5));
  const first = boxes[0].outerHTML;
  if (clickH) { clickH({ target: { closest: (q) => (q === '[data-npr]' && /data-npr/.test(first) ? { dataset: { npr: 'N1' } } : null) } }); await new Promise((r) => setTimeout(r, 5)); }
  return { first, second: boxes[0].outerHTML, calls: calls.length };
}
(async () => {
  let r = await sim(['no', 'ok']);
  ok(/불러오지 못했습니다/.test(r.first) && !/불러오는 중/.test(r.first), '1 서버가 못 준다고 답하면 「불러오지 못했습니다」로 바뀜');
  ok(r.calls === 2 && /<img /.test(r.second), '2 눌러서 다시 받으면 사진이 보임 (요청 ' + r.calls + '번)');
  r = await sim(['net', 'net']);
  ok(/불러오지 못했습니다/.test(r.first), '3 연결이 끊겨도 같음');
  r = await sim(['ok']);
  ok(/<img /.test(r.first) && r.calls === 1, '4 잘 받으면 예전 그대로');
  END();
})();
