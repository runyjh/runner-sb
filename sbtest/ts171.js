// (S171) 품앗이로 받은 코드는 (내 스케줄 칸에 같이 적혀 있어도) 다시 맡길 수 없음 — 기존 스케줄 가져오기(A안)로 받은 사람 칸에도 노선이 들어간 경우
//  사용: node sbtest/ts171.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '', carName: o.name === '기사P' ? '봉고3 하이탑' : '포터2' }); }); 1"); // 자격증 번호 없음
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });




const PICK = (pt, jobId, who) => call('api_pmPick', [pt, [J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id")]]); // (S176) 선착순 없음 → 맡긴 기사가 고름
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-24', value: '212AB', old: '' }]]);
const ids = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A'] }]).ids;
call('api_pmApply', [T.B, ids[0], '']); PICK(T.P, ids[0], 'B');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-24', value: '212A', old: '' }]]); // 받은 사람 본인 칸에도 212A
const q = call('api_pmQuick', [T.B]);
ok(!q.days.some((x) => x.date === '2026-11-24'), '1 받은 코드만 있는 날은 맡기기 목록에 안 나옴');
let r = call('api_pmGive', [T.B, { date: '2026-11-24', codes: ['212A'] }]);
ok(r.ok === false && /품앗이로 받은 코드/.test(r.msg || ''), '2 받은 코드를 다시 맡기면 막힘 (' + (r.msg || '').slice(0, 40) + ')');
r = call('api_pmSave', [T.B, { kind: '야간', date: '2026-11-24', campId: CAMP, route: '212A', price: 1100, okLow: true }]);
ok(r.ok === false && /품앗이로 받은 코드/.test(r.msg || ''), '3 예전 올리기 화면으로도 막힘');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-25', value: '212A', old: '' }]]);
r = call('api_pmGive', [T.B, { date: '2026-11-25', codes: ['212A'] }]);
ok(r.ok === true, '4 다른 날(받은 게 없는 날) 내 노선은 그대로 맡길 수 있음');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
