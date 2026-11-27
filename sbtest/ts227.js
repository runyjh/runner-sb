// (S227) 기사앱 게시판: 「더 보기」를 누른 뒤 글을 보고 돌아오면 둘째 장(21~40번째 글)만 남던 것 → 첫 장부터
//  사용: node sbtest/ts227.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a = ix.indexOf('  function loadBoard(append) {'), b = ix.indexOf('\n  }\n', a) + 5;
ok(a > 0 && b > a, '0 게시판 목록 받기가 있음');
const all = Array.from({ length: 45 }, (_, i) => ({ id: 'P' + i, cat: '자유', title: '글' + i, author: 'x', at: '', likes: 0, cmts: 0 }));
const sent = [], el = () => ({ innerHTML: '', value: '', checked: false, classList: { toggle() {}, add() {}, remove() {} }, style: {} }), els = {};
const $ = (q) => els[q] || (els[q] = el());
const api = (fn, tok, o) => { sent.push(o.page); return { then: (f) => { f({ ok: true, posts: all.slice(o.page * 20, o.page * 20 + 20), more: o.page * 20 + 20 < all.length }); return { catch() {} }; } }; };
const M = new Function('$', 'api', 'pmTok', 'pmOk', 'paintBdCats', 'escH', 'bdAgo', 'pmFail',
  "let bdCat = '전체', bdPage = 0, bdPosts = [], bdCats = [];\n" + ix.slice(a, b) + "\nreturn { load: loadBoard, more: () => { bdPage++; loadBoard(true); }, ids: () => bdPosts.map((p) => p.id), page: () => bdPage };")(
  $, api, () => 't', (r) => r && r.ok, () => {}, (x) => String(x), () => '', () => {});
M.load(); ok(M.ids().length === 20 && M.ids()[0] === 'P0', '1 처음 열면 첫 장 20개');
M.more(); ok(M.ids().length === 40 && sent[sent.length - 1] === 1, '2 더 보기 → 40개');
M.load(); // 글을 보고 [뒤로] · 글을 지운 뒤 · 글쓰기 취소
ok(sent[sent.length - 1] === 0, '3 돌아오면 첫 장을 달라고 함 (보낸 장 = ' + sent[sent.length - 1] + ')');
ok(M.ids()[0] === 'P0' && M.ids().length === 20, '4 목록이 가장 새 글부터 (첫 글 = ' + M.ids()[0] + ')');
M.more(); ok(M.ids().length === 40 && M.ids()[20] === 'P20', '5 다시 더 보기 → 이어서 21번째부터');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
