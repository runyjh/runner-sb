// S45 기사앱 홈 메뉴 타일: 아이콘 칸 높이를 모두 같게 → 품앗이(그림 아이콘)와 이모지 타일(스케줄·정산서·마이페이지)의 제목·설명 줄이 같은 높이
//  사용: node sbtest/ts36.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
ok(/\.menu \.tile > \.ti \{ height: 32px; display: flex; align-items: center; \}/.test(html) && /\.menu \.tile > \.ti \.pmi \{ width: 30px; height: 30px; vertical-align: 0; \}/.test(html), '1 타일 아이콘 칸 높이 고정 · 품앗이 그림 30px');
ok(/\.menu \.bdtile \.ti \{ display: inline; font-size: 20px;/.test(html) && /<b><i class="ti">💬<\/i>자유게시판<\/b>/.test(html), '2 자유게시판 줄 아이콘(제목 안)은 그대로');
(async () => {
  let pw; try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch (e) { console.log('SKIP 3 브라우저 없음'); return; }
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1], tiles = html.match(/<button class="tile" id="mSched"[\s\S]*?id="mMy"[^]*?<\/button>/)[0];
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 380, height: 420 } });
    await p.setContent('<meta charset="utf-8"><style>' + css + '</style><div class="menu">' + tiles + '</div>');
    const y = await p.evaluate(() => ['mSched', 'mSettle', 'mPm', 'mMy'].map((id) => { const t = document.getElementById(id), r = t.getBoundingClientRect().top; return [Math.round(t.querySelector('b').getBoundingClientRect().top - r), Math.round(t.querySelector(':scope > span').getBoundingClientRect().top - r)]; }));
    ok(y.every((v) => v[0] === y[0][0] && v[1] === y[0][1]), '3 네 타일 제목·설명 줄 높이 같음 ' + JSON.stringify(y));
  } finally { await b.close(); }
})().catch((e) => { console.error('ERR', e); process.exit(1); });
