// S105 확인 기록 › 챙길 사람 「앱 안 쓰는 기사」 카드: 이유를 나눠 셈 (비밀번호 안 바꿈 · 한 번도 안 엶 · 3일 넘음) — 예전에는 비밀번호 안 바꿈이 「3일 넘음」으로 셈
//  · 「정리 되돌리기」는 정리할 수 있는 묶음(꼭 확인 · 참고)에서만 보임 (실제 브라우저)
//  사용: node sbtest/ts105.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const css = ad.slice(ad.indexOf('  .al-sum {'), ad.indexOf('  /* (S85) 입금확인 선택 합계'));
const code = ad.slice(ad.indexOf("  const AL = { d: null, tab: 'todo'"), ad.indexOf("  $('#alTabs').addEventListener('click'"));
const click = ad.slice(ad.indexOf("  $('#alBody').addEventListener('click', (e) => {\n    if (e.target.id === 'alPvBtn')"), ad.indexOf("    const n = e.target.closest('[data-alnudge]');"));
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.setContent('<style>:root{--line:#e5e8ee;--sub:#6b7280;--brand:#1b64da}body{font-family:sans-serif;background:#f3f5f8;margin:0;padding:18px;font-size:14px}.btn{border:1px solid #cfd6e2;background:#fff;border-radius:8px;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer}.btn.ghost{background:#f6f8fb}.empty{background:#fff;border-radius:14px;padding:28px;text-align:center;color:#6b7280}.sub{color:#6b7280}' + css + '</style><div id="view-applog"><span id="alCount"></span><div id="alTabs" class="al-tabs"></div><div id="alBody"></div></div>');
  const D = { ok: true, today: '2026-11-20', drivers: [{ id: 'D0', name: '이윤형', camp: '안양1', title: '', mc: 1 }, { id: 'D1', name: '유지호', camp: '', title: '', mc: 1 }, { id: 'D2', name: '고광필', camp: '안양1', title: '' }, { id: 'D3', name: '박성훈', camp: '군포1', title: '' }],
    notices: [], rows: [], act: {}, now: Date.now(), nowMs: 300000, remind: {}, pushOff: {}, appSt: {},
    items: { D0: { name: '이윤형', camp: '안양1', items: [{ m: 'app', t: '비밀번호 안 바꿈', d: 'x', g: 'app' }] }, D1: { name: '유지호', camp: '', items: [{ m: 'app', t: '비밀번호 안 바꿈', d: 'x', g: 'app' }] }, D2: { name: '고광필', camp: '안양1', items: [{ m: 'app', t: '앱 기록 없음', d: 'x', g: 'app' }] }, D3: { name: '박성훈', camp: '군포1', items: [{ m: 'app', t: '앱 5일', d: 'x', g: 'app' }] } },
    menus: [], clr: { at: '2026-11-20 21:14:39', by: '대표', menu: '참고', n: 68, people: 39, undo: true }, clrMenus: [], rule: { noticeDays: 7, autoMax: 3, callDays: 3, autoHour: 18 } };
  await page.evaluate(({ code, click, D }) => {
    window.calls = []; window.RUNNER_CONFIG = { ver: 'sb-cur' };
    const env = { $: (s) => document.querySelector(s), $$: (s) => Array.from(document.querySelectorAll(s)), esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), koSort: (a, b) => String(a).localeCompare(String(b), 'ko'),
      api: (fn, a) => { window.calls.push([fn, a]); return Promise.resolve(fn === 'adm_seenList' ? D : { ok: true, target: 2, people: 1, pushed: 3, off: [] }); }, toast: (m) => { window.lastToast = m; }, pvOpen: () => {}, confirm: (m) => { window.lastConfirm = m; return true; } };
    new Function(...Object.keys(env), code + '\nAL.d = ' + JSON.stringify(D) + '; AL.at = Date.now(); window.AL = AL; window.alRender = alRender; alRender();\n' + click + '\n  });')(...Object.values(env));
  }, { code, click, D });
  await page.click('.tdx-c.app');
  const t = (await page.locator('.tdx-c.app').innerText()).replace(/\s+/g, ' ');
  ok(/4명/.test(t) && /비밀번호 안 바꿈 2 · 한 번도 안 엶 1 · 3일 넘음 1/.test(t), '1 앱 안 쓰는 기사 4명 = 비밀번호 안 바꿈 2 · 한 번도 안 엶 1 · 3일 넘음 1 (' + t + ')');
  ok(await page.locator('[data-alclrundo]').count() === 0, '2 앱 안 쓰는 기사에는 「정리 되돌리기」 없음 (정리 대상이 아님)');
  await page.click('.tdx-c.info');
  ok(await page.locator('[data-alclrundo]').count() === 1, '3 참고 묶음에는 「정리 되돌리기」 그대로');
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
})().catch((e) => { console.log('FAIL 화면 시험 오류: ' + e.message); process.exitCode = 1; }).finally(() => browser && browser.close());
