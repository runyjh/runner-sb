// S111 빌드 결과 점검: 기사앱 · 관리자앱 화면 코드와 서비스 워커에 문법 오류가 없는지 (하나라도 있으면 화면 전체가 멈춤) · 서비스 워커가 알림 기록 신호를 보내는지
//  사용: node sbtest/ts111b.js <빌드 폴더(sbout)>
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
for (const f of ['index.html', 'admin/index.html']) {
  const h = fs.readFileSync(path.join(OUT, f), 'utf8'), re = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g, bad = [];
  let m, n = 0;
  while ((m = re.exec(h))) { n++; try { new Function(m[1]); } catch (e) { bad.push(n + ': ' + e.message); } }
  ok(n > 0 && !bad.length, f + ' 화면 코드 ' + n + '묶음 문법 오류 없음 ' + (bad.length ? JSON.stringify(bad) : ''));
}
const sw = fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8');
let swOk = true; try { new Function(sw); } catch (e) { swOk = false; }
ok(swOk, 'sw.js 문법 오류 없음');
(async () => {
  const H = {}, CALLS = [], NOTI = [];
  const client = { visibilityState: 'hidden', focused: false, url: 'https://runyjh.github.io/runner-sb/index.html', postMessage: () => {}, focus: async () => {} };
  const self = { addEventListener: (k, f) => { H[k] = f; }, skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => [client], openWindow: async () => {} }, registration: { scope: 'https://runyjh.github.io/runner-sb/', showNotification: async (t, o) => NOTI.push(o), getNotifications: async () => NOTI }, navigator: {} };
  new Function('self', 'fetch', 'Response', sw)(self, (u, o) => { CALLS.push(JSON.parse(o.body)); return Promise.resolve({}); }, function () {});
  let w; H.push({ data: { json: () => ({ data: { title: 't', body: 'b', jobId: 'J1', kind: 'apply', mid: 'L123456789' } }) }, waitUntil: (p) => { w = p; } }); await w;
  ok(CALLS.some((c) => c.fn === 'api_pushRcv' && c.args[0] === 'L123456789' && c.args[1] === 'r') && NOTI[0] && NOTI[0].data.mid === 'L123456789', '폰 도착 → api_pushRcv(mid, r) · 알림 창에 mid');
  H.notificationclick({ notification: { close() {}, data: NOTI[0].data }, waitUntil: (p) => { w = p; } }); await w;
  ok(CALLS.some((c) => c.fn === 'api_pushRcv' && c.args[1] === 'c'), '알림 누름 → api_pushRcv(mid, c)');
})();
// 관리자 기사별 보기 › 휴대폰 알림 기록 칸 (함수만 떼어 그려 봄)
{
  const ad = fs.readFileSync(path.join(OUT, 'admin/index.html'), 'utf8');
  const a = ad.indexOf('  const PL = { by: {}, busy: {} };'), b = ad.indexOf('  function alPushLoad(');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = new Function('esc', ad.slice(a, b) + '\n;return { PL, alPushHtml };')(esc);
  f.PL.by.D1 = { rows: [{ at: '2026-11-21 09:00:00', kind: 'newjob', title: '📢 새 품앗이 일감', devs: 2, res: '성공 2대', rcv: '2026-11-21 09:00:03', clk: '' }, { at: '2026-11-21 08:00:00', kind: 'board', title: '💬 새 댓글', res: '안 보냄', why: '등록된 기기 없음' }], devs: [{ device: '안드로이드 크롬', model: 'SM-S936N', createdAt: '2026-11-20 10:00:00', lastOk: '2026-11-21 09:00:00' }] };
  const h = f.alPushHtml('D1');
  ok(/폰 도착/.test(h) && /안 보냄/.test(h) && /등록된 기기 없음/.test(h) && /SM-S936N/.test(h) && /시험 알림 보내기/.test(h) && /불러오는 중/.test(f.alPushHtml('D2')), '관리자 휴대폰 알림 기록 칸: 폰 도착 · 안 보낸 이유 · 기기 · 시험 버튼');
}
// (S114) 급한 알림은 눌러 닫을 때까지 남음
(async () => {
  const H = {}, NOTI = [];
  const self = { addEventListener: (k, f) => { H[k] = f; }, skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => [] }, registration: { scope: 'https://runyjh.github.io/runner-sb/', showNotification: async (t, o) => NOTI.push(o), getNotifications: async () => NOTI }, navigator: {} };
  new Function('self', 'fetch', 'Response', sw)(self, () => Promise.resolve({}), function () {});
  for (const pri of ['hi', '']) { let w; H.push({ data: { json: () => ({ data: { title: 't', body: 'b', jobId: 'J1', kind: 'accept', pri } }) }, waitUntil: (p) => { w = p; } }); await w; }
  ok(NOTI[0].requireInteraction === true && !NOTI[1].requireInteraction, '(S114) 급한 알림(pri=hi)만 눌러 닫을 때까지 남음');
})();
