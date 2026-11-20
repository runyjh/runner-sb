// S85 입금확인 선택 합계: 보낼 사람을 고르면 「선택 N명 · 합계」 · Shift 로 사이 전부 · 고른 사람만 대량이체 복사 · 고른 사람 입금 완료 (브라우저에서 실제로 누름)
//  사용: node sbtest/ts85.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const css = ad.slice(ad.indexOf('  /* (S85) 입금확인 선택 합계'), ad.indexOf('  .td-clr {'));
const mk = ad.slice(ad.indexOf('<div id="stp-pay"'), ad.indexOf('<div id="stp-drv"'));
const code = ad.slice(ad.indexOf('  function renderPay() {'), ad.indexOf("  $('#payCopy').addEventListener"));
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent('<style>' + css + '.hidden{display:none}</style>' + mk.replace('id="stp-pay" class="hidden"', 'id="stp-pay"'));
  await page.evaluate((code) => {
    window.calls = []; window.toasts = []; window.clip = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.clip = t; return Promise.resolve(); } }, configurable: true });
    window.confirm = () => true;
    const env = { $: (s) => document.querySelector(s), $$: (s) => Array.from(document.querySelectorAll(s)), wn: (n) => Number(n).toLocaleString('ko-KR'), wnz: (n) => n ? Number(n).toLocaleString('ko-KR') : '', esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      tsApply: () => {}, loadPay: () => {}, stRenderSteps: () => { window.steps = (window.steps || 0) + 1; }, toast: (t) => window.toasts.push(t), ymdLocal: () => '2026-11-20', PQ: { send: () => Promise.resolve({ ok: true }), all: () => ({}) },
      api: (fn, m, list) => { window.calls.push([fn, m, list]); return Promise.resolve({ ok: true, today: '2026-11-20' }); },
      STX: { month: '2026-10', fund: { month: '2026-10', banks: [{ name: '러너 기사정산', role: '기사정산', balance: 40000000 }] }, pay: { dates: { pay: '2026-11-20' }, list: [
        { id: 'z', name: '선', net: 1000000, bank: '우리', account: '9', holder: '선', checked: false, early: true },
        { id: 'a', name: '가', net: 10000000, bank: '우리', account: '1002-1', holder: '가', checked: false },
        { id: 'b', name: '나', net: 9000000, bank: '국민', account: '2002-2', holder: '나', checked: false },
        { id: 'c', name: '다', net: 8000000, bank: '농협', account: '3003-3', holder: '다', checked: false },
        { id: 'd', name: '라', net: 7000000, bank: '신한', account: '', holder: '라', checked: false },
        { id: 'e', name: '마', net: 6000000, bank: '하나', account: '5005-5', holder: '마', checked: true }] } } };
    window.STX = env.STX;
    new Function(...Object.keys(env), code + '\nrenderPay();')(...Object.values(env));
  }, code);
  const txt = () => page.locator('#paySel').innerText();
  ok(/선택 합계/.test(await txt()), '1 처음엔 안내 「왼쪽 칸으로 보낼 사람을 고르면 선택 합계」');
  await page.click('[data-psel="a"]');
  await page.click('[data-psel="c"]', { modifiers: ['Shift'] });
  ok(/선택 3명/.test(await txt()) && /27,000,000/.test(await txt()), '2 가 고르고 Shift+다 → 사이 전부 3명 · 합계 27,000,000 ' + (await txt()).replace(/\n/g, ' '));
  ok(await page.locator('tr.sel').count() === 3, '3 고른 줄은 파랗게 표시');
  await page.click('#paySelCopy'); await page.waitForTimeout(50);
  const clip = await page.evaluate(() => window.clip), t1 = await page.evaluate(() => window.toasts.slice(-1)[0]);
  ok(clip.split('\n').length === 3 && /^우리\t10021\t가\t10000000/.test(clip) && /합계 27,000,000원/.test(t1), '4 고른 사람만 대량이체 복사 (3줄) · 「합계 27,000,000원 복사 · 은행 합계와 같은지 확인」');
  await page.click('[data-psel="d"]');
  await page.click('#paySelCopy'); await page.waitForTimeout(50);
  ok(/계좌 없음 · 0원 1명 뺌/.test(await page.evaluate(() => window.toasts.slice(-1)[0])), '5 계좌 없는 사람은 복사에서 빼고 알려 줌');
  await page.click('[data-psel="d"]');
  await page.click('#paySelDone'); await page.waitForTimeout(50);
  const call = await page.evaluate(() => window.calls.slice(-1)[0]);
  ok(call[0] === 'adm_stlPaySet' && call[1] === '2026-10' && call[2].map((x) => x.id).join() === 'a,b,c' && call[2].every((x) => x.checked), '6 [고른 3명 입금 완료] → 한 번에 저장 (확인 창에 명수 · 합계)');
  ok(await page.evaluate(() => window.STX.pay.list.filter((x) => x.checked).map((x) => x.id).join()) === 'a,b,c,e' && /선택 합계/.test(await txt()), '7 저장 뒤 체크 반영 · 선택은 비워짐');
  ok(!(await page.locator('[data-psel="a"]').count()), '8 「미입금만」이면 방금 입금 완료한 줄은 목록에서 빠짐');
  ok(await page.evaluate(() => window.STX.fund.banks[0].balance) === 13000000 && (await page.evaluate(() => window.steps)) >= 1, '9 입금 완료하면 화면의 기사정산 통장 잔액(4,000만 → 1,300만) · 「20일 · 기사 지급」 단계도 바로 바뀜');
  await page.uncheck('#payOnlyLeft'); await page.dispatchEvent('#payOnlyLeft', 'change');
  await page.click('[data-pay="e"]'); await page.waitForTimeout(50);
  ok(await page.evaluate(() => window.STX.fund.banks[0].balance) === 19000000, '10 한 명 체크를 풀면 잔액이 다시 늘어남 (+600만)');
  await page.click('[data-pay="z"]'); await page.waitForTimeout(50);
  ok(await page.evaluate(() => window.STX.fund.banks[0].balance) === 19000000, '11 15일 선지급(쿠팡정산 통장에서 나감)은 기사정산 잔액에서 안 뺌');
  await browser.close();
})().catch((e) => { console.log('FAIL ' + e.message); process.exitCode = 1; }).finally(() => browser && browser.close().catch(() => {}));
