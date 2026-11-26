// (S215) 시험 알림: 기기마다 기록을 남기고 기록 번호(mid)를 같이 보냄 → 폰 도착이 기기별로 찍힘
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
call('adm_createDriver', [tok, { name: '기사W', loginId: 'w@df', driverType: '고정', phone: '010-4000-1099', schCampId: CAMP, baseRoute: '212A' }]);
const W = call('adm_listDrivers', [tok]).rows.find((d) => d.name === '기사W').id;
ev("appendObj_(SH.PPUSH, { driverId: '" + W + "', token: 'tokA" + 'x'.repeat(30) + "', device: '안드로이드 삼성인터넷', model: 'SM-S948N', createdAt: nowText_() }); appendObj_(SH.PPUSH, { driverId: '" + W + "', token: 'tokB" + 'y'.repeat(30) + "', device: 'PC 크롬', createdAt: nowText_() }); 1");
let bodies = [];
const r = call('adm_pushCheck', [tok, W]);
const T = (r.out || r).test || [];
rep(T.length === 2 && T.every((x) => x.code === 200), '1', '두 기기에 보냄 (' + T.length + ')');
const L = call('adm_pushLog', [tok, W]); const rows = (L.out || L).rows || [];
const tr = rows.filter((x) => x.kind === 'test');
rep(tr.length === 2 && tr.some((x) => /삼성인터넷 SM-S948N/.test(x.title)) && tr.some((x) => /PC 크롬/.test(x.title)), '2', '기기별로 시험 기록 2줄 (' + tr.map((x) => x.title).join(' / ') + ')');
const mids = J("readAll_(SH.PLOG).filter(function (o) { return o.kind === 'test'; }).map(function (o) { return o.id; })");
call('api_pushRcv', [mids[0], 'r']);
const L2 = (call('adm_pushLog', [tok, W]).out || call('adm_pushLog', [tok, W])).rows.filter((x) => x.kind === 'test');
rep(L2.filter((x) => x.rcv).length === 1, '3', '폰이 받으면 그 기기 줄에만 폰 도착');
const bad = R.filter((x) => !x[0]).length;
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
