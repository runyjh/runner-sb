// S51 기사앱 근무 가능일 달력: 스케줄 있는 날 칸이 사라지던 문제 (칸 이름 busy 가 화면 전체 가림막 .busy {display:none} 과 겹침)
//  → 칸 이름 gsch · 회색 '스케줄' 칸으로 보이고 날짜·요일 자리가 그대로
//  사용: node sbtest/ts41.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
ok(/busy\.has\(d\) \? \{ cls: 'gsch', sub: '스케줄' \}/.test(html) && !/cls: 'busy'/.test(html), '1 스케줄 있는 날 칸 이름 = gsch');
ok(/\.gvd\.gsch \{ background: #f2f4f6;/.test(html) && !/\.gvd\.busy/.test(html), '2 회색 칸 모양 = gsch');
(async () => {
  let pw; try { pw = require('/opt/npm-tools/node_modules/playwright'); } catch (e) { console.log('SKIP 3 브라우저 없음'); return; }
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 900 } });
    // 2026-11 달력: 1일 = 일요일. 20·23일 = 스케줄 (화면 코드와 같은 칸 모양)
    let g = '<div class="busy" id="busy"></div><div class="gvcal"><div class="gvgrid">';
    for (let d = 1; d <= 30; d++) g += '<button type="button" class="gvd ' + (d === 20 || d === 23 ? 'gsch' : '') + '" data-gd="' + d + '"><b>' + d + '</b>' + (d === 20 || d === 23 ? '<small>스케줄</small>' : '') + '</button>';
    await p.setContent('<meta charset="utf-8"><style>' + css + '</style>' + g + '</div></div>');
    const r = await p.evaluate(() => { const at = (d) => document.querySelector('[data-gd="' + d + '"]').getBoundingClientRect(); const c = (d) => { const e = document.querySelector('[data-gd="' + d + '"]'); return getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 20; }; return { show: c(20) && c(23), col: [Math.round(at(21).left), Math.round(at(14).left), Math.round(at(28).left)], col23: [Math.round(at(23).left), Math.round(at(16).left)] }; });
    ok(r.show, '3 스케줄 있는 날(20·23일) 칸이 보임');
    ok(r.col[0] === r.col[1] && r.col[1] === r.col[2] && r.col23[0] === r.col23[1], '4 요일 자리 그대로 (21일=14일=28일 토 · 23일=16일 월) ' + JSON.stringify(r));
  } finally { await b.close(); }
})().catch((e) => { console.error('ERR', e); process.exit(1); });
