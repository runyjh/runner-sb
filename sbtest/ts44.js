// S52 수파베이스 표시(오른쪽 아래 알약)를 PC 에서는 왼쪽 메뉴 맨 아래로 — 저장 · 닫기 버튼을 가리지 않게
//  사용: node sbtest/ts44.js
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const boot = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8');
// 가짜 화면으로 dock() 을 돌려 본다
const src = boot.slice(boot.indexOf('  function dock() {'), boot.indexOf("  window.addEventListener('resize', function () { if (pill) paint(); });"));
const mk = (sideH, sideW, mobile, hasMe) => {
  const body = { kids: [], appendChild(x) { if (x.parentNode) x.parentNode.kids.splice(x.parentNode.kids.indexOf(x), 1); x.parentNode = body; body.kids.push(x); } };
  const me = { parentNode: null };
  const side = { offsetHeight: sideH, offsetWidth: sideW, kids: [], querySelector: () => (hasMe ? me : null), insertBefore(x, ref) { if (x.parentNode) x.parentNode.kids.splice(x.parentNode.kids.indexOf(x), 1); x.parentNode = side; side.kids.splice(side.kids.indexOf(ref), 0, x); } };
  me.parentNode = side; side.kids.push(me);
  const pill = { parentNode: null }; body.appendChild(pill);
  const document = { body, documentElement: { classList: { contains: () => mobile } }, querySelector: () => side };
  const dock = new Function('pill', 'document', src + '; return dock;')(pill, document);
  return { dock, pill, side, body, me };
};
let t = mk(900, 220, false, true); t.dock();
ok(t.pill.parentNode === t.side && t.side.kids[0] === t.pill && t.side.kids[1] === t.me, '1 PC: 왼쪽 메뉴 안 · 이름 바로 위로 들어감');
t.dock(); ok(t.side.kids.length === 2, '2 다시 불러도 한 번만');
t.side.offsetHeight = 0; t.dock(); ok(t.pill.parentNode === t.body, '3 메뉴가 안 보이면(로그인 전) 화면에 띄움');
t = mk(900, 220, true, true); t.dock(); ok(t.pill.parentNode === t.body, '4 휴대폰 화면은 그대로 (위 가운데)');
t = mk(60, 1200, false, true); t.dock(); ok(t.pill.parentNode === t.body, '5 좁은 화면(메뉴가 위쪽 띠)은 그대로');
t = mk(900, 220, false, false); t.dock(); ok(t.pill.parentNode === t.body, '6 이름 칸이 없으면 그대로');
ok(/#sbPill\.dock\{position:static/.test(boot) && /pill\.parentNode !== document\.body \? ' dock' : ''/.test(boot), '7 메뉴 안에서는 떠 있지 않음 (다른 버튼을 안 가림)');
