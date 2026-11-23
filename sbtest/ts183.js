// (S183) 품앗이: 그날 출근하는 기사는 신청 · 확정 불가 + 품앗이 확정 · 취소 → 쿠팡 어드민 다시 반영 목록 · 관리자 알림 · [반영했어요]
//  사용: node sbtest/ts183.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-23T11:00:00+09:00')); // W1 마감(10시) 지남 → 쿠팡 어드민을 고칠 수 있는 첫 날 = 11/25
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '212D'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', W: '기사W', S: '관리S' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { if (o.name === '관리S') writeFields_(SH.DRIVERS, o._row, { title: '관리자' }); }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const APP = (jobId, who) => J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-27', value: '212A', old: '' }, { row: D.W, date: '2026-11-27', value: '212D', old: '' }, { row: D.B, date: '2026-11-27', value: '휴무', old: '' }, { row: D.P, date: '2026-11-24', value: '212A', old: '' }]]);
const ids = call('api_pmGive', [T.P, { date: '2026-11-27', codes: ['212A'] }]).ids;
// ── 출근하는 날은 신청 불가
const LW = call('api_pmList', [T.W, {}]);
const cw = (LW.jobs || []).find((j) => j.id === ids[0]) || {};
ok(cw.work === '212D', '1 목록 카드에 그날 내 출근 칸 표시 (' + cw.work + ')');
let r = call('api_pmApplyMany', [T.W, ids, '']);
ok(!r.ok && /출근하는 날/.test(r.msg) && /212D/.test(r.msg), '2 출근하는 날 신청 → 막힘 (' + r.msg + ')');
r = call('api_pmApply', [T.W, ids[0], '']);
ok(!r.ok && /출근하는 날/.test(r.msg), '3 한 코드 신청도 막힘');
const LB = call('api_pmList', [T.B, {}]);
ok(!((LB.jobs || []).find((j) => j.id === ids[0]) || {}).work, '4 휴무인 기사는 표시 없음');
// 신청 뒤에 출근이 생기면 확정도 막힘
r = call('api_pmApplyMany', [T.B, ids, '']);
ok(r.ok, '5 휴무인 기사 신청 됨');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-27', value: '212B', old: '휴무' }]]);
r = call('api_pmPick', [T.P, [APP(ids[0], 'B')]]);
ok(!r.ok && /출근하는 날/.test(r.msg), '6 신청 뒤 출근이 생기면 확정 막힘 (' + r.msg + ')');
call('adm_schSave', [tok, [{ row: D.B, date: '2026-11-27', value: '휴무', old: '212B' }]]);
// ── 확정 → 쿠팡 어드민 다시 반영
r = call('api_pmPick', [T.P, [APP(ids[0], 'B')]]);
ok(r.ok, '7 확정 ' + (r.msg || ''));
let FX = call('adm_cpFixList', [tok]);
const f1 = (FX.list || [])[0] || {};
ok(FX.ok && FX.list.length === 1 && f1.op === 'set' && f1.date === '2026-11-27' && f1.outLogin === 'ppm01' && f1.innLogin === 'bpm01' && /212A/.test(f1.text) && /11\/26\(목\) 10:00/.test(f1.text), '8 확정 → 쿠팡 어드민 수정 한 줄: ' + f1.text);
ok(f1.due === '2026-11-26 10:00', '9 마감 = 업무 전날 오전 10시 (' + f1.due + ')');
const q = J("JSON.parse(props_()[PUSH_Q.PROP] || '[]').concat([]).filter(function (a) { return a.kind === 'cpfix'; }).map(function (a) { return a.name; })");
const plog = J("readAll_(SH.PLOG).filter(function (o) { return o.kind === 'cpfix'; }).map(function (o) { return o.name; })");
ok(q.concat(plog).includes('관리S') && !q.concat(plog).includes('기사B'), '10 관리자(직함)에게만 휴대폰 알림 (' + q.concat(plog).join(',') + ')');
r = call('adm_cpFixDone', [tok, [f1.id]]);
FX = call('adm_cpFixList', [tok]);
ok(r.ok && r.n === 1 && FX.list.length === 0, '11 [반영했어요] → 목록에서 빠짐');
// 반영 뒤 확정 풀기 → 다시 반영 줄 (취소)
r = call('api_pmDecide', [T.P, ids[0], J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + ids[0] + "' && a.status === '확정'; })[0].id"), 'back']);
FX = call('adm_cpFixList', [tok]);
ok(r.ok && FX.list.length === 1 && FX.list[0].op === 'clear' && FX.list[0].outLogin === 'bpm01', '12 반영 뒤 확정 풀기 → 취소 줄: ' + ((FX.list[0] || {}).text || r.msg));
call('adm_cpFixDone', [tok, 'all']);
// 반영 전에 확정 → 풀기 = 둘 다 끝 (반영할 것 없음)
call('api_pmPick', [T.P, [J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + ids[0] + "' && a.driverId === '" + D.B + "' && (a.status === '지원' || a.status === '협의 중'); })[0].id")]]);
const n1 = call('adm_cpFixList', [tok]).list.length;
call('api_pmDecide', [T.P, ids[0], J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + ids[0] + "' && a.status === '확정'; })[0].id"), 'back']);
FX = call('adm_cpFixList', [tok]);
ok(n1 === 1 && FX.list.length === 0, '13 반영 전에 확정이 풀리면 줄이 없어짐 (' + n1 + ' → ' + FX.list.length + ')');
// 쿠팡 어드민 마감이 지난 날(11/24)은 만들지 않음
const ids2 = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A'] }]).ids;
call('api_pmApplyMany', [T.B, ids2, '']); call('api_pmPick', [T.P, [APP(ids2[0], 'B')]]);
FX = call('adm_cpFixList', [tok]);
ok(!FX.list.some((x) => x.date === '2026-11-24') && J("readAll_(SH.CPFIX).filter(function (o) { return o.date === '2026-11-24'; }).length") === 0, '14 마감이 지난 날(11/24)은 만들지 않음');
// '주는 기사 아이디' 일감은 쿠팡 쪽이 그대로라 만들지 않음
ev("readAll_(SH.PJOB).forEach(function (o) { if (o.id === '" + ids[0] + "') writeFields_(SH.PJOB, o._row, { useId: '주는 기사 아이디' }); }); pmTouch_(); 1");
call('api_pmPick', [T.P, [J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + ids[0] + "' && a.driverId === '" + D.B + "' && (a.status === '지원' || a.status === '미선정'); })[0].id")]]);
FX = call('adm_cpFixList', [tok]);
ok(FX.list.length === 0, '15 주는 기사 아이디 일감은 만들지 않음 (' + FX.list.length + ')');
// (S184) 받은 기사 칸에 그 품앗이 노선을 미리 적어 둔 경우는 막지 않음 · 다른 노선이면 막음
ok(J("pmWorkClash_('103AB', { route: '103AB' })") === '' && J("pmWorkClash_('103A', { route: '103AB' })") === '' && J("pmWorkClash_('212B', { route: '212A' })") === '212B' && J("pmWorkClash_('출근', { route: '212A' })") === '출근', '16 칸이 바로 그 품앗이 노선이면 출근으로 안 봄');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
