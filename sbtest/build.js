/*
 * 수파베이스판 만들기 (저장소 runner-sb 에 올릴 파일)
 *  - index.html : 기사앱 화면(src/Index.html) 그대로 + 머리에 설정·app.js   → …/runner-sb/
 *  - app.js     : 기사앱 서버 호출을 수파베이스 서버 함수로
 *  - admin/index.html · admin/boot.js · admin/xlsx.js : 관리자 화면(src/Admin.html) 그대로 + 수파베이스 로그인 · 가져오기 · 속도   → …/runner-sb/admin/
 *  - icons/ · manifest.webmanifest · admin/manifest.webmanifest : 앱 설치용 (원래 앱 아이콘)
 *  - engine.js  : 서버 코드(src/*.gs 그대로) + 구글 서비스 대역 + 서버 실행기 → 수파베이스 서버 함수(api)가 받아 돌린다 (지문 SHA-256 으로 확인)
 * 사용: node sbtest/build.js [저장소 폴더] [기준 업데이트] [수파베이스 업데이트 S번호]
 * src/ 의 화면·서버 코드는 읽기만 한다.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = process.argv[2] || path.join(__dirname, '..'), OUT = process.env.SB_OUT || path.join(REPO, 'site', 'sb');
const base = process.argv[3] || '598', supd = process.argv[4] || 'S1';
const { engineSource, GAS_NAMES } = require('./engine-build.js');
const CFG = { url: process.env.SB_URL || 'https://nlczahktyiwdbuakfncb.supabase.co', key: 'sb_publishable_90AZSDMvemYXkC17JGiHAg_GR9DnrWX', ref: 'nlczahktyiwdbuakfncb' };
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const E = engineSource(path.join(REPO, 'src'));
const rd = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\nif \(typeof module !== 'undefined'\) module\.exports = [^\n]*\n?/, '\n');
const engine = '/* 러너 올인원 수파베이스판 서버 묶음 (서버 코드 업데이트 ' + base + ' 기준) — 서버 코드(src/*.gs)를 고치지 않고 그대로 담았다. 자동으로 만든 파일 */\n' +
  '/* pako 1.0.11 (inflate) — MIT License, (C) 2014-2017 Vitaly Puzrin and Andrei Tuputcyn · 엑셀(zip) 풀기용 */\nvar __sbPako = (function () { var module = { exports: {} }, exports = module.exports, define; ' + fs.readFileSync(path.join(__dirname, 'vendor', 'pako_inflate.min.js'), 'utf8') + '\n; return module.exports; })();\n' +
  rd('kdate.js') + rd('store.js') + rd('gas.js') + rd('ext.js') + rd('server-core.js') +
  'var __GAS_NAMES = ' + JSON.stringify(GAS_NAMES) + ';\nfunction __ENGINE(' + E.params.join(', ') + ') {\n' + E.code + '\n}\n';
new (require('vm').Script)(engine, { filename: 'engine.js' });
const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const sha256 = crypto.createHash('sha256').update(engine).digest('hex');
const boot = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), xlsx = rd('xlsx.js');
fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'engine.js'), engine); fs.writeFileSync(path.join(OUT, 'app.js'), app);
fs.writeFileSync(path.join(OUT, 'admin', 'boot.js'), boot); fs.writeFileSync(path.join(OUT, 'admin', 'xlsx.js'), xlsx);
// 앱 아이콘 · 설치 정보 (원래 앱 site/ 에서 복사 · 이름만 수파베이스판으로)
const SITE = path.join(REPO, 'site');
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.readdirSync(path.join(SITE, 'icons')).forEach((f) => fs.copyFileSync(path.join(SITE, 'icons', f), path.join(OUT, 'icons', f)));
const man = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.webmanifest'), 'utf8')); man.name = '러너 올인원 (수파베이스)'; man.short_name = '러너S';
// 기사앱 앱 범위 = index.html 만 (S33): 예전 './' 는 관리자앱(admin/)까지 덮어서 기사앱이 깔린 폰에서는 관리자앱이 기사앱 창으로 열리고 따로 설치 · 홈 화면 아이콘이 안 됨
//   (앱 id 는 그대로 './' → 이미 깐 기사앱은 그대로 같은 앱으로 새 설정을 받음)
man.id = './'; man.start_url = './index.html'; man.scope = './index.html';
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(man, null, 2));
const am = JSON.parse(fs.readFileSync(path.join(SITE, 'admin.webmanifest'), 'utf8')); am.id = './'; am.start_url = './?app=1'; am.scope = './'; // ?app=1 = 관리자앱 아이콘으로 열었음 (S33 · 설치 여부 기억용) am.name = '러너 관리자 (수파베이스)'; am.short_name = '러너S 관리';
am.icons = am.icons.map((i) => Object.assign({}, i, { src: '../' + i.src.replace(/^\.\//, '') }));
fs.writeFileSync(path.join(OUT, 'admin', 'manifest.webmanifest'), JSON.stringify(am, null, 2));
// extra = { script, connect }: 기사앱은 휴대폰 알림 등록(파이어베이스 메시징)만 더 연다 (읽기 사본 Firestore 는 막아 둠)
const csp = (extra) => { extra = extra || {}; return '<meta http-equiv="Content-Security-Policy" content="' + ["default-src 'self'", "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com/ajax/libs/pdf.js/ https://cdnjs.cloudflare.com/ajax/libs/xlsx/" + (extra.script ? ' ' + extra.script : ''), "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", "font-src 'self' https://cdn.jsdelivr.net data:", "img-src 'self' data: blob:", "manifest-src 'self'",
  "connect-src 'self' " + CFG.url + (extra.connect ? ' ' + extra.connect : ''), "frame-src 'self' blob: data:" + (extra.frame ? ' ' + extra.frame : ''), "worker-src 'self' blob: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ') + '">'; };
// (S106) 버전 번호에 기사앱 · 관리자 화면(Index.html · Admin.html)도 넣음 — 예전에는 서버 코드만 봐서 화면만 고친 업데이트(S102 등)는 「새 버전」 안내가 안 떴음 → 폰마다 예전 화면이 남음
const pagesSrc = ['Index.html', 'Admin.html'].map((f) => fs.readFileSync(path.join(REPO, 'src', f), 'utf8')).join('\n');
const cfg = Object.assign({}, CFG, { xv: h(xlsx), ver: 'sb-' + h(engine + boot + app + pagesSrc), vat: Date.now(), upd: supd + ' 수파베이스' }); // (S108) vat = 만든 시각
const page = (src, head) => { let x = fs.readFileSync(path.join(REPO, 'src', src), 'utf8'); if (!/<meta charset="utf-8">/.test(x)) throw new Error(src + ': <meta charset="utf-8"> 를 찾지 못했습니다.'); return x.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + head.join('\n')); };
const common0 = ['<meta name="referrer" content="no-referrer">', '<meta name="theme-color" content="#1b64da">', '<meta name="robots" content="noindex">'];
const common = common0.concat([csp(), '<link rel="preconnect" href="' + CFG.url + '">', '<script>window.SB_CFG = ' + JSON.stringify(cfg) + ';</script>']);
// (S43) 가입 화면 주소 검색(다음 우편번호): 스크립트 t1.daumcdn.net · 검색 창(iframe) postcode.map.daum.net / kakao.com — 원래 기사앱에는 이 제한(CSP)이 없어서 됐음
const PUSH_CSP = { script: 'https://www.gstatic.com/firebasejs/ https://t1.daumcdn.net', connect: 'https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com', frame: 'https://postcode.map.daum.net https://postcode.map.kakao.com' };
const commonApp = common0.concat([csp(PUSH_CSP)], common.slice(common0.length + 1));
// 관리자 화면의 '메일 수집기 코드' 에 들어가는 서버 주소 → 수파베이스 서버 함수 (원래 서버로 보내지 않게)
const MAIL_URL_OLD = "(RUNNER_API || '여기에_올인원_웹앱_주소(…/exec)')";
const html0 = page('Admin.html', ['<title>러너 올인원 관리자 (수파베이스)</title>', '<meta name="viewport" content="width=device-width, initial-scale=1">', '<link rel="icon" type="image/png" href="../icons/favicon-48.png">', '<link rel="manifest" href="manifest.webmanifest">', '<link rel="apple-touch-icon" href="../icons/admin-apple-touch-icon.png">'].concat(common, ['<script src="boot.js?v=' + h(boot) + '"></script>']));
if (html0.split(MAIL_URL_OLD).length !== 2) throw new Error('관리자 화면에서 메일 수집기 주소 자리를 찾지 못했습니다.');
const html = html0.replace(MAIL_URL_OLD, JSON.stringify(CFG.url + '/functions/v1/api'));
fs.writeFileSync(path.join(OUT, 'admin', 'index.html'), html);
const appHtml = page('Index.html', ['<title>러너 올인원 (수파베이스)</title>', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', '<link rel="icon" type="image/png" href="icons/favicon-48.png">', '<link rel="manifest" href="manifest.webmanifest">', '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">', '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-title" content="러너S">',
  // 주소가 '…/runner-sb/' 로 열리면 같은 화면 그대로 '…/runner-sb/index.html' 로 (S33 · 기사앱 앱 범위 안 → 설치 · 설치앱으로 열기)
  '<script>try{if(/\\/$/.test(location.pathname))history.replaceState(history.state,"",location.pathname+"index.html"+location.search+location.hash)}catch(e){}</script>'].concat(commonApp, ['<script src="app.js?v=' + h(app) + '"></script>']));
fs.writeFileSync(path.join(OUT, 'index.html'), appHtml);
// PC 설치 파일 (관리자 화면의 '앱 설치' → 윈도우 · ../download/Runner_Setup.bat): 원래 것에서 주소·이름만 수파베이스판으로
//  (원래 앱 아이콘 '러너 관리자' · 설치 폴더를 덮어쓰지 않게 이름에 S)
{
  let bat = fs.readFileSync(path.join(SITE, 'download', 'Runner_Setup.bat'), 'utf8');
  [['https://runyjh.github.io/runner/admin/', 'https://runyjh.github.io/runner-sb/admin/'], ["'https://runyjh.github.io/runner/'", "'https://runyjh.github.io/runner-sb/'"],
    ["'RunnerAllInOne'", "'RunnerAllInOneSB'"], ['러너 관리자', '러너S 관리자'], ['러너 기사 앱', '러너S 기사 앱'], ['러너 올인원  PC 설치 프로그램', '러너 올인원 (수파베이스)  PC 설치']].forEach(([a, b]) => {
    if (bat.indexOf(a) < 0) throw new Error('PC 설치 파일에서 바꿀 곳을 찾지 못했습니다: ' + a);
    bat = bat.split(a).join(b);
  });
  if (/runyjh\.github\.io\/runner\/|'RunnerAllInOne'/.test(bat)) throw new Error('PC 설치 파일에 원래 주소가 남았습니다');
  fs.mkdirSync(path.join(OUT, 'download'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'download', 'Runner_Setup.bat'), bat);
}
// 서비스 워커 (앱 설치 · 휴대폰 알림): 원래 앱 것 그대로 (scope 는 /runner-sb/ 라 원래 앱과 섞이지 않음)
//   알림을 누르면 여는 주소도 기사앱 범위(index.html) 안으로 (S33)
{
  let sw = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8');
  const A = "new URL(jobId ? './?pm=' + encodeURIComponent(jobId) : './', self.registration.scope)";
  if (sw.split(A).length !== 2) throw new Error('sw.js 에서 알림 주소 자리를 찾지 못했습니다');
  sw = sw.replace(A, "new URL(jobId ? './index.html?pm=' + encodeURIComponent(jobId) : './index.html', self.registration.scope)");
  // (S110) ① 아이폰은 앱을 보고 있을 때 온 알림도 알림 창을 띄움 (안 띄우면 아이폰이 몇 번 뒤 알림 권한을 끊음)
  //  ② 알림 창 이름표를 알림마다 따로 (같은 일감의 「B 지원」 「C 지원」이 하나로 덮이던 것) · 「확인할 것」 다시 알림만 하나로 묶음
  [["const title = d.title || '러너 품앗이', body = d.body || '', jobId = d.jobId || '';", "const title = d.title || '러너 품앗이', body = d.body || '', jobId = d.jobId || '', kind = d.kind || '';\n  const ios = /iPhone|iPad|iPod|Macintosh/.test((self.navigator && self.navigator.userAgent) || '');"],
   ["if (front) return; // 앱 화면에서 바로 보여 줌", "if (front && !ios) return; // 앱 화면에서 바로 보여 줌 (아이폰은 늘 알림 창도)"],
 ["vibrate: [120, 60, 120]", "vibrate: d.pri === 'hi' ? [300, 120, 300, 120, 300] : [120, 60, 120], requireInteraction: d.pri === 'hi'"], // (S114) 급한 알림(확정 · 확정 취소 · 일감 취소)은 눌러 닫을 때까지 남음
   ["tag: 'pm-' + (jobId || Date.now()), renotify: true,", "tag: kind === 'seen' ? 'pm-seen' : 'pm-' + (jobId || 'x') + '-' + Date.now() + Math.random().toString(36).slice(2, 6), renotify: true,"]].forEach(([a, b]) => {
    if (sw.split(a).length !== 2) throw new Error('sw.js 에서 바꿀 곳을 찾지 못했습니다: ' + a.slice(0, 40));
    sw = sw.replace(a, b);
  });
  // (S111) 알림 기록: 폰에 도착 · 앱 화면으로 전달 · 누름을 서버에 알림 (기록 번호 mid 만 · 로그인 없이)
  [["    list.forEach((c) => c.postMessage({ type: 'pm-push', jobId: jobId }));", "    list.forEach((c) => c.postMessage({ type: 'pm-push', jobId: jobId }));\n    const rp = rcv(d.mid, front && !ios ? 'f' : 'r');"],
   ["if (front && !ios) return; // 앱 화면에서 바로 보여 줌 (아이폰은 늘 알림 창도)", "if (front && !ios) return rp; // 앱 화면에서 바로 보여 줌 (아이폰은 늘 알림 창도)"],
   ["    return self.registration.showNotification(title, {", "    return Promise.all([rp, self.registration.showNotification(title, {"],
   ["requireInteraction: d.pri === 'hi'\n    });\n  }));", "requireInteraction: d.pri === 'hi'\n    })]);\n  }));"],
   ["body: body, tag:", "body: body, data: { jobId: jobId, mid: d.mid || '' }, tag:"],
   [", renotify: true, data: { jobId: jobId },", ", renotify: true,"],
   ["  const jobId = (e.notification.data || {}).jobId || '';", "  const jobId = (e.notification.data || {}).jobId || '';\n  const rc = rcv((e.notification.data || {}).mid, 'c');"]].forEach(([a, b]) => {
    if (sw.split(a).length !== 2) throw new Error('sw.js 에서 바꿀 곳을 찾지 못했습니다: ' + a.slice(0, 40));
    sw = sw.replace(a, b);
  });
  sw = "const RUNNER_FN = " + JSON.stringify(CFG.url + '/functions/v1/api') + ", RUNNER_KEY = " + JSON.stringify(CFG.key) + ";\n" +
    // (S117) 폰 도착 신호는 0~12초 사이로 흩어 보냄 (새 일감 알림 하나에 45대가 같은 순간 서버에 기록 → 저장이 서로 부딪혀 다른 요청까지 느려질 수 있음) · 누름은 바로
    "const rcv = (mid, ev) => { if (!mid) return Promise.resolve(); return (ev === 'c' ? Promise.resolve() : new Promise((ok) => setTimeout(ok, Math.floor(Math.random() * 12000)))).then(() => fetch(RUNNER_FN, { method: 'POST', headers: { apikey: RUNNER_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'api_pushRcv', args: [String(mid), ev] }), credentials: 'omit', keepalive: true })).catch(() => {}); };\n" + sw;
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
}
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ ver: cfg.ver, at: new Date().toISOString() }));
fs.writeFileSync(path.join(OUT, 'engine.sha256'), sha256 + '\n');
console.log('OK ' + OUT + ' · 기사앱 index.html ' + appHtml.length + ' · admin/index.html ' + html.length + ' · engine.js ' + engine.length + ' (서버 함수 ' + E.fnCount + '개)\nengine.js SHA-256 ' + sha256);
