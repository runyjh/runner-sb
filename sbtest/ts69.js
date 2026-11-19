// S69 허위 배송완료 등급을 전 기사에게: 캠프 전체 라우트 · 백업은 이번 정산기간 탄 라우트 · 캠프 없는 기사는 전체 캠프 (TZ=UTC)
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
ev("appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '이운영', status: ST.ACTIVE, schCamp: '운영자', baseRoute: '백업', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D3', loginId: 'd3', name: '박고정', status: ST.ACTIVE, schCamp: '군포1캠프', baseRoute: '212A', createdAt: nowText_() }); 1");
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '강백업', status: ST.ACTIVE, schCamp: '안양1캠프', baseRoute: '백업', createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token, T1 = ev("createSession_('D1', true).token");

ev("['안양1캠프', '군포1캠프', '서초1캠프'].forEach(function (n, i) { appendObj_(SH.CAMPS, { id: 'C' + i, name: n, createdAt: nowText_() }); }); appendObj_(SH.CAMPS, { id: 'C9', name: 'F_삼성1캠프', parent: 'C2', createdAt: nowText_() }); appendObj_(SH.CAMPS, { id: 'C8', name: 'F_역삼1캠프', parent: 'C2', createdAt: nowText_() }); 1");
ev("appendObj_(SH.RLIN, { id: 'LS', date: '2026-11-18', kind: RLK.MOVE, fromCamp: '서초1', fromCode: '404A', toCamp: 'F_삼성1', toCode: '204A', memo: '이관', by: '대표', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D4', loginId: 'd4', name: '최삼성', status: ST.ACTIVE, schCamp: 'F_삼성1캠프', baseRoute: '204A', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D6', loginId: 'd6', name: '노캠백', status: ST.ACTIVE, schCamp: '', baseRoute: '백업', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D7', loginId: 'd7', name: '노캠고', status: ST.ACTIVE, schCamp: '', baseRoute: '708C', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D8', loginId: 'd8', name: '노캠무', status: ST.ACTIVE, schCamp: '', baseRoute: '백업', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D9', loginId: 'd9', name: '김관리', status: ST.ACTIVE, schCamp: '안양1캠프', title: '관리자', baseRoute: '백업', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D5', loginId: 'd5', name: '정역삼', status: ST.ACTIVE, schCamp: 'F_역삼1캠프', baseRoute: '백업', createdAt: nowText_() }); 1");
ev("['A', 'B'].forEach(function (L) { appendObj_(SH.RLIN, { id: 'L' + L, date: '2026-11-11', kind: RLK.MOVE, fromCamp: '안양1', fromCode: '110' + L, toCamp: '군포1', toCode: '212' + L, memo: '노선 이관', by: '대표', createdAt: nowText_() }); }); 1");
const pr = (wk, camp, code, perf, grade) => ({ wk, wave: 'W1', camp, code, perf, grade });
ev("adm_perfSave(" + JSON.stringify(tok) + ", { year: 2026, wk: 46, file: 'f', rows: " + JSON.stringify([pr(44, '안양1', '110_A', '97', '2'), pr(45, '안양1', '110_A', '99', '1'), pr(45, '군포1', '212_A', '100', '1'), pr(46, '군포1', '212_A', '100', '1'), pr(45, '안양1', '110_B', '96', '2'), pr(46, '군포1', '212_B', '98', '1')]) + " }); 1");
ev("(function () { schEnsureDates_(parseYmd_('2026-10-26'), parseYmd_('2026-11-25')); var sh = schSheet_(), h = schHeader_(true), r = sh.getLastRow() + 1, w = sh.getLastColumn(); var a = new Array(w).fill(''); a[h.fixed['행ID']] = 'D1'; a[h.fixed['구분']] = '기사'; a[h.dates['2026-11-03']] = '안양1 110AB'; a[h.dates['2026-11-09']] = '안양1 110A'; a[h.dates['2026-11-12']] = '군포1 212A'; a[h.dates['2026-11-13']] = '723C'; sh.getRange(r, 1, 1, w).setValues([a]); return 1; })()");
const T2 = ev("createSession_('D2', true).token"), T3 = ev("createSession_('D3', true).token");
// WK45: 안양1 723C · WK46: 군포1 212A·212B · 안양1 708C(4등급) — D1 은 WK46 칸에 탄 날이 없음(11/12 군포1 212A 는 WK46? → WK46 = 11/9~11/15)
call('adm_fakeSave', [tok, { year: 2026, wk: 46, file: 'f', rows: [
  { wk: 45, wave: 'W1', camp: '안양1', code: '723_C', perf: '0%', grade: '1' },
  { wk: 46, wave: 'W1', camp: '군포1', code: '212_A', perf: '0%', grade: '1' }, { wk: 46, wave: 'W1', camp: '군포1', code: '212_B', perf: '0.5%', grade: '2' },
  { wk: 46, wave: 'W1', camp: '안양1', code: '708_C', perf: '3%', grade: '4' }, { wk: 46, wave: 'W1', camp: '안양1', code: '723_C', perf: '0%', grade: '1' },
  { wk: 45, wave: 'W1', camp: '서초1', code: '404_A', perf: '1%', grade: '3' }, { wk: 46, wave: 'W1', camp: '서초1', code: '404_A', perf: '0%', grade: '1' }, { wk: 46, wave: 'W1', camp: '서초1', code: '519_A', perf: '0%', grade: '1' }] }]);
let r = call('api_myFake', [T1]);
ok(r.ok && r.campAllScope === '안양1' && r.campAll.map((x) => x.code).join() === '708C,723C', '1 백업 기사(안양1): 소속 캠프 전체 라우트 최신 주 ' + JSON.stringify(r.campAll));
ok(r.routes.map((x) => x.camp + x.code).indexOf('군포1212A') >= 0 && r.routes.map((x) => x.camp + x.code).indexOf('안양1723C') >= 0, '2 백업: 이번 정산기간 탄 라우트(이관 반영)도 내 라우트로 ' + JSON.stringify(r.routes.map((x) => x.camp + x.code)));
r = call('api_myFake', [T2]);
ok(r.ok && r.campAllScope === '' && r.campAll.length === 6 && r.campAll[0].camp === 'F_삼성1', '3 운영자: 전체 캠프 6줄 (서초1 404A 는 지금 코드 F_삼성1 204A 로) ' + JSON.stringify(r.campAll.map((x) => x.camp + x.code)));
r = call('api_myFake', [T3]);
ok(r.ok && r.routes.length === 1 && r.routes[0].code === '212A' && r.campAll.map((x) => x.code + ':' + x.grade).join() === '212A:1,212B:2', '4 고정 기사: 내 기본노선 + 군포1 전체 ' + JSON.stringify(r.campAll));
const T4 = ev("createSession_('D4', true).token"), T5 = ev("createSession_('D5', true).token");
r = call('api_myFake', [T4]);
ok(r.ok && r.campAllScope === 'F_삼성1' && r.campAll.length === 1 && r.campAll[0].code === '204A' && r.campAll[0].grade === 1 && r.campAll[0].was === '서초1 404A' && r.routes.length === 1 && r.routes[0].weeks.some((w) => w.grade === 3), '6 삼성1 기사: 서초1 404A 기록 → 하위(지금 코드 204A) 최신 주로 · 내 라우트 이력도 이어짐 ' + JSON.stringify(r.campAll));
r = call('api_myFake', [T5]);
ok(r.ok && r.campAllScope === '서초1' && r.campAll.map((x) => x.code).join() === '519A', '7 서브캠프에 자료가 없으면 상위 캠프(서초1) 라우트 ' + JSON.stringify(r.campAll));
ev("(function () { var sh = schSheet_(), h = schHeader_(true), r = sh.getLastRow() + 1, w = sh.getLastColumn(); var a = new Array(w).fill(''); a[h.fixed['행ID']] = 'D6'; a[h.fixed['구분']] = '기사'; a[h.dates['2026-11-12']] = '군포1 212B'; sh.getRange(r, 1, 1, w).setValues([a]); return 1; })()");
r = call('api_myFake', [ev("createSession_('D6', true).token")]);
ok(r.ok && r.campAllCamps.join() === '군포1' && r.campAll.map((x) => x.code).join() === '212A,212B', '8 캠프 빈 백업: 스케줄에 출근한 캠프(군포1)만 · 전체 아님 ' + JSON.stringify([r.campAllCamps, r.campAll.map((x) => x.camp + x.code)]));
r = call('api_myFake', [ev("createSession_('D7', true).token")]);
ok(r.ok && r.campAllCamps.join() === '안양1' && r.routes.map((x) => x.camp + x.code).join() === '안양1708C', '9 캠프 빈 고정: 기본노선 코드로 캠프를 찾아 그 캠프만 ' + JSON.stringify([r.campAllCamps, r.routes.map((x) => x.camp + x.code)]));
r = call('api_myFake', [ev("createSession_('D8', true).token")]);
ok(r.ok && r.campAll.length === 0 && r.campAllCamps.length === 0, '10 캠프도 스케줄도 없으면 아무 라우트도 안 보임 (전체 아님)');
r = call('api_myFake', [T2]);
ok(r.campAllCamps === 'all' && r.campAll.length === 6, '11 운영자만 전체');
const T9 = ev("createSession_('D9', true).token");
r = call('api_myFake', [T9]);
ok(r.campAllCamps === 'all' && r.campAll.length === 6, '12 직함자(관리자 · 소속 안양1)도 전체 캠프');
// 수행률 · 가중요인도 같은 범위 (rpfScope_)
r = call('api_myPerf', [T3]);
ok(r.ok && r.campAllScope === '군포1' && r.campAll.every((x) => x.camp === '군포1') && r.campAll.length >= 1, '13 수행률: 고정 기사(군포1)는 군포1 라우트만 ' + JSON.stringify(r.campAll.map((x) => x.camp + x.code)));
r = call('api_myPerf', [T9]);
ok(r.ok && r.campAllCamps === 'all' && r.campAll.some((x) => x.camp === '군포1'), '14 수행률: 직함자는 전체 캠프');
r = call('api_myPerf', [ev("createSession_('D8', true).token")]);
ok(r.ok && (r.campAll || []).length === 0, '15 수행률: 캠프도 스케줄도 없으면 아무것도 안 보임');
const scope = (id, keys) => ev("JSON.stringify(rpfScope_(driverById_('" + id + "'), rpfCamp_(driverById_('" + id + "').schCamp || ''), " + JSON.stringify(keys) + ", [{ camp: '안양1', code: '708C' }, { camp: '군포1', code: '212A' }], rlnEdges_()))");
ok(scope('D2', []) === 'null' && scope('D9', []) === 'null' && scope('D1', []) === '["안양1"]' && scope('D6', ['군포1|212B']) === '["군포1"]' && scope('D7', ['|708C']) === '["안양1"]' && scope('D8', []) === '[]', '16 범위 규칙(가중요인도 같음): 운영자·직함자 전체 · 소속 캠프 · 캠프 없으면 출근 캠프 · 코드만 있으면 그 코드의 캠프 · 없으면 빈칸');
const ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/r\.campAll\) \|\| \[\];\n\s+if \(!r \|\| !r\.ok \|\| \(!routes\.length && !cs\.length && !ca\.length && !W\.length\)\)/.test(ix) && /id="myCaBtn"/.test(ix) && /ca: \['#myCaBtn', '#myCa'\]/.test(ix) && !/class="fkall"/.test(ix) && (ix.match(/caSet\('(fk|perf|fb)', r/g) || []).length === 3, '5 기사앱: 세 메뉴는 내 라우트만 · 캠프 전체는 새 메뉴 「우리 캠프 라우트」 한 표로 (세 자료를 합침)');
