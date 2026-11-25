const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  await p.goto('http://127.0.0.1:8765/runner-sb/admin/');
  await p.waitForSelector('#sbEm'); await p.fill('#sbEm', 'me@x'); await p.fill('#sbPw', 'pw'); await p.click('#sbBox button.pri');
  await p.waitForSelector('#lgId', { state: 'visible', timeout: 30000 });
  await p.fill('#lgId', 'boss'); await p.fill('#lgPw', 'anything1'); await p.click('#lgBtn');
  await p.waitForFunction(() => { const n = document.querySelector('.nav a[data-view="dash"]'); return n && n.offsetParent; }, null, { timeout: 20000 });
  await p.addStyleTag({ content: '#instPop{display:none!important}' });
  await p.click('.nav a[data-view="' + process.argv[2] + '"]'); await p.waitForTimeout(4000);
  const info = await p.evaluate(() => [...document.querySelectorAll('#sGrid td.c[data-pm]')].map((t) => t.dataset.r + ':' + t.dataset.c + ':' + t.dataset.pm.replace(/\n/g, ' ')));
  console.log('pm cells', info);
  ok(info.length >= 2, '1 품앗이 칸 2개 (맡김 · 받음)');
  const first = await p.$('#sGrid td.c[data-pm]');
  await first.hover(); await p.waitForTimeout(400);
  const st = await p.evaluate(() => ({ me: [...document.querySelectorAll('#sGrid td.pm-me')].map((t) => t.dataset.r + ':' + t.dataset.c), hot: [...document.querySelectorAll('#sGrid td.pm-hot')].map((t) => t.dataset.r + ':' + t.dataset.c), anim: (() => { const t = document.querySelector('#sGrid td.pm-hot'); return t ? getComputedStyle(t).animationName + ' ' + getComputedStyle(t).animationIterationCount : ''; })() }));
  console.log(st);
  ok(st.me.length === 1 && st.hot.length === 1 && st.hot[0] !== st.me[0] && st.hot[0].split(':')[1] === st.me[0].split(':')[1], '2 올린 칸 = 파란 테두리 · 같은 날 상대 칸 1개 점멸');
  ok(/pmhot infinite/.test(st.anim), '3 올리고 있는 동안 계속 깜빡임 (infinite)');
  await p.screenshot({ path: __dirname + '/shots/s214-hover.png' });
  // 상대 칸에 올려도 반대로
  await p.hover('#sGrid td.c[data-r="' + st.hot[0].split(':')[0] + '"][data-c="' + st.hot[0].split(':')[1] + '"]'); await p.waitForTimeout(300);
  const st2 = await p.evaluate(() => [...document.querySelectorAll('#sGrid td.pm-hot')].map((t) => t.dataset.r + ':' + t.dataset.c));
  ok(st2.length === 1 && st2[0] === st.me[0], '4 받은 기사 칸에 올리면 맡긴 기사 칸이 점멸');
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !document.querySelector('#sGrid td.pm-hot, #sGrid td.pm-me')), '5 마우스를 떼면 원래대로');
  // 화면 밖: 상대 줄이 스크롤로 안 보이게
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exitCode = 1; });
