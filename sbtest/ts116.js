// S116 남은 알림 정리: 공지 고친 뒤 [다시 알리기] · 의심 건 한 기사 여러 건 묶음 · 노선을 둘이 나눠 탄 날은 「확인 필요」 · 관리자 홈 「확정 기사가 취소한 품앗이」 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts116.js <runner-allinone 폴더>
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

// 1) 공지 고친 뒤 다시 알리기
let r = call('adm_noticeSave', [tok, { title: '공지 A', body: '처음', important: false, target: '' }]);
const NID = r.notice.id;
ev("appendObj_(SH.SEEN, { kind: SEEN_KIND.NOTICE, driverId: '" + D.B + "', key: '" + NID + "', at: nowText_() }); 1");
let x = pushTo(() => call('adm_noticeSave', [tok, { id: NID, title: '공지 A', body: '오타 고침', important: false, target: '' }]));
const seen1 = J("readAll_(SH.SEEN).filter(function (o) { return o.kind === SEEN_KIND.NOTICE && o.key === '" + NID + "'; }).length");
rep(!x.sent.length && seen1 === 1, '1', '공지 고침(다시 알리기 끔): 본 기록 그대로 · 휴대폰 알림 없음');
x = pushTo(() => call('adm_noticeSave', [tok, { id: NID, title: '공지 A', body: '내용 바뀜', important: false, target: '', renotify: true }]));
const seen2 = J("readAll_(SH.SEEN).filter(function (o) { return o.kind === SEEN_KIND.NOTICE && o.key === '" + NID + "'; }).length");
rep(seen2 === 0 && x.sent.some((s) => s.title === '📢 공지'), '2', '[다시 알리기] 켜고 고침: 본 기록 지움(다시 「새 공지」) · 받는 기사에게 「📢 공지」 휴대폰 알림 (' + x.to + ')');
// 2) 관리자 홈: 확정 기사가 취소한 품앗이
const J1 = call('api_pmSave', [T.P, job]).id;
call('api_pmApply', [T.B, J1, '']);
const app = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + J1 + "'; })[0].id");
call('api_pmDecide', [T.P, J1, app, 'accept']);
call('api_pmCancelApply', [T.B, J1]);
const H = call('adm_home', [tok, true]);
const it = (H.todo || []).find((t) => t.k === 'pmCancel');
rep(it && it.n === 1, '3', '관리자 홈 「지금 처리할 것」에 「⚠️ 확정 기사가 취소한 품앗이」 ' + JSON.stringify(it || null));
// 3) 의심 건: 한 기사 여러 건 → 알림 하나 · 둘이 나눠 탄 노선은 「확인 필요」
ev("fkNotiOn_ = function () { return true; }; 1");
const fs = J("(function () { fkWeekDrivers_ = function () { return { '군포1캠프|212A': [{ id: '" + D.B + "', name: '기사B' }], '군포1캠프|212B': [{ id: '" + D.B + "', name: '기사B' }, { id: '" + D.C + "', name: '기사C' }] }; }; fkNotiOn_ = function () { return true; }; var r = fcSave_({ name: '대표' }, [{ date: '2026-11-20', camp: '군포1캠프', code: '212A', route: '212A', doneAt: '2026-11-20 10:00:00' }, { date: '2026-11-20', camp: '군포1캠프', code: '212A', route: '212A', doneAt: '2026-11-20 11:00:00' }, { date: '2026-11-20', camp: '군포1캠프', code: '212B', route: '212B', doneAt: '2026-11-20 12:00:00' }], 'x.xlsx', ''); return { r: r, al: readAll_(SH.PALERT).filter(function (a) { return a.kind === 'fake'; }).map(function (a) { return a.driverId + '|' + a.text.slice(0, 30); }) }; })()");
rep(fs.al.length === 1 && fs.al[0].indexOf(D.B) === 0 && /2건/.test(fs.al[0]), '4', '한 기사(B) 의심 건 2개 → 알림 하나 「…의심 2건 안내」 ' + JSON.stringify(fs.al));
const amb = fs.r.cases.find((c) => c.code === '212B');
rep(amb && !amb.driverId && /확인 필요/.test(amb.driver), '5', '그날 212B 를 둘(B · C)이 나눠 탐 → 알림 안 보내고 「' + (amb && amb.driver) + '」');
console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
if (R.some((r) => !r[0])) process.exitCode = 1;
