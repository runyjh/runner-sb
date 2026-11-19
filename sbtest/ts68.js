// S68 개명 · 이관된 라우트를 지금 코드로: 기사앱 「입차한 라우트」(백업) · 허위배송 그 주 기사 · 기사앱 허위배송 (안양1 110AB → 군포1 212AB) (TZ=UTC)
//  사용: node sbtest/ts68.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T22:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '강백업', status: ST.ACTIVE, schCamp: '안양1캠프', baseRoute: '백업', createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token, T1 = ev("createSession_('D1', true).token");
ev("['안양1캠프', '군포1캠프'].forEach(function (n, i) { appendObj_(SH.CAMPS, { id: 'C' + i, name: n, createdAt: nowText_() }); }); 1");
ev("['A', 'B'].forEach(function (L) { appendObj_(SH.RLIN, { id: 'L' + L, date: '2026-11-11', kind: RLK.MOVE, fromCamp: '안양1', fromCode: '110' + L, toCamp: '군포1', toCode: '212' + L, memo: '노선 이관', by: '대표', createdAt: nowText_() }); }); 1");
const pr = (wk, camp, code, perf, grade) => ({ wk, wave: 'W1', camp, code, perf, grade });
ev("adm_perfSave(" + JSON.stringify(tok) + ", { year: 2026, wk: 46, file: 'f', rows: " + JSON.stringify([pr(44, '안양1', '110_A', '97', '2'), pr(45, '안양1', '110_A', '99', '1'), pr(45, '군포1', '212_A', '100', '1'), pr(46, '군포1', '212_A', '100', '1'), pr(45, '안양1', '110_B', '96', '2'), pr(46, '군포1', '212_B', '98', '1')]) + " }); 1");
ev("(function () { schEnsureDates_(parseYmd_('2026-10-26'), parseYmd_('2026-11-25')); var sh = schSheet_(), h = schHeader_(true), r = sh.getLastRow() + 1, w = sh.getLastColumn(); var a = new Array(w).fill(''); a[h.fixed['행ID']] = 'D1'; a[h.fixed['구분']] = '기사'; a[h.dates['2026-11-03']] = '안양1 110AB'; a[h.dates['2026-11-09']] = '안양1 110A'; a[h.dates['2026-11-12']] = '군포1 212A'; a[h.dates['2026-11-13']] = '723C'; sh.getRange(r, 1, 1, w).setValues([a]); return 1; })()");
// 1. 기사앱 내 라우트 수행률 (백업 · 이번 정산기간 입차한 라우트)
let r = call('api_myPerf', [T1]);
const rec = (r.recent || []).map((x) => x.camp + ' ' + x.code + ' ' + (x.days || ''));
ok(r.ok && rec.indexOf('군포1 212A 3') >= 0 && rec.indexOf('군포1 212B 1') >= 0 && !rec.some((x) => /110[AB]/.test(x)), '1 안양1 110AB 로 적힌 날도 지금 코드 군포1 212AB 로 합침 (212A 3일 · 212B 1일) ' + JSON.stringify(rec));
const a = (r.recent || []).find((x) => x.code === '212A'), W = (w) => a.weeks.find((x) => x.wk === w) || {};
ok(a && W('WK46').grade === 1 && W('WK45').perf === 100 && W('WK44').perf === 97, '2 지금 코드 기록(WK45·46) + 예전 코드 이력(WK44 · 110A 97%) 을 이어 붙임 · 같은 주는 새 코드 먼저 ' + JSON.stringify(a && a.weeks.map((x) => x.wk + ':' + x.perf)));
ok(ev("JSON.stringify(rlnHead_(rlnEdges_(), '안양1', '110A'))") === '{"camp":"군포1","code":"212A"}' && ev("JSON.stringify(rlnHead_(rlnEdges_(), '안양1', '723C'))") === '{"camp":"안양1","code":"723C"}', '3 지금 코드 찾기: 이관된 것만 바뀜');
// 2. 허위배송 그 주 기사: 예전 코드 칸이어도 새 코드로도 찾음
const wd = JSON.parse(ev("JSON.stringify(fkWeekDrivers_('2026-11-08', '2026-11-14'))"));
ok((wd['군포1|212A'] || []).map((x) => x.name + x.days).join() === '강백업2' && (wd['안양1|110A'] || []).length === 1, '4 그 주 기사: 「안양1 110A」(11/9) · 「군포1 212A」(11/12) → 군포1 212A 로 2일 (예전 코드로도 찾음) ' + JSON.stringify(wd));
// 3. 기사앱 허위배송 (백업: 최신 주에 탄 라우트)
call('adm_fakeSave', [tok, { year: 2026, wk: 46, file: 'f', rows: [{ wk: 46, wave: 'W1', camp: '군포1', code: '212_A', perf: '0%', grade: '1' }, { wk: 46, wave: 'W1', camp: '안양1', code: '723_C', perf: '0%', grade: '1' }] }]);
r = call('api_myFake', [T1]);
ok(r.ok && r.routes.map((x) => x.camp + x.code).sort().join() === '군포1212A,안양1723C', '5 기사앱 허위배송: 110A 칸 → 군포1 212A 로 보임 ' + JSON.stringify(r.routes.map((x) => x.camp + x.code)));
