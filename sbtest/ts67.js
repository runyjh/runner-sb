// S67 허위배송 안내 [확인했습니다]: 기사앱 홈 → 확인 기록(app_seen · fake) · 관리자 확인 기록 「허위배송 확인」 탭 · 예전 알림 채우기 (TZ=UTC)
//  사용: node sbtest/ts67.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas, __sbPako: { inflateRaw: (u) => new Uint8Array(require('zlib').inflateRawSync(Buffer.from(u))) } });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: 'x', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T21:30:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '서석조', status: ST.ACTIVE, schCamp: '인천7캠프', baseRoute: '917D', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '김다른', status: ST.ACTIVE, schCamp: '인천7캠프', baseRoute: '919C', createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token, T1 = ev("createSession_('D1', true).token"), T2 = ev("createSession_('D2', true).token");
ev("(function () { schEnsureDates_(parseYmd_('2026-11-15'), parseYmd_('2026-11-28')); var sh = schSheet_(), h = schHeader_(true), r = sh.getLastRow() + 1, w = sh.getLastColumn(); var put = function (row, id, cells) { var a = new Array(w).fill(''); a[h.fixed['행ID']] = id; a[h.fixed['구분']] = '기사'; Object.keys(cells).forEach(function (d) { a[h.dates[d]] = cells[d]; }); sh.getRange(row, 1, 1, w).setValues([a]); }; put(r, 'D1', { '2026-11-18': '출근', '2026-11-23': '출근' }); put(r + 1, 'D2', { '2026-11-23': '출근' }); return 1; })()");
// 0. S67 전에 보낸 알림(의심 건 1 · 3~4등급 1)이 있던 상태 → 처음 열 때 확인 기록으로 채움
ev("appendObj_(SH.RFKC, { key: '2026-11-17|인천7|917D02|2026-11-17 07:10:00', date: '2026-11-17', camp: '인천7', code: '917D', route: '917D02', wave: '1W', doneAt: '2026-11-17 07:10:00', photo: 'https://image11.coupangcdn.com/p.jpg', driverId: 'D1', driver: '서석조', file: 'f', uploadedAt: nowText_(), by: '대표' }); appendObj_(SH.RFAKE, { key: '2026-W46|인천7|919C', week: '2026-W46', wk: 'WK46', from: '2026-11-08', to: '2026-11-14', camp: '인천7', code: '919C', rate: '5', grade: '3', file: 'f' }); PropertiesService.getScriptProperties().setProperty('FK_NOTI', JSON.stringify(['2026-W46|인천7|919C|D2'])); 1");
let r = call('adm_seenList', [tok]);
const fk = () => call('adm_seenList', [tok]).rows.filter((x) => x.k === 'fake');
let F0 = r.rows.filter((x) => x.k === 'fake');
ok(F0.length === 2 && F0.some((x) => x.d === 'D1' && x.key === 'C|2026-11-17|인천7|917D02|2026-11-17 07:10:00' && x.text === '11/17 07:10 인천7 917D02 · 배송 전 임의 배송완료 의심 (쿠팡 사진 검수)' && x.old === 'https://image11.coupangcdn.com/p.jpg' && !x.ack) && F0.some((x) => x.d === 'D2' && x.key === 'W|2026-W46|인천7|919C' && /WK46 \(11\/8~11\/14\) 인천7 919C · 허위 배송완료 3등급 · 처리율 5%/.test(x.text)), '1 예전 알림 2건을 확인 기록에 채움 (의심 건 · 3~4등급 · 사진) ' + JSON.stringify(F0.map((x) => x.text)));
ok(/ · 2$/.test(S.props.FK_SEEN_INIT || '') && call('adm_seenList', [tok]).rows.filter((x) => x.k === 'fake').length === 2, '2 채우기는 한 번만');
// 1. 기사앱: 홈에 뜸 → [확인했습니다]
let s1 = call('api_seen', [T1, [{ k: 'open', key: '' }]]);
ok(s1.ok && s1.fakes.length === 1 && s1.fakes[0].photo === 'https://image11.coupangcdn.com/p.jpg' && /917D02/.test(s1.fakes[0].text), '3 기사앱: 내 것만 홈에 뜸 (사진 주소 같이)');
ok(call('api_seen', [T2, []]).fakes.length === 1, '4 다른 기사는 자기 것만');
r = call('api_fakeAck', [T1, [s1.fakes[0].key]]);
ok(r.ok && r.n === 1 && call('api_seen', [T1, []]).fakes.length === 0, '5 [확인했습니다] → 다시 안 뜸');
F0 = fk();
ok(F0.find((x) => x.d === 'D1').ack === '2026-11-19 21:30:00' && !F0.find((x) => x.d === 'D2').ack, '6 관리자 확인 기록: 서석조 확인 시각 · 김다른 미확인');
// 2. 새 알림은 바로 확인 기록에 (3~4등급 · 의심 건)
r = call('adm_fakeSave', [tok, { year: 2026, wk: 48, file: 'f', rows: [{ wk: 48, wave: 'W1', camp: '인천7', code: '917_D', perf: '7%', grade: '4' }] }]);
F0 = fk();
ok(r.pushed === 1 && F0.some((x) => x.d === 'D1' && x.key === 'W|2026-W48|인천7|917D' && /WK48 \(11\/22~11\/28\) 인천7 917D · 허위 배송완료 4등급 · 처리율 7%/.test(x.text) && !x.ack), '7 새 3~4등급 알림 → 확인 기록 · 미확인');
const cb64 = fs.readFileSync(path.join(__dirname, 'fixtures', 'fake-case.xlsx')).toString('base64');
r = call('adm_fakeCaseUpload', [tok, { name: 'c.xlsx', b64: cb64 }]);
F0 = fk();
ok(r.ok && r.added === 1 && F0.filter((x) => x.d === 'D1' && /^C\|/.test(x.key)).length === 2 && F0.filter((x) => x.d === 'D1' && /^C\|/.test(x.key) && !x.ack).length === 1, '8 새 의심 건 → 확인 기록 · 미확인');
ok(call('api_seen', [T1, []]).fakes.length === 2, '9 기사앱 홈: 확인 안 한 2건');
r = call('api_fakeAck', [T1]);
ok(r.n === 2 && call('api_seen', [T1, []]).fakes.length === 0, '10 [확인했습니다] 한 번에 모두');
call('adm_fakeSave', [tok, { year: 2026, wk: 48, file: 'f2', rows: [{ wk: 48, wave: 'W1', camp: '인천7', code: '917_D', perf: '8%', grade: '4' }] }]);
ok(fk().filter((x) => x.key === 'W|2026-W48|인천7|917D').length === 1, '11 같은 주차 · 라우트를 다시 올려도 확인 기록은 한 줄');
// 3. 화면
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/\['fake', '🚫 허위배송'\]/.test(adm) && /TAB === 'fake'/.test(adm) && /k === 'fake' && fkOpen\.length/.test(adm) && /mf = mine\.filter\(\(r\) => r\.k === 'fake'\)/.test(adm), '12 관리자 확인 기록: 메뉴별 기록 › 「허위배송」 (S97 메뉴 정리) · 미확인 개수 · 기사별 보기에도');
ok(/id="fkBox"/.test(idx) && /api\('api_fakeAck', token, L\.map\(\(x\) => x\.key\)\)/.test(idx) && /SEEN\.fk = r\.fakes \|\| \[\]; fkPaint\(\)/.test(idx), '13 기사앱 홈: 허위 배송완료 안내 확인 상자 · [확인했습니다]');
