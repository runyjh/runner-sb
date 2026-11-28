// (S241) 기사앱 품앗이 상세: 맡긴 기사 이름에 & < 가 있으면 글자가 두 번 바뀌어 &amp;amp; 로 보이던 것
//  사용: node sbtest/ts241.js <runner-allinone 폴더>
const fs = require("fs"), path = require("path");
const ix = fs.readFileSync(path.join(process.argv[2], "src", "Index.html"), "utf8");
let bad = 0; const ok = (c, m) => { if (c) console.log("통과 " + m); else { bad++; console.log("문제 " + m); } };
const fnSrc = (sig) => { const a = ix.indexOf(sig); if (a < 0) return ""; let d = 0, b = ix.indexOf("{", a + sig.length - 1); for (; b < ix.length; b++) { if (ix[b] === "{") d++; else if (ix[b] === "}") { d--; if (!d) break; } } return ix.slice(a, b + 1); };
const lineOf = (sig) => { const a = ix.indexOf(sig); return a < 0 ? "" : ix.slice(a, ix.indexOf("\n", a)); };
const END = () => { console.log(bad ? "문제 " + bad + "가지" : "모두 통과"); process.exit(bad ? 1 : 0); };
ok(!/escH\(j\.useId === '주는 기사 아이디' \? escH\(j\.poster\)/.test(ix), '1 이름을 두 번 바꾸지 않음');
ok(/escH\(j\.useId === '주는 기사 아이디' \? j\.poster \+ ' 기사님 아이디로 배송'/.test(ix), '2 바깥에서 한 번만 바꿈 (안전하게 보이는 것은 그대로)');
const escH = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
ok(escH('김&이' + ' 기사님 아이디로 배송') === '김&amp;이 기사님 아이디로 배송', '3 「김&이」 → 화면에는 김&이 로 보임');
END();
