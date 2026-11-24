// 시험판 만들기: 지금 버전 화면 + 서버 묶음 + 가짜 자료 → runner-sb/test/
//  사용: SB_URL=https://test.invalid SB_OUT=/tmp/sbtst node sbtest/build.js <runner-allinone> <라벨> <S번호>
//        node sbtest/test-site/mktest.js /tmp/sbtst <S번호>
//  - 실제 자료·수파베이스에는 닿지 않는다 (화면의 서버 요청은 tst.js 가 브라우저 안 서버로 보냄 · 보안 규칙에서도 수파베이스 주소를 뺌)
//  - 가짜 자료: 시험 ts1 과 같은 것 (캠프 3 · 기사0~29) + 11·12월 스케줄
const fs = require('fs'), path = require('path');
const SRC = process.argv[2], VER = process.argv[3] || 'S0';
const HERE = __dirname, SB = path.join(HERE, '..'), OUT = path.join(SB, '..', 'test');
if (!SRC || !fs.existsSync(path.join(SRC, 'engine.js'))) { console.error('빌드 폴더가 없습니다: ' + SRC); process.exit(1); }
if (fs.readFileSync(path.join(SRC, 'app.js'), 'utf8').indexOf('nlczahktyiwdbuakfncb') >= 0) { console.error('실제 수파베이스 주소로 만든 빌드입니다. SB_URL=https://test.invalid 로 다시 만드세요'); process.exit(1); }
const { makeFakeDb } = require(path.join(SB, 'fake-db.js')), { seed } = require(path.join(SB, 'ts1.js'));

(async () => {
  // 1) 가짜 자료 + 12월 스케줄 (지금 서버 묶음으로)
  const fdb = makeFakeDb({ lag: 0 }); fdb.seed(seed.S);
  const src = fs.readFileSync(path.join(SRC, 'engine.js'), 'utf8');
  const m = new Function(src + '\n;return { sbMakeServer: sbMakeServer, sbMakeKDate: sbMakeKDate, __ENGINE: __ENGINE, __GAS_NAMES: __GAS_NAMES };')();
  const srv = m.sbMakeServer({ engine: m.__ENGINE, gasNames: m.__GAS_NAMES, db: fdb, storage: fdb.storage, secrets: {}, Date: m.sbMakeKDate() });
  const ev = async (s) => (await srv.call('', [s], 'eval')).out;
  const lg = (await srv.call('adm_login', ['boss', 'x'], 'login')).out; const tok = lg && lg.token;
  if (!tok) throw new Error('관리자 로그인 실패 ' + JSON.stringify(lg).slice(0, 200));
  const ids = seed.ids, ch = [];
  ids.forEach((id, i) => { for (let d = 1; d <= 31; d++) ch.push({ row: id, date: '2026-12-' + String(d).padStart(2, '0'), value: (i + d) % 7 ? '출근' : '휴무', old: '' }); });
  const r = await srv.call('adm_schSave', [tok, ch]);
  if (!r.out || r.out.ok === false) throw new Error('12월 스케줄 실패 ' + JSON.stringify(r.out).slice(0, 200));
  await ev("(function () { var st = sheet_(SH.SESSIONS); if (st.getLastRow() > 1) st.deleteRows(2, st.getLastRow() - 1); return 1; })()");
  const D = fdb.DB, o = { seq: D.seq, gone: D.gone };
  ['tabs', 'rows', 'props', 'cache', 'files', 'store'].forEach((k) => { o[k] = [...D[k].entries()].map((e) => (k === 'store' ? [e[0], Array.from(e[1])] : e)); });
  o.cache = []; // 로그인 잠금 등 임시 기억은 비움

  // 2) 화면 파일
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'admin'), { recursive: true });
  const v = VER + '-' + Date.now().toString(36);
  const tag = (pre) => '<meta name="robots" content="noindex"><script>window.TST_V = ' + JSON.stringify(v) + ';</script><script src="' + pre + 'tst.js?v=' + v + '"></script>';
  const fix = (html, pre) => {
    html = html.replace(/(<head[^>]*>)/i, '$1' + tag(pre));
    html = html.replace(/ https:\/\/nlczahktyiwdbuakfncb\.supabase\.co/g, '').replace(/ https:\/\/fcmregistrations\.googleapis\.com| https:\/\/firebaseinstallations\.googleapis\.com/g, '');
    html = html.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'"); // 시험판: 기사로 들어가기 버튼이 서버 안 함수를 부름
    html = html.replace(/<title>([^<]*)<\/title>/i, '<title>[시험판] $1</title>');
    if (html.indexOf('tst.js') < 0 || /nlczahktyiwdbuakfncb\.supabase/.test(html)) throw new Error('화면 파일 고치기 실패');
    return html;
  };
  fs.writeFileSync(path.join(OUT, 'index.html'), fix(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), './'));
  fs.writeFileSync(path.join(OUT, 'admin', 'index.html'), fix(fs.readFileSync(path.join(SRC, 'admin', 'index.html'), 'utf8'), '../'));
  ['app.js', 'sw.js', 'version.json', 'engine.js'].forEach((f) => fs.copyFileSync(path.join(SRC, f), path.join(OUT, f)));
  fs.copyFileSync(path.join(SRC, 'admin', 'boot.js'), path.join(OUT, 'admin', 'boot.js'));
  // 앱 설치 이름에도 [시험] (운영 앱과 헷갈리지 않게)
  ['manifest.webmanifest', 'admin/manifest.webmanifest'].forEach((f) => { const p = path.join(SB, '..', f); if (!fs.existsSync(p)) return; const j = JSON.parse(fs.readFileSync(p, 'utf8')); ['name', 'short_name'].forEach((k) => { if (j[k]) j[k] = '[시험] ' + j[k]; }); if (j.id) j.id = j.id + '-test'; fs.writeFileSync(path.join(OUT, f), JSON.stringify(j, null, 1)); });
  fs.cpSync(path.join(SB, '..', 'icons'), path.join(OUT, 'icons'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'fake-db.js'), fs.readFileSync(path.join(SB, 'fake-db.js'), 'utf8').replace(/^module\.exports.*$/m, ''));
  fs.copyFileSync(path.join(SB, 'api-handler.js'), path.join(OUT, 'api-handler.js'));
  fs.copyFileSync(path.join(HERE, 'tst.js'), path.join(OUT, 'tst.js'));
  fs.writeFileSync(path.join(OUT, 'seed.json'), JSON.stringify(o));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log('시험판 ' + v + ' · 자료 ' + D.rows.size + '줄 · ' + (JSON.stringify(o).length / 1024).toFixed(0) + 'KB');
})().catch((e) => { console.error(e); process.exit(1); });
