// (S237) 기사앱 [뒤로] 세 곳: 알림 화면(마이페이지가 꺼진 기사는 갇힘) · 일감 고친 뒤 · 마이페이지에서 연 비밀번호 변경
//  사용: node sbtest/ts237.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
const pa = lineOf("  $('#paBack').addEventListener('click', ");
function simPa(blocked) { const log = []; let h = null; new Function('$', 'menuBlocked', 'goHome', 'openMyPage', 'store', 'USER', pa)(() => ({ addEventListener: (ev, f) => { h = f; } }), (k, s) => { if (blocked && !s) log.push('창'); return blocked; }, () => log.push('home'), () => { if (blocked) log.push('창'); else log.push('my'); }, { get: () => 'null' }, 'u'); h(); return log.join(); }
ok(simPa(false) === 'my', '1 알림 [뒤로]: 평소에는 마이페이지 (' + simPa(false) + ')');
ok(simPa(true) === 'home', '2 마이페이지가 꺼진 기사는 창 없이 홈으로 (' + simPa(true) + ')');
ok(/pmFormFrom === 'mypage' \? 'mine' : pmFormFrom === 'detail' \? pmDetFrom : 'pumasi'/.test(ix), '3 상세에서 일감을 고쳐 저장하면 상세를 열었던 곳으로');
const a = ix.indexOf("  $('#cpBack').addEventListener('click', () => {"), cb = ix.slice(a, ix.indexOf('\n  });', a) + 6);
function simCp(from, forced, blocked) { const log = []; let h = null; const openChangePw = { from }; new Function('$', 'cpForced', 'openChangePw', 'menuBlocked', 'openMyPage', 'goHome', 'store', 'USER', cb)(() => ({ addEventListener: (ev, f) => { h = f; } }), forced, openChangePw, () => blocked, () => log.push('my'), () => log.push('home'), { get: () => 'null' }, 'u'); h(); return log.join(); }
ok(simCp('mypage', false, false) === 'my', '4 마이페이지에서 연 비밀번호 변경 [뒤로] → 마이페이지 (' + simCp('mypage', false, false) + ')');
ok(simCp('', false, false) === 'home', '5 홈에서 연 것은 홈');
ok(simCp('mypage', false, true) === 'home', '6 마이페이지가 꺼져 있으면 홈');
ok(simCp('mypage', true, false) === '', '7 꼭 바꿔야 하는 때(임시 비밀번호)는 예전처럼 못 나감');
ok(/if \(k === 'pw'\) return openChangePw\(false, '', 'mypage'\);/.test(ix), '8 마이페이지 메뉴가 어디서 열었는지 알림');
END();
