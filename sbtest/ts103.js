// S103 기사앱 미리 보기 = 기사가 실제로 보는 화면: 그 기사가 이미 본 공지 · 이미 누른 지시사항은 미리 보기에서도 팝업을 안 띄움 (확인 기록 기준)
//  · 안 본 것은 그대로 뜸 · 기사 본인 접속(미리 보기 아님)에는 이 목록을 안 내려 줌 · 배번호 안내는 미리 보기에서 저절로 안 띄움 (TZ=UTC)
//  사용: node sbtest/ts103.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
at('2026-11-20T15:00:00');
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D9', loginId: 'boss', name: '유대표', title: '대표', status: ST.ACTIVE, schCamp: '운영자', createdAt: nowText_() }); schSheet_(); " +
  ['A', 'B', 'C'].map((x) => "appendObj_(SH.DRIVERS, { id: '" + x + "', name: '기사" + x + "', status: ST.ACTIVE, createdAt: nowText_() });").join(' ') + " 1");
const tok = fresh().__sbLogin('boss', true).token;
const TA = ev("createSession_('A', true).token");
ev("appendObj_(SH.NOTICE, { id: 'N1', title: '본 공지', body: 'x', status: NST.ON, important: 'Y', start: '2026-11-19', createdAt: '2026-11-19 10:00:00' }); appendObj_(SH.NOTICE, { id: 'N2', title: '안 본 공지', body: 'y', status: NST.ON, important: 'Y', start: '2026-11-20', createdAt: '2026-11-20 10:00:00' }); cache_().remove('nt:all'); " +
  "appendObj_(SH.SEEN, { kind: 'notice', driverId: 'A', key: 'N1', at: '2026-11-19 12:00:00' }); appendObj_(SH.SEEN, { kind: 'inst', driverId: 'A', key: '2026-11-21|123', at: '2026-11-20 12:00:00' }); appendObj_(SH.SEEN, { kind: 'notice', driverId: 'B', key: 'N2', at: '2026-11-19 12:00:00' }); 1");
const pv = call('adm_previewStart', [tok, 'A']);
ok(pv.ok && /^PV/.test(pv.pv), '0 미리 보기 열쇠');
let r = call('api_notices', [pv.pv]);
ok(r.ok && JSON.stringify(r.pvSeen) === '["N1"]' && r.notices.length === 2, '1 미리 보기: 그 기사(A)가 이미 본 공지 목록을 같이 내려 줌 (다른 기사 기록은 안 섞임) ' + JSON.stringify(r.pvSeen));
r = call('api_notices', [TA]);
ok(r.ok && r.pvSeen === undefined, '2 기사 본인 접속에는 안 내려 줌');
r = call('api_mySchedule', [pv.pv, '2026-11']);
ok(r.ok !== false && JSON.stringify(r.pvInst) === '["2026-11-21|123"]', '3 미리 보기: 이미 누른 지시사항(날짜|글 지문)도 ' + JSON.stringify(r.pvInst || r.msg));
r = call('api_mySchedule', [TA, '2026-11']);
ok(r.pvInst === undefined, '4 기사 본인 접속에는 안 내려 줌');
// 기사앱: 지시사항 팝업 판단
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const fnSrc = ix.slice(ix.indexOf('  const instKey = '), ix.indexOf('  function instBoot()'));
const I = new Function('pddOf', 'store', 'USER', fnSrc + '; return { instDue: instDue, instKey: instKey };')((t) => { const p = t.split('-'); const x = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1)); return x.toISOString().slice(0, 10); }, { get: () => JSON.stringify({ id: 'A' }) }, 'u');
const txt = '헬멧 꼭 쓰기', hsh = (() => { let h = 0; for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0; return h; })();
const R = (pvInst) => ({ ok: true, today: '2026-11-20', inst: { '2026-11-21': txt }, pvInst });
ok(!!I.instDue(R(undefined), []), '5 (그대로) 안 누른 지시사항은 뜸');
ok(I.instDue(R(['2026-11-21|' + hsh]), []) === null, '6 미리 보기: 그 기사가 이미 누른 지시사항은 안 뜸');
ok(I.instDue(R(['2026-11-21']), []) === null, '7 예전 기록(날짜만)도 누른 것으로');
ok(!!I.instDue(R(['2026-11-21|999']), []), '8 내용이 바뀐 뒤에는 다시 뜸 (기사 화면과 같음)');
ok(/if \(PVT && Array\.isArray\(r\.pvSeen\)\)/.test(ix) && ix.indexOf('if (PVT && Array.isArray(r.pvSeen))') < ix.indexOf("const pop = ntGet(NT_POP), first = ntList.find"), '9 기사앱: 공지 팝업을 정하기 전에 이미 본 공지를 본 것으로 채움 (미리 보기만)');
ok(/if \(open \|\| \(!PVT && lsGet\(BIB_SEEN\) !== k\)\)/.test(ix), '10 미리 보기는 배번호 안내를 저절로 안 띄움');
