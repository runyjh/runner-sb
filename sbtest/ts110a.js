// 알림 진단 시험 (고치기 전 상태 확인용): 실제 서버 엔진으로 알림을 보내 보고, 누가 알림함/휴대폰 알림을 받는지 기록한다 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts110a.js <runner-allinone 폴더>
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
rep(wToks.length === 2, '#12', '휴대폰 2대(같은 기종 이름)를 쓰는 기사: 등록된 기기 ' + wToks.length + '대 (두 번째 폰을 등록하면 첫 폰이 지워짐 → 첫 폰은 알림 끊김)');
call('api_pmPushSave', [T.W, tk('W', 1), '안드로이드 크롬', 'devW1aaaaaa', 'SM-S936N']); // 첫 폰이 다시 등록 (앱을 열 때마다)
call('api_pmPushSave', [T.W, tk('W', 3), '안드로이드 삼성인터넷', 'devW3cccccc', 'SM-S936N']); // 첫 폰 모델에 삼성인터넷도 → 같은 모델 크롬 등록 정리
const wToks2 = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.W + "'; }).map(function (o) { return o.token.slice(0, 5); })");
rep(wToks2.join() === 'tokW3', '#12b', '같은 모델 폰에 다른 브라우저(삼성인터넷)로 등록하면 그 모델의 크롬 등록은 지움 → 남은 기기: ' + wToks2.join(',') + ' (같은 기종 2대는 모델이 같아 둘 다 지워짐 · 드묾)');

const who = (list) => [...new Set(list.map((x) => ID2K[J("readAll_(SH.PPUSH).filter(function (o) { return o.token === '" + x.token + "'; }).map(function (o) { return o.driverId; })")[0]] || x.token.slice(3, 4)))].sort().join('');
const pushTo = (fn) => { SENT.length = 0; const r = fn(); return { r, sent: SENT.slice(), to: [...new Set(SENT.map((x) => x.token.slice(3, 4)))].sort().join('') }; };
const alerts = (k) => J("readAll_(SH.PALERT).filter(function (o) { return o.driverId === '" + D[k] + "'; }).map(function (o) { return o.kind; })");
const job = { kind: '주간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 900, pay: '', okLow: true };
const form = call('api_pmForm', [T.P]);
job.pay = (form.pays || form.payList || ['계좌이체'])[0];
// 1) 공개 일감 올리기 → 새 일감 알림
let x = pushTo(() => call('api_pmSave', [T.P, job]));
const J1 = x.r.id;
rep(!!J1, '#0', '일감 올리기: ' + (x.r.ok ? 'ok' : x.r.msg) + ' · 휴대폰 알림 받은 기사 ' + x.to);
rep(x.to.indexOf('Q') < 0, '#26', '새 일감 알림: 퇴사 처리한 기사(Q) ' + (x.to.indexOf('Q') < 0 ? '안 받음' : '받음'));
rep(x.to.indexOf('Z') < 0, '#26z', '새 일감 알림: 정지 기사(Z) ' + (x.to.indexOf('Z') < 0 ? '안 받음' : '받음'));
// 2) 지원 · 확정
x = pushTo(() => call('api_pmApply', [T.B, J1, '']));
rep(x.to === 'P', '#0b', 'B 지원 → 올린 기사 P 에게 알림 (' + x.to + ')');
call('api_pmApply', [T.C, J1, '']);
const apps = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + J1 + "'; }).map(function (a) { return { id: a.id, d: a.driverId }; })");
const appOf = (k) => apps.find((a) => a.d === D[k]).id;
x = pushTo(() => call('api_pmDecide', [T.P, J1, appOf('B'), 'accept']));
rep(x.sent.some((s) => s.kind === 'accept' && s.token.startsWith('tokB')) && x.sent.some((s) => s.kind === 'lost' && s.token.startsWith('tokC')), '#0c', 'B 확정 → B 「확정」 · C 「미선정」');
// 3) 확정 기사를 C 로 바꿈 (B 는 이미 확정 받았던 사람)
x = pushTo(() => call('api_pmDecide', [T.P, J1, appOf('C'), 'accept']));
const bKind = x.sent.filter((s) => s.token.startsWith('tokB')).map((s) => s.kind).join();
rep(bKind === 'unaccept', '#32', '확정 기사를 B→C 로 바꿈: 먼저 확정됐던 B 가 받은 알림 = 「' + bKind + '」 (「미선정」이면 확정이 풀렸다는 뜻이 약함)');
// 4) 모집 마감 → 다시 모집
call('api_pmDecide', [T.P, J1, appOf('C'), 'back']);
call('api_pmClose', [T.P, J1, 'close']);
x = pushTo(() => call('api_pmClose', [T.P, J1, 'reopen']));
rep(x.sent.some((s) => s.kind === 'newjob'), '#31', '마감했던 일감을 다시 모집: 다른 기사에게 새 일감 알림 ' + (x.sent.some((s) => s.kind === 'newjob') ? '감' : '안 감 (아무도 모름)'));
// 5) 사무실에서 모집 일감 올림
x = pushTo(() => call('adm_pmCreate', [tok, Object.assign({}, job, { posterId: D.P, mode: 'open', date: '2026-11-25', route: '212B' })]));
const J2 = x.r.id;
rep(x.sent.some((s) => s.kind === 'newjob'), '#43', '사무실 모집 일감: 기사들에게 새 일감 알림 ' + (x.sent.some((s) => s.kind === 'newjob') ? '감' : '안 감') + ' · 받은 사람 ' + (x.to || '없음'));
x = pushTo(() => call('api_pmApply', [T.B, J2, '']));
const pAlert = J("readAll_(SH.PALERT).filter(function (o) { return o.driverId === '" + D.P + "' && o.jobId === '" + J2 + "'; }).map(function (o) { return o.text; })").pop() || '';
rep(/기사B/.test(pAlert), '#67', '사무실 모집 일감에 B 가 지원해 바로 확정: 맡긴 기사 P 가 받은 글 「' + pAlert + '」 (누가 맡았는지 ' + (/기사B/.test(pAlert) ? '나옴' : '안 나옴 · 「사무실에서 처리」로 보임') + ')');
// 6) 로그아웃 · 로그인 만료 → 기기
call('api_logout', [T.C]);
J('pmPushCleanup_()');
x = pushTo(() => J("pmPushSend_([{ driverId: '" + D.C + "', title: 't', text: 'x', jobId: '', kind: 'seen' }])"));
rep(!x.sent.length, '#20', '로그아웃한 기사(C)에게 휴대폰 알림 ' + (x.sent.length ? '감 (다른 사람이 그 폰을 쓰면 남의 알림이 보임)' : '안 감'));
// 7) 정산서 마감 · 피크 물량 같은 전체 알림 · 처음 가는 노선
x = pushTo(() => J("pmPushSend_(readAll_(SH.DRIVERS).filter(function (o) { return o.id && o.status === ST.ACTIVE; }).map(function (o) { return { driverId: String(o.id), title: '11월 정산서가 마감되었습니다', text: 'x', jobId: '', kind: 'slip' }; }))"));
rep(x.to.indexOf('Q') >= 0 && x.to.indexOf('Z') < 0, '#26b', '정산서 마감 전체 알림: 퇴사 기사(Q) ' + (x.to.indexOf('Q') >= 0 ? '받음 (마지막 정산서를 봐야 하니 맞음)' : '안 받음') + ' · 정지(Z) ' + (x.to.indexOf('Z') < 0 ? '안 받음' : '받음'));
// 8) 확인 기록: 퇴사 기사 · 정지 기사도 「안 본 사람」에 드는지
call('adm_noticeSave', [tok, { title: '공지1', body: '내용', target: '', need: true }]);
const UN = J("Object.keys(seenUnseen_('drv')).map(function (id) { return id; })").map((id) => ID2K[id]).sort().join('');
rep(UN.indexOf('Q') < 0, '#27', '공지 안 본 사람 목록에 퇴사 기사(Q) ' + (UN.indexOf('Q') < 0 ? '없음' : '있음') + ' (' + UN + ') → 자동 다시 알림 · 홈 숫자에 섞임');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-25', value: '출근', old: '' }]]);
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-25', value: '휴무', old: '출근' }]]);
SENT.length = 0;
const AR = J('seenAutoRemind_()');
const arTo = [...new Set(SENT.map((s) => s.token.slice(3, 4)))].sort().join('');
rep(arTo === '', '#27b', '토요일에 바꾼 다음 주 수요일 스케줄: 자동 다시 알림 ' + (arTo ? '감 (' + arTo + ')' : '아직 안 감 (그 주 일요일부터 · 규칙대로)'));
// 9) 빈칸에 새로 넣은 스케줄 → 변경 기록
const row = D.B;
call('adm_schSave', [tok, [{ row, date: '2026-11-23', value: '군포1 212B', old: '' }]]);
let sch = J("readAll_(SH.SEEN).filter(function (o) { return o.kind === SEEN_KIND.SCH && o.driverId === '" + row + "' && o.key === '2026-11-23'; }).length");
rep(sch > 0, '#56', '빈칸(쉬는 날로 알던 날)에 새 근무를 넣음: 기사에게 알릴 변경 ' + (sch ? '기록됨' : '안 잡힘 (기사는 모르고 안 나올 수 있음)'));
call('adm_schSave', [tok, [{ row, date: '2026-11-24', value: '휴무', old: '' }]]);
call('adm_schSave', [tok, [{ row, date: '2026-11-24', value: '군포1 212B', old: '휴무' }]]);
sch = J("readAll_(SH.SEEN).filter(function (o) { return o.kind === SEEN_KIND.SCH && o.driverId === '" + row + "' && o.key === '2026-11-24'; }).length");
rep(sch > 0, '#56b', '휴무 → 근무로 바꿈: 변경 ' + (sch ? '기록됨 (정상)' : '안 잡힘'));
// 10) 메뉴 끈 상태에서 전체 알림 (품앗이 메뉴를 끄면 피크 물량 알림도 막히는지)
ev("var c = appMenuCfg_(); 1");
const cfgFn = J("Object.keys(this).length ? 1 : 1");
const peakMenu = J("alertMenuOf_({ kind: 'peak', jobId: '' })");
rep(peakMenu !== 'pm', '#14', '피크데이 예상 물량 알림은 어느 메뉴 알림으로 보나: 「' + (peakMenu || '없음') + '」 → 품앗이 메뉴를 끈 기사는 피크 물량 휴대폰 알림을 ' + (peakMenu === 'pm' ? '못 받음' : '받음'));
// 11) 없는 기기 응답 → 지움 · 남은 기기
DEAD.add(tk('P', 1));
x = pushTo(() => J("pmPushSend_([{ driverId: '" + D.P + "', title: 't', text: 'x', jobId: '', kind: 'seen' }])"));
const pLeft = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.P + "'; }).length");
rep(pLeft === 0, '#0d', '없어진 기기는 보낼 때 지움 (남은 ' + pLeft + ')');
// 12) 같은 알림이 같은 기사에게 두 번 (수동 다시 알림 + 자동)
SENT.length = 0;
ev("PropertiesService.getScriptProperties().deleteProperty(SEEN_RULE.PROP); _props = null; 1");
at('2026-11-22T11:00:00');
J("seenRemindItems_({ name: '대표' }, 'menu', '', 'sched', '')");
const man = SENT.filter((s) => s.token.startsWith('tokB')).length;
SENT.length = 0;
at('2026-11-22T18:05:00');
J('seenAutoRemind_()');
const auto = SENT.filter((s) => s.token.startsWith('tokB')).length;
rep(man === 1 && !auto, '#46', '사무실이 낮에 스케줄 [다시 알림] → 같은 날 18:05 자동 다시 알림: B 가 받은 수 낮 ' + man + ' · 저녁 ' + auto + (man && auto ? ' (같은 내용 하루 두 번)' : ''));
// 13) 알림 하나에 기기 여러 대 · 받는 시각 (밤)
at('2026-11-23T02:30:00');
x = pushTo(() => call('api_pmSave', [T.B, Object.assign({}, job, { date: '2026-11-26', route: '708C' })]));
rep(!x.sent.length, '#22', '새벽 2:30 에 올린 일감: 휴대폰 알림 ' + x.sent.length + '건 바로 나감 (조용한 시간 없음)');
// 14) 07시: 밤사이 모아 둔 새 일감 알림
at('2026-11-23T07:00:00');
x = pushTo(() => J('pushQuietFlush()'));
rep(x.sent.length > 0 && x.sent.every((s) => s.kind === 'newjob'), '#22b', '07시 조용한 시간 끝: 모아 둔 새 일감 알림 ' + x.sent.length + '건 보냄 (' + x.to + ')');
x = pushTo(() => J('pushQuietFlush()'));
rep(!x.sent.length, '#22c', '두 번째 07시 작업은 보낼 것 없음');
// 15) 알림 누름 → 그 일감 알림 읽음
const un0 = J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D.C + "' && a.jobId === '" + J1 + "' && !a.readAt; }).length");
const TC2 = ev("createSession_('" + D.C + "', true).token");
call('api_pmAlertsRead', [TC2, ['job:' + J1]]);
const un1 = J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D.C + "' && a.jobId === '" + J1 + "' && !a.readAt; }).length");
rep(un0 > 0 && un1 === 0, '#49', '휴대폰 알림을 눌러 들어온 일감의 알림 읽음: ' + un0 + ' → ' + un1);
// 16) 폰 등록이 서버에서 지워졌는지 알림 확인 때 알려 줌
const pg = call('api_pmAlerts', [TC2, '', tk('C', 1)]);
rep(pg.ptGone === true, '#13', '서버에서 지운 폰 등록: 알림 확인 때 「다시 등록」 신호 ' + (pg.ptGone ? '감' : '안 감'));
console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
