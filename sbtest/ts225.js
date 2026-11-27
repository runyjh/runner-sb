// (S225) 매일 자동 점검 보고를 올인원 홈에서 보여 줌 (스크립트 속성 CHECK_REPORTS)
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
const setP = (v) => ev("PropertiesService.getScriptProperties().setProperty('CHECK_REPORTS', " + JSON.stringify(v) + "); 1");
let d = call('adm_home', [tok, true]); d = d.out || d;
rep(d.ok && d.chk === null, '1', '보고가 없으면 홈 요약은 비어 있음');
setP(JSON.stringify([
  { d: '2026-11-27', sum: '어제 것', up: ['a'], wait: [], left: [], done: 10, total: 180 },
  { d: '2026-11-28', sum: '품앗이 · 알림을 봄', urgent: '', up: ['S230: 가', 'S231: 나'], wait: ['단가 표시'], left: ['중복 알림', '줄 어긋남', '오타'], miss: [], done: 46, total: 180, nums: '서버 오류 0' },
  { d: '엉뚱한 날짜', sum: 'x' }, null
]));
d = call('adm_home', [tok, true]); d = d.out || d;
rep(d.chk && d.chk.d === '2026-11-28' && d.chk.up === 2 && d.chk.wait === 1 && d.chk.left === 3 && d.chk.done === 46 && d.chk.total === 180, '2', '가장 최근 날짜의 요약 (올린 것 2 · 대기 1 · 남은 것 3 · 진행 46/180) ' + JSON.stringify(d.chk));
let L = call('adm_checkReports', [tok]); L = L.out || L;
rep(L.ok && L.rows.length === 2 && L.rows[0].d === '2026-11-28' && L.rows[0].left[2] === '오타' && L.rows[1].d === '2026-11-27', '3', '목록은 최신이 앞 · 이상한 줄은 빠짐');
let bad1 = call('adm_checkReports', ['없는열쇠']); bad1 = bad1.out || bad1;
rep(!bad1.ok && !bad1.rows, '4', '관리자 로그인 없이는 못 봄');
setP('{깨진 글자');
d = call('adm_home', [tok, true]); d = d.out || d;
rep(d.ok && d.chk === null, '5', '속성이 깨져 있어도 홈은 그대로 열림');
const bad = R.filter((x) => !x[0]).length;
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
