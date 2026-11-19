// S65 허위 배송완료처리: 수행률과 따로 저장 (메일 수집 · 직접 올리기) · 관리자 탭 · 기사앱 · 3~4등급 알림 · 예전 잘못 저장분 옮기기 (TZ=UTC)
//  사용: node sbtest/ts65.js <runner-allinone 폴더> [허위배송 xlsx]
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas, __sbPako: { inflateRaw: (u) => new Uint8Array(require('zlib').inflateRawSync(Buffer.from(u))) } }); // 서버 묶음의 pako 대신
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const XLSX = process.argv[3] || path.join(__dirname, 'fixtures', 'fake-wk46.xlsx');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T21:30:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
ev("appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '홍길동', status: ST.ACTIVE, schCamp: '인천7캠프', baseRoute: '917CD', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '김백업', status: ST.ACTIVE, schCamp: '인천7캠프', baseRoute: '', createdAt: nowText_() }); 1");
const T1 = ev("createSession_('D1', true).token"), T2 = ev("createSession_('D2', true).token");
// 0. 예전에 수행률로 잘못 저장된 줄 (route_perf · 원본파일에 '허위') + 진짜 수행률 줄
ev("adm_perfSave(" + JSON.stringify(tok) + ", { year: 2026, wk: 45, file: 'WK46_허위 배송완료처리율 안내_러너_20261119.xlsx', rows: [{ wk: 45, wave: 'W1', camp: '인천7', code: '917_D', perf: '1%', grade: '1' }, { wk: 45, wave: 'W1', camp: '강서1', code: '527_B', perf: '0%', grade: '1' }] }); adm_perfSave(" + JSON.stringify(tok) + ", { year: 2026, wk: 43, file: 'WK44_수행율 안내.xlsx', rows: [{ wk: 43, wave: 'W1', camp: '인천7', code: '917D', perf: '97', grade: '2' }] }); 1");
let r = call('adm_fakeList', [tok]);
ok(r.ok && r.rows.length === 2 && r.rows.every((x) => x.week === '2026-W45') && r.stained.length === 1 && r.stained[0].wk === 'WK45', '1 예전 잘못 저장분 2줄을 허위배송으로 옮겨 적음 · 수행률에 남은 주차 안내 (WK45) ' + JSON.stringify(r.stained));
ok(/ · 2$/.test(S.props.FK_MIG || ''), '2 옮기기는 한 번만');
// 1. 메일 수집: 진짜 쿠팡 파일
const key = call('adm_mailKeyNew', [tok]).key; call('adm_mailSet', [tok, true]);
const b64 = fs.readFileSync(XLSX).toString('base64');
const perfBefore = JSON.stringify(ev("rpfAll_().map(function (o) { return o.key + o.perf + o.grade; })"));
let m = call('api_mailFile', [key, { name: 'WK46_허위 배송완료처리율 안내_러너_20261119.xlsx', b64, from: 'GRP_Quickflex <grp_quickflex@coupangls.com>', subject: '[CLS] 11월 3주차_허위 배송완료처리현황 알림_러너', date: '2026-11-19 18:38', msgId: 'X1' }]);
ok(m.ok && m.status === '저장' && m.kind === '허위배송' && /라우트 52 · 3~4등급 0 · 처리율 0% 초과 2/.test(m.detail), '3 메일 수집: 「허위배송」으로 알아보고 저장 (라우트 52 · 0% 초과 2) ' + JSON.stringify(m));
ok(JSON.stringify(ev("rpfAll_().map(function (o) { return o.key + o.perf + o.grade; })")) === perfBefore, '4 주간 수행률은 한 줄도 안 바뀜');
const fk = JSON.parse(ev("JSON.stringify(fkAll_().map(function (o) { return o.week + '|' + o.camp + '|' + o.code + '|' + o.rate + '|' + o.grade; }))"));
ok(fk.filter((x) => /W46/.test(x)).length === 52 && fk.filter((x) => /W44/.test(x)).length === 52 && fk.indexOf('2026-W46|인천7|917D|1|1') >= 0 && fk.indexOf('2026-W46|강서1|527B|0|1') >= 0, '5 WK44~46 × 52 라우트 · 527_B → 527B · 처리율 % 숫자');
ok(!fk.some((x) => /W43/.test(x)), '6 빈 칸(WK43)은 저장하지 않음');
const log = JSON.parse(ev("JSON.stringify(readAll_(SH.MAILLOG).filter(function (o) { return o.at; }).map(function (o) { return o.kind + '|' + o.status + '|' + o.detail; }))"));
const lf = log.filter((x) => /^허위배송/.test(x)); ok(lf.length === 1 && /^허위배송\|저장\|/.test(lf[0]) && !/⚠/.test(lf[0]), '7 수집 기록 한 줄 (3~4등급 없으면 ⚠ 없음)');
ok(ev("readAll_(SH.MEMO).filter(function (o) { return o.id; }).length") === 0, '8 업무스케줄에는 안 적힘');
// 2. 3~4등급: 그 주에 그 라우트를 탄 기사에게만 알림
const h = JSON.parse(ev("JSON.stringify((function () { schEnsureDates_(parseYmd_('2026-11-15'), parseYmd_('2026-11-21')); return schHeader_(true); })())"));
ev("(function () { var sh = schSheet_(), h = schHeader_(true), r = sh.getLastRow() + 1, w = sh.getLastColumn(); var put = function (row, id, cells) { var a = new Array(w).fill(''); a[h.fixed['행ID']] = id; a[h.fixed['구분']] = '기사'; Object.keys(cells).forEach(function (d) { a[h.dates[d]] = cells[d]; }); sh.getRange(row, 1, 1, w).setValues([a]); }; put(r, 'D1', { '2026-11-15': '출근', '2026-11-16': '출근', '2026-11-17': '휴무', '2026-11-18': '출근' }); put(r + 1, 'D2', { '2026-11-17': '917D', '2026-11-18': '인천7 919C' }); return 1; })()");
r = call('adm_fakeSave', [tok, { year: 2026, wk: 47, file: 'WK47_허위 배송완료처리율 안내_러너_20261126.xlsx', rows: [{ wk: 47, wave: 'W1', camp: '인천7', code: '917_D', perf: '6%', grade: '3' }, { wk: 47, wave: 'W1', camp: '인천7', code: '919_C', perf: '0%', grade: '1' }, { wk: 47, wave: 'W1', camp: '강서1', code: '527_B', perf: '9%', grade: '4' }] }]);
ok(r.ok && r.bad === 2 && r.pushed === 2, '9 WK47 3~4등급 2개 → 917D 를 탄 홍길동(기본노선 출근 3일) · 김백업(1일)에게 알림 2건 · 527B 는 탄 기사 없음 ' + JSON.stringify({ bad: r.bad, pushed: r.pushed }));
const al = JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).map(function (o) { return o.driverId + '|' + o.kind + '|' + o.jobId + '|' + o.text; }))"));
ok(al.length === 2 && al.every((x) => /\|fake\|FK-2026-W47\|.*WK47 \(11\/15~11\/21\) 인천7 917D 허위 배송완료 3등급 · 처리율 6%/.test(x)), '10 알림 내용: 주차 · 기간 · 라우트 · 등급 · 처리율 ' + JSON.stringify(al[0]));
r = call('adm_fakeSave', [tok, { year: 2026, wk: 47, file: 'again.xlsx', rows: [{ wk: 47, wave: 'W1', camp: '인천7', code: '917_D', perf: '7%', grade: '3' }] }]);
ok(r.pushed === 0 && JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).length)")) === 2, '11 같은 주차 · 라우트는 다시 올려도 한 번만 알림');
const log2 = JSON.parse(ev("JSON.stringify(readAll_(SH.MAILLOG).filter(function (o) { return o.at; }).map(function (o) { return o.from + '|' + o.file + '|' + o.kind + '|' + o.detail; }))"));
ok(log2.some((x) => /^직접 올림 · 대표\|47주차 허위배송 업로드\|허위배송\|⚠ 3~4등급 2/.test(x)), '12 직접 올림 기록: ⚠ 3~4등급 ' + JSON.stringify(log2.slice(-2)));
call('adm_fakeSet', [tok, { notiOn: false }]);
r = call('adm_fakeSave', [tok, { year: 2026, wk: 48, file: 'f', rows: [{ wk: 48, wave: 'W1', camp: '인천7', code: '917_D', perf: '8%', grade: '4' }] }]);
ok(r.pushed === 0 && call('adm_fakeList', [tok]).notiOn === false, '13 알림을 끄면 안 보냄');
call('adm_fakeSet', [tok, { notiOn: true }]);
// 2-1. 배송 전 임의 배송완료 의심 건 (쿠팡 CX 메일 · 진짜 첨부: 11/18 인천7 917D01 06:58:31 · 사진 주소)
const CASE = path.join(path.dirname(XLSX), 'fake-case.xlsx'), cb64 = fs.readFileSync(CASE).toString('base64');
const IMG = ev("JSON.stringify(fcImages_(Utilities.base64Decode(" + JSON.stringify(cb64) + ")))"); ok(IMG.indexOf('{"2":"https://image11.coupangcdn.com/image/parcel/message/push/attach/test-photo') === 0, '25 엑셀 안 사진(IMAGE 칸)의 쿠팡 주소를 그 줄에 맞춰 읽음 ' + IMG.slice(0, 60));
function fcAll_n() { return ev('fcAll_().length'); }
const alN = () => JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).length)"));
const al0 = alN();
m = call('api_mailFile', [key, { name: '러너_runyjh@naver.com.xlsx', b64: cb64, from: 'GRP_Quickflex_CX <Quickflex_CX@coupangls.com>', subject: '[CLS] 배송 전 임의 배송완료 현황 공유 및 점검 요청 (회신 불필요)_러너', date: '2026-11-19 18:29', msgId: 'C1' }]);
ok(m.ok && m.status === '저장' && m.kind === '허위배송 의심' && m.period === '11/18' && /^⚠ 의심 1건 · 새로 1 · 이미 있음 0 · 기사 알림 1건 · 인천7 917D01 홍길동/.test(m.detail), '26 메일 수집: 「허위배송 의심」 · 그날 기사(홍길동 · 출근 = 기본노선 917CD) · ⚠ ' + JSON.stringify(m));
const cs = JSON.parse(ev("JSON.stringify(fcAll_())"));
ok(cs.length === 1 && cs[0].date === '2026-11-18' && cs[0].camp === '인천7' && cs[0].code === '917D' && cs[0].route === '917D01' && cs[0].doneAt === '2026-11-18 06:58:31' && /^https:\/\/image11\.coupangcdn\.com\//.test(cs[0].photo) && cs[0].driverId === 'D1', '27 저장: 날짜 · 라우트(917D01 → 917D) · 배송완료 시각(오전 6:58:31) · 사진 주소 · 기사');
const a1 = JSON.parse(ev("JSON.stringify(readAll_(SH.PALERT).slice(-1)[0])"));
ok(alN() === al0 + 1 && a1.driverId === 'D1' && a1.jobId === 'FK-C2026-11-18' && /11\/18 06:58 인천7 917D01 배송완료 건이 쿠팡 사진 검수에서 「배송 전 임의 배송완료」로 의심/.test(a1.text), '28 그날 그 라우트를 탄 기사에게만 알림 ' + a1.text);
m = call('api_mailFile', [key, { name: '러너_runyjh@naver.com.xlsx', b64: cb64, from: 'x@coupangls.com', subject: 's', date: '2026-11-19 18:40', msgId: 'C2' }]);
r = call('adm_fakeCaseUpload', [tok, { name: '러너.xlsx', b64: cb64 }]);
ok(m.status === '저장' && /새로 0 · 이미 있음 1/.test(m.detail) && r.ok && r.added === 0 && r.same === 1 && alN() === al0 + 1 && fcAll_n() === 1, '29 같은 건은 다른 메일 · 직접 올리기로 다시 와도 한 번만 (알림도)');
ok(ev("readAll_(SH.MEMO).filter(function (o) { return o.id; }).length") === 0, '30 업무스케줄에는 안 적힘');
r = call('adm_fakeList', [tok]);
ok(r.cases.length === 1 && r.cases[0].driver === '홍길동' && /coupangcdn/.test(r.cases[0].photo), '31 관리자: 의심 건 목록 (최근 90일 · 사진)');
ok(r.weeks.slice(-1)[0] === '2026-W48' && r.weeks.length <= 8, '14 관리자: 최근 8주까지 · 최신 WK48');
KDate.__setClock(() => Date.parse('2026-11-22T10:00:00+09:00'));
ev("fkAll_().filter(function () { return false; }); 1");
r = JSON.parse(ev("JSON.stringify(fkWeekDrivers_('2026-11-15', '2026-11-21'))"));
ok(r['인천7|917D'].map((x) => x.name + x.days + (x.base ? 'B' : '')).join() === '홍길동3B,김백업1' && r['인천7|917C'][0].name === '홍길동' && r['인천7|919C'][0].name === '김백업', '15 그 주 기사: 출근 = 기본노선 · 휴무 뺌 · 칸에 적힌 라우트 · 캠프 이름 ' + JSON.stringify(r));
let my = call('api_myFake', [T1]);
ok(my.ok && my.routes.map((x) => x.code).join() === '917C,917D' && my.weeks.length === 4 && my.routes[1].weeks.slice(-1)[0].grade === 4 && my.routes[0].weeks.slice(-1)[0].grade === null, '16 기사앱(고정): 내 기본노선 917C · 917D 최근 4주 (WK48 은 917D 만)');
ok(my.cases.length === 1 && my.cases[0].route === '917D01' && /coupangcdn/.test(my.cases[0].photo), '32 기사앱: 내 의심 건 · 사진 보기');
my = call('api_myFake', [T2]);
ok(my.ok && my.backup && my.routes.length === 0 && my.cases.length === 0, '17 기사앱(백업): 최신 주(WK48)에 탄 라우트가 없으면 안 보임');
const hm = call('adm_home', [tok]);
ok(hm.ok && hm.perf && hm.perf.fk && hm.perf.fk.bad === 1 && hm.perf.fk.cases === 1, '18 대시보드: 허위배송 3~4등급 (최신 주차) ' + JSON.stringify(hm.perf && hm.perf.fk));
// 4. 화면 코드
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/if \(\/허위\/\.test\(f\.name \+ ' ' \+ ttl\)\) return \{ file: f\.name, kind: 'fk', P \}/.test(adm), '19 관리자 [쿠팡 파일 올리기]도 허위배송을 따로 알아봄');
ok(/\['fk', '🚫 허위배송'\]/.test(adm) && /if \(tab === 'fk'\) return fkRender\(box\)/.test(adm) && /api\('adm_fakeSave'/.test(adm), '20 수행률 메뉴에 허위배송 탭 · 저장');
ok(/id="myFkBtn"/.test(idx) && /api\('api_myFake', token\)/.test(idx) && /indexOf\('FK-'\) === 0/.test(idx), '21 기사앱: 마이페이지 줄 · 알림 누르면 그 줄 열림');
// 5. 관리자 허위배송 탭 그리기 (화면 코드를 그대로 돌려 봄)
{
  const a = adm.indexOf('  const FK = { loaded'), b = adm.indexOf('  const FW = { cum: [], day: [],');
  const env = { toast: () => {}, api: () => Promise.resolve({}), rpViewOn: () => true, RP: { tab: 'fk' }, rpRender: () => {}, esc: (s) => String(s == null ? '' : s), koSort: (x, y) => (x < y ? -1 : x > y ? 1 : 0), grBadge: (g) => '[' + g + ']', rpWkLabel: (w) => 'WK' + Number(String(w).slice(6)), rpMd: (d) => (d ? +d.slice(5, 7) + '/' + +d.slice(8, 10) : '') };
  let html = ''; const box = { insertAdjacentHTML: (p, h) => { html += h; } };
  const M = new Function(...Object.keys(env), adm.slice(a, b) + ';return { FK, fkRender };')(...Object.values(env));
  Object.assign(M.FK, { loaded: true, notiOn: true, weeks: ['2026-W45', '2026-W46'], stained: [{ wk: 'WK44', n: 52 }], who: { '인천7|917D': [{ name: '홍길동', days: 2, base: true }, { name: '김백업', days: 1, base: false }] }, rows: [
    { week: '2026-W46', wk: 'WK46', from: '2026-11-08', to: '2026-11-14', camp: '인천7', code: '917D', rate: 1, grade: 1, uploadedAt: '2026-11-19 18:46:07' }, { week: '2026-W45', wk: 'WK45', camp: '인천7', code: '917D', rate: 1, grade: 1 }, { week: '2026-W46', wk: 'WK46', camp: '강서1', code: '527B', rate: 0, grade: 3 }] });
  M.fkRender(box);
  ok(/fk-bad/.test(html) && /fk-y/.test(html) && /3~4등급<b>1/.test(html) && /처리율 0% 초과<b>1/.test(html), '22 탭: 3~4등급 빨강 · 0% 초과 노랑 · 개수');
  ok(/홍길동/.test(html) && /김백업 <small class="sub">1일/.test(html) && /⚠ 주간 수행률에 허위배송 값이 남아 있습니다 \(WK44\)/.test(html), '23 탭: 그 주 기사(고정은 이름만 · 아니면 뛴 날) · 수행률 복구 안내');
  M.FK.f.mode = 'bad'; html = ''; M.fkRender(box);
  ok((html.match(/<tr class=/g) || []).length === 1, '24 보기 「3~4등급만」');
}
{
  const a = adm.indexOf('  const FK = { loaded'), b = adm.indexOf('  const FW = { cum: [], day: [],');
  const env = { toast: () => {}, api: () => Promise.resolve({}), rpViewOn: () => true, RP: { tab: 'fk' }, rpRender: () => {}, esc: (s) => String(s == null ? '' : s), koSort: (x, y) => (x < y ? -1 : x > y ? 1 : 0), grBadge: (g) => '[' + g + ']', rpWkLabel: (w) => 'WK' + Number(String(w).slice(6)), rpMd: (d) => (d ? +d.slice(5, 7) + '/' + +d.slice(8, 10) : '') };
  let html = ''; const box = { insertAdjacentHTML: (p, h) => { html += h; } };
  const M = new Function(...Object.keys(env), adm.slice(a, b) + ';return { FK, fkRender };')(...Object.values(env));
  Object.assign(M.FK, { loaded: true, weeks: ['2026-W46'], rows: [{ week: '2026-W46', wk: 'WK46', from: '2026-11-08', to: '2026-11-14', camp: '인천7', code: '917D', rate: 1, grade: 1 }],
    cases: [{ date: '2026-11-12', camp: '인천7', code: '917D', route: '917D01', doneAt: '2026-11-12 06:58:31', photo: 'https://image11.coupangcdn.com/x.jpg', driver: '홍길동' }, { date: '2026-11-18', camp: '인천7', code: '917D', route: '917D01', doneAt: '2026-11-18 07:00:00', photo: '', driver: '' }] });
  M.fkRender(box);
  ok(/917D<\/b> <span class="fk-cn">의심 1<\/span>/.test(html) && /최근 90일 2건/.test(html) && /href="https:\/\/image11\.coupangcdn\.com\/x\.jpg"/.test(html) && /못 찾음 \(스케줄 확인\)/.test(html) && /홍길동<b>1건/.test(html), '33 탭: 그 주 라우트에 「의심 n」 · 의심 건 목록(사진 · 그날 기사 · 기사별 합계)');
}
