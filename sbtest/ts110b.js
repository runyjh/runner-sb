// 알림 진단 시험 B (수파베이스 서버 실행기 · 동시에 두 명): 저장이 겹쳐 다시 실행될 때 휴대폰 알림: 실제 서버 엔진으로 알림을 보내 보고, 누가 알림함/휴대폰 알림을 받는지 기록한다 (TZ=UTC)
//  「문제」 줄 = 지금 동작이 바라는 동작과 다름 · 「정상」 줄 = 바라는 대로
//  사용: node sbtest/ts110b.js <runner-allinone 폴더>
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
const wa = call('api_pmPushSave', [T.W, tk('W', 1), '안드로이드 크롬']), wb = call('api_pmPushSave', [T.W, tk('W', 2), '안드로이드 크롬']);
const wToks = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.W + "'; }).map(function (o) { return o.token; })");
call('api_pmPushSave', [T.W, tk('W', 1), '안드로이드 크롬']); // 첫 폰이 다시 등록 (앱을 열 때마다)
const wToks2 = J("readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.W + "'; }).map(function (o) { return o.token.slice(0, 5); })");

const who = (list) => [...new Set(list.map((x) => ID2K[J("readAll_(SH.PPUSH).filter(function (o) { return o.token === '" + x.token + "'; }).map(function (o) { return o.driverId; })")[0]] || x.token.slice(3, 4)))].sort().join('');
const pushTo = (fn) => { SENT.length = 0; const r = fn(); return { r, sent: SENT.slice(), to: [...new Set(SENT.map((x) => x.token.slice(3, 4)))].sort().join('') }; };
const alerts = (k) => J("readAll_(SH.PALERT).filter(function (o) { return o.driverId === '" + D[k] + "'; }).map(function (o) { return o.kind; })");
const job = { kind: '주간', date: '2026-11-24', time: '07:00', area: '군포', campId: CAMP, route: '212A', qty: '250', price: 900, pay: '', okLow: true };
const form = call('api_pmForm', [T.P]);
job.pay = (form.pays || form.payList || ['계좌이체'])[0];

const { makeFakeDb } = require('./fake-db.js'), { sbMakeServer } = require('./server-core.js');
// 사무실 모집 일감 (먼저 지원한 기사로 바로 확정)
const J2 = call('adm_pmCreate', [tok, Object.assign({}, job, { posterId: D.P, mode: 'open', date: '2026-11-25', route: '212B' })]).id;
S.takeDirty && S.takeDirty();
(async () => {
  const db = makeFakeDb({ lag: 15 }); db.seed(S);
  const OUT = [], DEADX = new Set();
  const ext2 = async (kind, q) => {
    if (kind === 'sign') return { sig: [1, 2, 3] };
    if (kind === 'fetch') return { code: 200, text: JSON.stringify({ access_token: 'AT' }), headers: {} };
    if (kind === 'fetchAll') return q.map((r) => { const m = JSON.parse(r.body).message; OUT.push({ to: m.token.slice(3, 4), kind: m.data.kind, title: m.data.title }); return DEADX.has(m.token.slice(0, 5)) ? { code: 404, text: 'UNREGISTERED', headers: {} } : { code: 200, text: '{}', headers: {} }; });
    return { code: 0, err: 'x', text: '' };
  };
  const mk = () => sbMakeServer({ engine: F, gasNames: GAS_NAMES, db, storage: db.storage, secrets: { PEPPER: S.props.PEPPER, ENC_KEY: S.props.ENC_KEY, MAC_KEY: S.props.MAC_KEY }, Date: KDate, ext: ext2 });
  const A1 = mk(), A2 = mk();
  await A1.call('api_pmList', [T.B, {}]); await A2.call('api_pmList', [T.C, {}]); // 두 서버 모두 자료를 받아 둔 상태
  const [rb, rc] = await Promise.all([A1.call('api_pmApply', [T.B, J2, '']), A2.call('api_pmApply', [T.C, J2, ''])]);
  const won = [rb.out, rc.out].map((o, i) => (o && o.ok ? 'BC'[i] : '')).join('');
  const conf = OUT.filter((o) => o.kind === 'accept').map((o) => o.to).sort().join('');
  rep(won.length === 1, '#66a', '두 기사가 동시에 사무실 일감 지원: 확정된 기사 ' + won + ' · 앱 응답 B=' + (rb.out.ok ? '확정' : rb.out.msg) + ' / C=' + (rc.out.ok ? '확정' : rc.out.msg));
  rep(conf === won, '#66', '「✅ 배차 확정」 휴대폰 알림을 받은 기사: ' + conf + ' (실제 확정은 ' + won + (conf === won ? ')' : ' → 확정 안 된 기사도 「확정」 알림을 받음)'));
  const jobNow = (await A1.call('', ["JSON.stringify(readAll_(SH.PJOB).filter(function (j) { return j.id === '" + J2 + "'; }).map(function (j) { return j.accepted; }))"], 'eval')).out;
  console.log('   실제 저장: 확정 기사 ' + jobNow + ' · 보낸 알림 ' + JSON.stringify(OUT.map((o) => o.to + ':' + o.kind)));
  const lo = JSON.parse((await A1.call('', ["JSON.stringify(readAll_(SH.PPUSH).filter(function (o) { return o.lastOk; }).map(function (o) { return o.token.slice(3, 4); }))"], 'eval')).out);
  rep(lo.indexOf('B') >= 0, '#66b', '저장 뒤 보낸 결과 정리: 「마지막 전송」 남은 기기 ' + lo.join(','));
  // 없어진 기기 응답 → 저장 뒤 정리에서 지움
  OUT.length = 0; DEADX.add('tokC1');
  await A1.call('', ["pmPushSend_([{ driverId: '" + D.C + "', title: 't', text: 'x', jobId: '', kind: 'board' }]); 1"], 'eval');
  const left = JSON.parse((await A2.call('', ["JSON.stringify(readAll_(SH.PPUSH).filter(function (o) { return o.driverId === '" + D.C + "'; }).length)"], 'eval')).out);
  rep(OUT.length === 1 && left === 0, '#66c', '없어진 기기: 보낸 뒤 정리에서 지움 (보냄 ' + OUT.length + ' · 남은 C 기기 ' + left + ')');
  console.log('\n요약: 문제 ' + R.filter((r) => !r[0]).length + ' · 정상 ' + R.filter((r) => r[0]).length);
})();
