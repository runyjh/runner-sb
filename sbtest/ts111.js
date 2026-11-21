// S111 휴대폰 알림 기록: 보냄/안 보낸 이유 → 알림 서버 결과 → 폰 도착 → 누름 · 관리자 기사별 기록 · 7일 정리 · 서비스 워커 신호 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts111.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const R = [];
const rep = (good, id, m) => { R.push([good, id, m]); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const S = sbMakeStore(); S.DateCls = KDate;
// 휴대폰 알림 서버(FCM) 흉내: 보낸 것을 모두 기록 · dead 에 든 기기는 「없는 기기」 응답
const SENT = [], DEAD = new Set(), SENTMID = [];
const ext = (kind, q) => {
  if (kind === 'sign') return { sig: [1, 2, 3] };
  if (kind === 'fetch') return { code: 200, text: JSON.stringify({ access_token: 'AT' }), headers: {} };
  if (kind === 'fetchAll') return q.map((r) => { const m = JSON.parse(r.body).message; SENT.push({ token: m.token, kind: m.data.kind, title: m.data.title, jobId: m.data.jobId }); SENTMID.push(m.data.mid); return DEAD.has(m.token) ? { code: 404, text: 'UNREGISTERED', headers: {} } : { code: 200, text: '{}', headers: {} }; });
  return { code: 0, err: 'x', text: '' };
};
const G = sbMakeGas(S, { Date: KDate, ext });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: '1', PUSH_DEDUP_S101: 'x', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=',
  FCM_SA: JSON.stringify({ client_email: 'x@y', private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----', project_id: 'p' }) });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const at = (t) => KDate.__setClock(() => Date.parse(t + '+09:00'));
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
at('2026-11-21T10:00:00');
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '708C'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
// 기사: P(올림) B C(지원) Q(퇴사 처리했지만 앱 상태는 승인) Z(정지) W(휴대폰 2대 · 둘 다 안드로이드 크롬)
const NM = { P: '기사P', B: '기사B', C: '기사C', Q: '기사Q', Z: '기사Z', W: '기사W' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + '@df', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: ['212A', '212B', '708C', '212A', '212B', '708C'][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const ID2K = {}; Object.keys(D).forEach((k) => { ID2K[D[k]] = k; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '1234567890' }); }); 1");
ev("var o = readAll_(SH.DRIVERS).filter(function (x) { return x.id === '" + D.Q + "'; })[0]; writeFields_(SH.DRIVERS, o._row, { workStatus: '퇴사', leaveDate: '2026-11-15' }); " +
  "var z = readAll_(SH.DRIVERS).filter(function (x) { return x.id === '" + D.Z + "'; })[0]; writeFields_(SH.DRIVERS, z._row, { status: ST.STOPPED }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
// 기기 등록 (Z 는 정지 전 등록 · 시트에 직접)
const tk = (k, n) => 'tok' + k + n + '_' + 'x'.repeat(24);
['P', 'B', 'C', 'Q'].forEach((k) => call('api_pmPushSave', [T[k], tk(k, 1), '안드로이드 크롬']));
ev("appendObj_(SH.PPUSH, { driverId: '" + D.Z + "', token: '" + tk('Z', 1) + "', device: '안드로이드 크롬', createdAt: nowText_() }); 1");
const wa = call('api_pmPushSave', [T.W, tk('W', 1), '안드로이드 크롬', 'devW1aaaaaa', 'SM-S936N']), wb = call('api_pmPushSave', [T.W, tk('W', 2), '안드로이드 크롬', 'devW2bbbbbb', 'SM-S936N']);
const wToks = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.W + "'; }).map(function (o) { return o.token; })");
call('api_pmPushSave', [T.W, tk('W', 1), '안드로이드 크롬', 'devW1aaaaaa', 'SM-S936N']); // 첫 폰이 다시 등록 (앱을 열 때마다)
call('api_pmPushSave', [T.W, tk('W', 3), '안드로이드 삼성인터넷', 'devW3cccccc', 'SM-S936N']); // 첫 폰 모델에 삼성인터넷도 → 같은 모델 크롬 등록 정리
const wToks2 = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.W + "'; }).map(function (o) { return o.token.slice(0, 5); })");

const who = (list) => [...new Set(list.map((x) => ID2K[J("readAll_(SH.PPUSH).filter(function (o) { return o.token === '" + x.token + "'; }).map(function (o) { return o.driverId; })")[0]] || x.token.slice(3, 4)))].sort().join('');
const pushTo = (fn) => { SENT.length = 0; const r = fn(); return { r, sent: SENT.slice(), to: [...new Set(SENT.map((x) => x.token.slice(3, 4)))].sort().join('') }; };
const alerts = (k) => J("readAll_(SH.PALERT).filter(function (o) { return o.driverId === '" + D[k] + "'; }).map(function (o) { return o.kind; })");
const job = { kind: '주간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 900, pay: '', okLow: true };
const form = call('api_pmForm', [T.P]);
job.pay = (form.pays || form.payList || ['계좌이체'])[0];

const LG = () => J("readAll_(SH.PLOG).map(function (o) { return { id: o.id, d: o.driverId, kind: o.kind, res: o.res, why: o.why, rcv: o.rcv, clk: o.clk, devs: o.devs }; })");
const by = (k) => LG().filter((o) => o.d === D[k]);
// 1) 새 일감: 보낸 사람 · 안 보낸 이유
let x = pushTo(() => call('api_pmSave', [T.P, job]));
const J1 = x.r.id;
const L1 = LG().filter((o) => o.kind === 'newjob');
rep(L1.length >= 3 && L1.every((o) => o.res && (o.why || /^성공/.test(o.res))), '1', '새 일감 알림 기록 ' + L1.length + '줄 · ' + JSON.stringify(L1.map((o) => ID2K[o.d] + ':' + (o.why || o.res))));
call('api_pmPushSave', [T.W, tk('W', 5), '아이폰 사파리', 'devW5eeeeee', '']);
J("pmPushSend_([{ driverId: '" + D.W + "', title: 't2', text: 'x', jobId: 'J9', kind: 'apply' }])");
rep(by('W').some((o) => o.kind === 'apply' && /^성공 2대/.test(o.res) && o.devs == 2), '2', '기기 2대 기사(안드로이드 + 아이폰): 「성공 2대」 · ' + JSON.stringify(by('W').map((o) => o.res)));
// 정지 기사 · 기기 없는 기사
ev("appendObj_(SH.PALERT, { id: 'Nz', driverId: '" + D.Z + "', kind: 'board', text: 'x · y', createdAt: nowText_() }); 1");
J("pmPushSend_([{ driverId: '" + D.Z + "', title: '💬 새 댓글', text: 'x', jobId: 'BD-1', kind: 'board' }])");
rep(by('Z').some((o) => o.why === '앱 사용 정지'), '3', '정지 기사에게 보내려던 알림: 「안 보냄 · 앱 사용 정지」로 기록');
ev("var r = readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.Q + "'; }).map(function (o) { return o._row; }).sort(function (a, b) { return b - a; }); delRows_(sheet_(SH.PPUSH), r); cache_().remove('pmt:" + D.Q + "'); 1");
J("pmPushSend_([{ driverId: '" + D.Q + "', title: 't', text: 'x', jobId: 'SL-2026-11', kind: 'slip' }])");
rep(by('Q').some((o) => o.why === '등록된 기기 없음'), '4', '기기가 없는 기사: 「안 보냄 · 등록된 기기 없음」');
// 메뉴 꺼짐
ev("var s = readAll_(SH.APPSET || 'app_settings'); 1");
J("pmPushSend_([{ driverId: '" + D.B + "', title: 'S', text: 'x', jobId: 'SL-2026-11', kind: 'slip' }].map(function (a) { return a; }))");
// 조용한 시간
at('2026-11-22T03:00:00');
call('api_pmSave', [T.B, Object.assign({}, job, { date: '2026-11-27', route: '708C' })]);
rep(LG().some((o) => /조용한 시간/.test(o.why)), '5', '새벽 3시 새 일감: 「안 보냄 · 조용한 시간 · 07시에 보냄」');
at('2026-11-22T10:00:00');
// 2) 폰 도착 · 누름 (서비스 워커 신호)
const mid = by('C').filter((o) => !o.why)[0].id;
let r = call('api_pushRcv', [mid, 'r']);
rep(r.ok && by('C').find((o) => o.id === mid).rcv, '6', '폰 도착 신호 → 「폰 도착」 시각 (' + by('C').find((o) => o.id === mid).rcv + ')');
call('api_pushRcv', [mid, 'c']);
rep(!!by('C').find((o) => o.id === mid).clk, '7', '누름 신호 → 「누름」 시각');
rep(call('api_pushRcv', ['Lnope123', 'r']).ok === false && call('api_pushRcv', ["x'; drop", 'r']).ok === false, '8', '없는 번호 · 이상한 값은 무시');
// 3) 관리자 기사별 기록
r = call('adm_pushLog', [tok, D.C]);
rep(r.ok && r.rows.length >= 1 && r.rows.some((y) => y.clk) && r.devs.length === 1, '9', '관리자 기사별 휴대폰 알림 기록: ' + r.rows.length + '건 · 기기 ' + r.devs.length + '대 · 최근 「' + r.rows[0].title + '」');
// 4) 7일 정리
at('2026-11-30T04:00:00');
const n = J('pmLogCleanup_()');
rep(n > 0 && LG().length === 0, '10', '7일 지난 기록 정리: ' + n + '줄 지움');
// 5) 시험 알림(kind test)은 기록 안 함 · 바로 보냄
x = pushTo(() => J("pmPushSend_([{ driverId: '" + D.B + "', title: 't', text: 'x', jobId: '', kind: 'test' }])"));
rep(x.sent.length === 1 && LG().length === 0, '11', '시험 알림은 기록에 안 남김');
// 6) 보낸 알림에 기록 번호(mid)가 실림
x = pushTo(() => J("pmPushSend_([{ driverId: '" + D.B + "', title: 't', text: 'x', jobId: 'J1', kind: 'apply' }])"));
rep(x.sent.length === 1 && /^L/.test(SENTMID[SENTMID.length - 1] || ''), '12', '휴대폰 알림 내용에 기록 번호 mid (' + SENTMID[SENTMID.length - 1] + ')');
console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
if (R.some((r) => !r[0])) process.exitCode = 1;
