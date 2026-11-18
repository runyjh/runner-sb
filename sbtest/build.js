/*
 * 수파베이스판 만들기 (저장소 runner-sb 에 올릴 파일)
 *  - index.html : 관리자 화면(src/Admin.html) 그대로 + 머리에 설정·boot.js
 *  - boot.js    : 수파베이스 로그인 · 서버 호출을 수파베이스 서버 함수로 · 가져오기 창 · 속도
 *  - xlsx.js    : 가져오기 때 엑셀 읽기 (이 기기에서)
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
const engine = '/* 러너 올인원 수파베이스판 서버 묶음 (' + supd + ' · 서버 코드 업데이트 ' + base + ' 기준) — 서버 코드(src/*.gs)를 고치지 않고 그대로 담았다. 자동으로 만든 파일 */\n' +
  rd('kdate.js') + rd('store.js') + rd('gas.js') + rd('server-core.js') +
  'var __GAS_NAMES = ' + JSON.stringify(GAS_NAMES) + ';\nfunction __ENGINE(' + E.params.join(', ') + ') {\n' + E.code + '\n}\n';
new (require('vm').Script)(engine, { filename: 'engine.js' });
const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const sha256 = crypto.createHash('sha256').update(engine).digest('hex');
const boot = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8'), xlsx = rd('xlsx.js');
fs.writeFileSync(path.join(OUT, 'engine.js'), engine); fs.writeFileSync(path.join(OUT, 'boot.js'), boot); fs.writeFileSync(path.join(OUT, 'xlsx.js'), xlsx);
let html = fs.readFileSync(path.join(REPO, 'src', 'Admin.html'), 'utf8');
if (!/<meta charset="utf-8">/.test(html)) throw new Error('Admin.html: <meta charset="utf-8"> 를 찾지 못했습니다.');
const cfg = Object.assign({}, CFG, { xv: h(xlsx), ver: 'sb-' + h(engine + boot), upd: supd + ' 수파베이스' });
const head = [
  '<title>러너 올인원 관리자 (수파베이스)</title>',
  '<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="robots" content="noindex">', '<meta name="referrer" content="no-referrer">', '<meta name="theme-color" content="#1b64da">',
  '<meta http-equiv="Content-Security-Policy" content="' + ["default-src 'self'", "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com/ajax/libs/pdf.js/ https://cdnjs.cloudflare.com/ajax/libs/xlsx/", "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", "font-src 'self' https://cdn.jsdelivr.net data:", "img-src 'self' data: blob:",
    "connect-src 'self' " + CFG.url, "frame-src 'self' blob: data:", "worker-src 'self' blob: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ') + '">',
  '<link rel="preconnect" href="' + CFG.url + '">',
  '<script>window.SB_CFG = ' + JSON.stringify(cfg) + ';</script>',
  '<script src="boot.js?v=' + h(boot) + '"></script>'
];
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + head.join('\n'));
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'engine.sha256'), sha256 + '\n');
console.log('OK ' + OUT + ' · index.html ' + html.length + ' · boot.js ' + boot.length + ' · xlsx.js ' + xlsx.length + ' · engine.js ' + engine.length + ' (서버 함수 ' + E.fnCount + '개)\nengine.js SHA-256 ' + sha256);
