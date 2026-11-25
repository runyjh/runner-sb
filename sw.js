const RUNNER_FN = "https://nlczahktyiwdbuakfncb.supabase.co/functions/v1/api", RUNNER_KEY = "sb_publishable_90AZSDMvemYXkC17JGiHAg_GR9DnrWX";
const rcv = (mid, ev) => { if (!mid) return Promise.resolve(); return (ev === 'c' ? Promise.resolve() : new Promise((ok) => setTimeout(ok, Math.floor(Math.random() * 12000)))).then(() => fetch(RUNNER_FN, { method: 'POST', headers: { apikey: RUNNER_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'api_pushRcv', args: [String(mid), ev] }), credentials: 'omit', keepalive: true })).catch(() => {}); };
/*
 * 러너 앱 서비스 워커 — '앱 설치'(홈 화면 아이콘·전체 화면)를 위한 최소 구성.
 * 화면·데이터는 캐시하지 않는다 (항상 최신 코드, 데이터는 구글 시트에서 바로).
 * 인터넷이 끊겼을 때만 안내 화면을 보여 준다.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return; // 서버 호출(POST)·그림 등은 건드리지 않음
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:sans-serif;text-align:center;padding:30vh 24px;color:#333"><h2>인터넷 연결이 없습니다</h2>' +
    '<p>연결을 확인한 뒤 다시 열어 주세요.</p><button onclick="location.reload()" style="font-size:16px;padding:10px 20px">다시 시도</button></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});

/*
 * 품앗이 휴대폰 알림 (Firebase Cloud Messaging 의 웹 푸시).
 * 서버가 data 만 보내고, 알림 모양은 여기서 만든다. 앱이 앞에 열려 있으면 알림 대신 앱에 바로 전달.
 */
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { title: '러너', body: e.data ? e.data.text() : '' } }; }
  const d = p.data || (p.notification ? { title: p.notification.title, body: p.notification.body } : p);
  const title = d.title || '러너 품앗이', body = d.body || '', jobId = d.jobId || '', kind = d.kind || '';
  const ios = /iPhone|iPad|iPod|Macintosh/.test((self.navigator && self.navigator.userAgent) || '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const front = list.find((c) => c.visibilityState === 'visible' && c.focused && String(c.url || '').indexOf(self.registration.scope) === 0 && !/\/admin\//.test(String(c.url || '').slice(self.registration.scope.length - 1)));
    list.forEach((c) => c.postMessage({ type: 'pm-push', jobId: jobId }));
    const rp = rcv(d.mid, front && !ios ? 'f' : 'r');
    if (front && !ios) return rp; // 앱 화면에서 바로 보여 줌 (아이폰은 늘 알림 창도)
    // 아이콘 숫자: 알림 창에 쌓인 러너 알림 수 (앱을 열면 안 읽은 알림 수로 다시 맞춤)
    try { if (self.navigator && self.navigator.setAppBadge) self.registration.getNotifications().then((l) => self.navigator.setAppBadge(l.length + 1)).catch(() => {}); } catch (err) { /* 무시 */ }
    return Promise.all([rp, self.registration.showNotification(title, {
      body: body, data: { jobId: jobId, mid: d.mid || '' }, tag: kind === 'seen' ? 'pm-seen' : 'pm-' + (jobId || 'x') + '-' + Date.now() + Math.random().toString(36).slice(2, 6), renotify: true,
      icon: 'icons/icon-192.png', badge: 'icons/favicon-48.png', vibrate: d.pri === 'hi' ? [300, 120, 300, 120, 300] : [120, 60, 120], requireInteraction: d.pri === 'hi'
    })]);
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  try { if (self.navigator && self.navigator.clearAppBadge) self.registration.getNotifications().then((l) => (l.length ? self.navigator.setAppBadge(l.length) : self.navigator.clearAppBadge())).catch(() => {}); } catch (err) { /* 무시 */ }
  const jobId = (e.notification.data || {}).jobId || '';
  const rc = rcv((e.notification.data || {}).mid, 'c');
  const url = new URL(jobId ? './index.html?pm=' + encodeURIComponent(jobId) : './index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const app = list.find((c) => new URL(c.url).pathname.indexOf(new URL(self.registration.scope).pathname) === 0 && !/\/admin\//.test(c.url));
    if (app) { app.postMessage({ type: 'pm-open', jobId: jobId }); return app.focus(); }
    return self.clients.openWindow(url);
  }));
});
