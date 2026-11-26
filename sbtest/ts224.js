// (S224) 알림이 켜져 있는 폰에 「알림 켜기」 창이 계속 뜨던 것: 최근 등록 + 폰이 「안 물어봄」이라고 답할 때
//  잠깐 뒤 다시 물어 허용이면 등록 · 구독이 살아 있으면 창 없음 · 구독도 없을 때만 창
//  사용: node sbtest/ts224.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const a = ix.indexOf('      if (recent && !pushAuto.sure) {'), b = ix.indexOf('      pushAuto.sure = false;', a);
ok(a > 0 && b > a, '0 다시 확인하는 부분이 있음');
async function sim(second, hasSub) {
  const log = []; let again = 0;
  const env = { recent: true, pushShown: false, pushDone: false, st: { pm: 'prompt', q: 'prompt', eff: 'default' } };
  const pushAuto = function () { again++; log.push('auto' + (pushAuto.sure ? ':sure' : '')); };
  const fn = new Function('env', 'pushAuto', 'pushPerm', 'pushHasSub', 'setTimeout', 'with (env) { return (function () {' + ix.slice(a, b) + ' return "gate-now"; })(); }');
  const r = fn(env, pushAuto, () => Promise.resolve({ eff: second }), () => Promise.resolve(hasSub), (f) => f());
  if (r && r.then) await r;
  return { log, done: env.pushDone, shown: env.pushShown, sure: !!pushAuto.sure };
}
(async () => {
  if (a > 0 && b > a) {
    let r = await sim('granted', false);
    ok(r.log.join() === 'auto' && !r.shown && !r.sure, '1 잠깐 뒤 허용으로 바뀌면 창 없이 그대로 등록으로 (' + r.log.join() + ')');
    r = await sim('default', true);
    ok(r.log.length === 0 && r.done && !r.shown, '2 구독이 살아 있으면 창을 안 띄움 (받는 중)');
    r = await sim('default', false);
    ok(r.log.join() === 'auto:sure' && !r.done, '3 구독도 없으면(다시 설치) 창을 띄우러 감');
  }
  ok(/function pushHasSub\(\)[\s\S]{0,400}getSubscription\(\)[\s\S]{0,200}res\(true\), 3000/.test(ix), '4 구독 확인이 3초 안에 답 없으면 창을 안 띄우는 쪽');
  console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
})();
