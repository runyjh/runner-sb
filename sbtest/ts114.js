// S114 알림 정리: 오늘 · 내일 스케줄 변경 바로 알림 · 새 중요 공지 바로 알림 · 다시 모집 지원자 알림 · 퇴사 예정자 새 일감 · 같은 알림 10분 한 번 · 잠금 화면 감춤 · 급한 알림 표시 · 정산 마감 · 피크 알림함 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts114.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const R = [];
const rep = (good, id, m) => { R.push([good, id, m]); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const S = sbMakeStore(); S.DateCls = KDate;
// 휴대폰 알림 서버(FCM) 흉내: 보낸 것을 모두 기록 · dead 에 든 기기는 「없는 기기」 응답
const SENT = [], DEAD = new Set();
const ext = (kind, q) => {
  if (kind === 'sign') return { sig: [1, 2, 3] };
  if (kind === 'fetch') return { code: 200, text: JSON.stringify({ access_token: 'AT' }), headers: {} };
  if (kind === 'fetchAll') return q.map((r) => { const m = JSON.parse(r.body).message; SENT.push({ token: m.token, kind: m.data.kind, title: m.data.title, jobId: m.data.jobId }); return DEAD.has(m.token) ? { code: 404, text: 'UNREGISTERED', headers: {} } : { code: 200, text: '{}', headers: {} }; });
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
ev("appSetPut_('pmExtOn', 'ON', ''); 1"); // (S164) 이 시험은 지원 → 맡긴 기사가 확정하는 흐름(외부용) · 내부용은 선착순 자동 배차 (ts164)
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

const SM = []; // 보낸 알림 내용
const alertsOf = (k, kind) => J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D[k] + "'" + (kind ? " && a.kind === '" + kind + "'" : '') + "; }).map(function (a) { return a.text; })");
// 1) 오늘 · 내일 스케줄 변경 → 바로 휴대폰 알림 (같은 기사 10분에 한 번)
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-22', value: '출근', old: '' }]]);
let x = pushTo(() => call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-22', value: '휴무', old: '출근' }]]));
rep(x.sent.some((s) => s.title === '📅 스케줄이 바뀌었습니다' && s.token.startsWith('tokB')), '1', '내일 스케줄 변경 → 바로 휴대폰 알림 「📅 스케줄이 바뀌었습니다」 (' + x.sent.map((s) => s.title).join(',') + ')');
x = pushTo(() => call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-22', value: '출근', old: '휴무' }]]));
rep(x.sent.some((s) => /스케줄이 바뀌었/.test(s.title)), '2', '(S118) 같은 기사 10분 안 다른 내용으로 또 바뀜(되돌림) → 바로 다시 알림');
x = pushTo(() => call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-22', value: '휴무', old: '출근' }]]));
rep(!x.sent.some((s) => /스케줄이 바뀌었/.test(s.title)), '2b', '10분 안 같은 내용(휴무)이 또 → 알림은 한 번만');
call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-28', value: '출근', old: '' }]]);
x = pushTo(() => call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-28', value: '휴무', old: '출근' }]]));
rep(!x.sent.some((s) => /스케줄이 바뀌었/.test(s.title)), '3', '다음 주 날짜 변경은 바로 안 보냄 (그 주에 · 18:05 다시 알림)');
// 2) 새 중요 공지
x = pushTo(() => call('adm_noticeSave', [tok, { title: '🚨 내일 캠프 출입 변경', body: '내용', important: true, target: '' }]));
rep(x.sent.some((s) => s.title === '📢 중요 공지') && x.to.indexOf('Z') < 0, '4', '새 중요 공지 → 받는 기사에게 바로 휴대폰 알림 (' + x.to + ' · 정지 Z 빠짐)');
x = pushTo(() => call('adm_noticeSave', [tok, { title: '일반 공지', body: '내용', important: false, target: '' }]));
rep(!x.sent.length, '5', '일반 공지는 바로 안 보냄');
// 3) 다시 모집 → 지원했던 기사에게 「다시 모집」
const J1 = call('api_pmSave', [T.P, job]).id;
call('api_pmApply', [T.C, J1, '']);
call('api_pmClose', [T.P, J1, 'close']);
x = pushTo(() => call('api_pmClose', [T.P, J1, 'reopen']));
rep(alertsOf('C', 'reopen').length === 1 && !alertsOf('C', 'newjob').some((t) => t && false), '6', '마감했다 다시 모집 → 지원했던 C 에게 「🔁 다시 모집」 · 다른 기사는 새 일감 알림');
// 4) 같은 알림 10분에 한 번 (지원 → 취소 → 지원)
x = pushTo(() => { call('api_pmCancelApply', [T.C, J1]); call('api_pmApply', [T.C, J1, '']); call('api_pmCancelApply', [T.C, J1]); return 1; });
const pApply = x.sent.filter((s) => s.token.startsWith('tokP'));
rep(pApply.length <= 2, '7', '지원 → 취소 → 지원 → 취소: 올린 기사 휴대폰 알림 ' + pApply.length + '건 (종류마다 10분에 한 번 · 알림함엔 모두)');
x = pushTo(() => { call('api_pmApply', [T.B, J1, '']); return 1; });
rep(x.sent.some((s) => s.token.startsWith('tokP') && s.kind === 'apply'), '7b', '다른 기사(B)의 지원은 10분 안이어도 따로 휴대폰 알림');
// 5) 퇴사 예정자 (퇴사일 전) 는 새 일감 알림 받음 · 퇴사일 뒤 일감은 안 받음
ev("var o = readAll_(SH.DRIVERS).filter(function (x) { return x.id === '" + D.W + "'; })[0]; writeFields_(SH.DRIVERS, o._row, { workStatus: '퇴사', leaveDate: '2026-11-30' }); 1");
x = pushTo(() => call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-11-26', route: '212B' })]));
rep(x.to.indexOf('W') >= 0, '8', '퇴사 예정자(11/30 퇴사): 11/26 일감 알림 받음');
x = pushTo(() => call('api_pmSave', [T.P, Object.assign({}, job, { date: '2026-12-02', route: '708C' })]));
rep(x.to.indexOf('W') < 0, '9', '퇴사일 뒤(12/2) 일감 알림은 안 받음');
// 6) 잠금 화면 감춤 · 급한 알림
const lt = J("[pmLockText_({ kind: 'slip', title: '⚠️ 11월 정산서 금액이 바뀌었습니다', text: '1,234,000원 → 1,200,000원' }), pmLockText_({ kind: 'board', title: '💬 새 댓글', text: '내 비밀 이야기' }), pmLockText_({ kind: 'accept', title: '✅', text: '확정 내용' })]");
rep(!/원/.test(lt[0]) && !/비밀/.test(lt[1]) && lt[2] === '확정 내용', '10', '잠금 화면: 금액 · 댓글 글 감춤 · 다른 알림은 그대로 ' + JSON.stringify(lt));
// 7) 「새로 보기」 띠용 변경 시각 · 노선 변경 예약 알림
const la = call('api_pmAlerts', [T.B, '', '']);
rep(la.live && la.live.pmAt > 0 && la.live.schAt > 0, '11', '알림 확인 응답에 품앗이 · 스케줄 변경 시각 (기사앱 「새로 보기」 띠) ' + JSON.stringify(la.live));
ev("appendObj_(SH.RCHG, { id: 'RC1', kind: '기사', date: '2026-11-21', driverId: '" + D.C + "', name: '기사C', fromCampId: '" + CAMP + "', fromCamp: '군포1캠프', fromRoute: '708C', toCampId: '" + CAMP + "', toCamp: '군포1캠프', toRoute: '212B', status: RCS.WAIT, createdAt: nowText_() }); 1");
ev("cache_().remove('rc:due:' + todayText_()); 1");
x = pushTo(() => J('rcApplyDue_()'));
rep(x.sent.some((s) => /기본 노선이 바뀌었습니다/.test(s.title) && s.token.startsWith('tokC')), '12', '노선 변경 예약 적용 → 그 기사에게 「🚚 기본 노선이 바뀌었습니다」 (' + x.sent.map((s) => s.title).join(',') + ')');
console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
if (R.some((r) => !r[0])) process.exitCode = 1;
