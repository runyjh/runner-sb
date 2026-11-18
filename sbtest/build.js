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
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(man, null, 2));
const am = JSON.parse(fs.readFileSync(path.join(SITE, 'admin.webmanifest'), 'utf8')); am.id = './'; am.start_url = './'; am.scope = './'; am.name = '러너 관리자 (수파베이스)'; am.short_name = '러너S 관리';
am.icons = am.icons.map((i) => Object.assign({}, i, { src: '../' + i.src.replace(/^\.\//, '') }));
fs.writeFileSync(path.join(OUT, 'admin', 'manifest.webmanifest'), JSON.stringify(am, null, 2));
// extra = { script, connect }: 기사앱은 휴대폰 알림 등록(파이어베이스 메시징)만 더 연다 (읽기 사본 Firestore 는 막아 둠)
const csp = (extra) => { extra = extra || {}; return '<meta http-equiv="Content-Security-Policy" content="' + ["default-src 'self'", "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com/ajax/libs/pdf.js/ https://cdnjs.cloudflare.com/ajax/libs/xlsx/" + (extra.script ? ' ' + extra.script : ''), "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", "font-src 'self' https://cdn.jsdelivr.net data:", "img-src 'self' data: blob:", "manifest-src 'self'",
  "connect-src 'self' " + CFG.url + (extra.connect ? ' ' + extra.connect : ''), "frame-src 'self' blob: data:", "worker-src 'self' blob: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ') + '">'; };
const cfg = Object.assign({}, CFG, { xv: h(xlsx), ver: 'sb-' + h(engine + boot + app), upd: supd + ' 수파베이스' });
const page = (src, head) => { let x = fs.readFileSync(path.join(REPO, 'src', src), 'utf8'); if (!/<meta charset="utf-8">/.test(x)) throw new Error(src + ': <meta charset="utf-8"> 를 찾지 못했습니다.'); return x.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + head.join('\n')); };
const common0 = ['<meta name="referrer" content="no-referrer">', '<meta name="theme-color" content="#1b64da">', '<meta name="robots" content="noindex">'];
const common = common0.concat([csp(), '<link rel="preconnect" href="' + CFG.url + '">', '<script>window.SB_CFG = ' + JSON.stringify(cfg) + ';</script>']);
const PUSH_CSP = { script: 'https://www.gstatic.com/firebasejs/', connect: 'https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com' };
const commonApp = common0.concat([csp(PUSH_CSP)], common.slice(common0.length + 1));
// 관리자 화면의 '메일 수집기 코드' 에 들어가는 서버 주소 → 수파베이스 서버 함수 (원래 서버로 보내지 않게)
const MAIL_URL_OLD = "(RUNNER_API || '여기에_올인원_웹앱_주소(…/exec)')";
const html0 = page('Admin.html', ['<title>러너 올인원 관리자 (수파베이스)</title>', '<meta name="viewport" content="width=device-width, initial-scale=1">', '<link rel="icon" type="image/png" href="../icons/favicon-48.png">', '<link rel="manifest" href="manifest.webmanifest">', '<link rel="apple-touch-icon" href="../icons/admin-apple-touch-icon.png">'].concat(common, ['<script src="boot.js?v=' + h(boot) + '"></script>']));
if (html0.split(MAIL_URL_OLD).length !== 2) throw new Error('관리자 화면에서 메일 수집기 주소 자리를 찾지 못했습니다.');
const html = html0.replace(MAIL_URL_OLD, JSON.stringify(CFG.url + '/functions/v1/api'));
fs.writeFileSync(path.join(OUT, 'admin', 'index.html'), html);
const appHtml = page('Index.html', ['<title>러너 올인원 (수파베이스)</title>', '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', '<link rel="icon" type="image/png" href="icons/favicon-48.png">', '<link rel="manifest" href="manifest.webmanifest">', '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">', '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-title" content="러너S">'].concat(commonApp, ['<script src="app.js?v=' + h(app) + '"></script>']));
fs.writeFileSync(path.join(OUT, 'index.html'), appHtml);
// 서비스 워커 (앱 설치 · 휴대폰 알림): 원래 앱 것 그대로 (scope 는 /runner-sb/ 라 원래 앱과 섞이지 않음)
fs.copyFileSync(path.join(SITE, 'sw.js'), path.join(OUT, 'sw.js'));
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ ver: cfg.ver, at: new Date().toISOString() }));
fs.writeFileSync(path.join(OUT, 'engine.sha256'), sha256 + '\n');
console.log('OK ' + OUT + ' · 기사앱 index.html ' + appHtml.length + ' · admin/index.html ' + html.length + ' · engine.js ' + engine.length + ' (서버 함수 ' + E.fnCount + '개)\nengine.js SHA-256 ' + sha256);
