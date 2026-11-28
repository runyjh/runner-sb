// (S242) 기사앱 게시판: 분류를 빨리 바꾸거나 더 보기를 두 번 누르면 늦게 온 앞 답이 목록을 덮던 것
//  사용: node sbtest/ts242.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const a = ix.indexOf('  function loadBoard(append) {'), b = ix.indexOf('\n  }\n', a) + 5;
const pend = [], els = {}, $ = (q) => els[q] || (els[q] = { innerHTML: '', value: '', checked: false, classList: { toggle() {}, add() {}, remove() {} }, style: {} });
const api = (fn, tok, o) => ({ then: (f) => { pend.push({ o, f }); return { catch() {} }; } });
const M = new Function('$', 'api', 'pmTok', 'pmOk', 'paintBdCats', 'escH', 'bdAgo', 'pmFail', "let bdCat = '전체', bdPage = 0, bdPosts = [], bdCats = [];\n" + ix.slice(a, b) + "\nreturn { load: loadBoard, cat: (c) => { bdCat = c; }, ids: () => bdPosts.map((p) => p.id) };")($, api, () => 't', (r) => r && r.ok, () => {}, (x) => String(x), () => '', () => {});
const post = (id, cat) => ({ id, cat, title: id, author: 'x', at: '', likes: 0, cmts: 0 });
M.cat('자유'); M.load(); M.cat('질문'); M.load();
pend[1].f({ ok: true, posts: [post('Q1', '질문')] });   // 나중에 누른 것이 먼저 도착
pend[0].f({ ok: true, posts: [post('F1', '자유')] });   // 먼저 누른 것이 늦게 도착
ok(M.ids().join() === 'Q1', '1 마지막에 고른 분류(질문)의 글이 남음 (' + M.ids().join() + ')');
M.load(); pend[2].f({ ok: true, posts: [post('Q1', '질문'), post('Q2', '질문')] });
ok(M.ids().join() === 'Q1,Q2', '2 그 뒤 평소처럼 받음');
END();
