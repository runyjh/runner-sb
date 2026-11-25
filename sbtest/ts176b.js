// (S176) 품앗이: 코드 묶음 지원 · 맡긴 기사가 고르기 · 같은 날 다른 지원 자동 취소 · 알림 묶기 · 기사 제안 막기 · 사무실 겹침 · 다시 알림
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
['212A', '212B', '210A', '210B', '210C', '210D'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', Q: '기사Q', R: '기사R', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '', carName: o.name === '기사P' ? '봉고3 하이탑' : '포터2' }); }); 1"); // 자격증 번호 없음
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const AL = (who) => J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D[who] + "'; }).map(function (a) { return a.kind + '|' + a.text; })");
const JOB = (id) => J("(function () { var j = readAll_(SH.PJOB).filter(function (x) { return x.id === '" + id + "'; })[0]; return { st: j.status, acc: j.accepted || '' }; })()");
const APPS = (who) => J("readAll_(SH.PAPP).filter(function (a) { return a.driverId === '" + D[who] + "'; }).map(function (a) { return a.jobId + '|' + a.status; })");
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-27', value: '210ABC', old: '' }, { row: D.Q, date: '2026-11-27', value: '212A', old: '' }, { row: D.R, date: '2026-11-27', value: '212B', old: '' }]]);
// (S205) 기사앱은 이제 노선 통째로 1건 → 예전 방식(코드마다 일감)으로 이미 올라가 있던 자료를 그대로 넣어, 묶음 카드 · 코드별 확정 처리가 계속 맞는지 본다
const g = (function () { const ids = J("(function () { var me = readAll_(SH.DRIVERS).filter(function (d) { return d.id === '" + D.P + "'; })[0], c = master_().camps[0], now = nowText_(), ids = []; ['210A', '210B', '210C'].forEach(function (x) { var id = uniqId_('J'); ids.push(id); appendObjs_(SH.PJOB, [{ id: id, status: PST.OPEN, posterId: me.id, poster: me.name, kind: '야간', date: '2026-11-27', time: '21:30', area: c.name, campId: c.id, camp: c.name, route: x, qty: '', top: '', price: 1100, pay: PM_PAY_DEF, desc: '', secret: '', attach: '', useId: '받는 기사 아이디', createdAt: now, updatedAt: now }]); }); pmTouch_(); return ids; })()"); return { ok: true, ids }; })();
ok(g.ok && g.ids.length === 3, '1 코드별로 세 일감');
const [JA, JB, JC] = g.ids;
const L = call('api_pmList', [T.B, {}]);
const grp = L.jobs.filter((j) => g.ids.includes(j.id)).map((j) => j.grp);
ok(grp.length === 3 && new Set(grp).size === 1, '2 세 코드가 같은 묶음 열쇠');
let r = call('api_pmApplyMany', [T.B, [JA, JB, JC], '셋 다 가능']);
ok(r.ok && !r.confirmed && JOB(JA).st === '모집 중', '3 묶음 지원 → 확정 안 되고 모집 중 그대로');
let a = AL('P').filter((x) => x.startsWith('apply|'));
ok(a.length === 1 && /210ABC/.test(a[0]) && /골라 주세요/.test(a[0]), '4 맡긴 기사에게 알림 한 번 (코드 묶어서) ' + (a[0] || '').slice(0, 60));
r = call('api_pmApply', [T.C, JA, '']);
ok(r.ok && !r.confirmed && JOB(JA).st === '모집 중', '5 예전 앱 한 건 지원도 선착순 확정 안 됨');
const g2 = call('api_pmGive', [T.Q, { date: '2026-11-27', codes: ['212A'] }]);
r = call('api_pmApplyMany', [T.B, [JA, g2.ids[0]], '']);
ok(r.ok === false && /같은 일감 카드/.test(r.msg || ''), '6 다른 카드 코드를 섞으면 막힘');
r = call('api_pmApplyMany', [T.B, [g2.ids[0]], '']);
ok(r.ok, '7 같은 날 다른 기사(Q) 일감에도 지원 가능 (맡긴 기사 2명까지)');
const g3 = call('api_pmGive', [T.R, { date: '2026-11-27', codes: ['212B'] }]);
r = call('api_pmApplyMany', [T.B, [g3.ids[0]], '']);
ok(r.ok === false && /2명의 일감까지/.test(r.msg || ''), '8 세 번째 기사 일감은 막힘 (' + (r.msg || '').slice(0, 30) + ')');
r = call('api_pmApplyMany', [T.B, [JA], '']);
ok(r.ok === false && /이미 지원/.test(r.msg || ''), '9 이미 지원한 코드는 다시 안 됨');
let M = call('api_pmMine', [T.P, 'posted']);
const ca = M.jobs.find((j) => j.id === JA);
ok(ca && ca.apps.length === 2 && ca.apps.every((x) => x.busy === false) && ca.grp === grp[0], '10 맡긴 기사 화면: 코드마다 지원자 · 묶음 열쇠');
const appOf = (jid, who) => M.jobs.find((j) => j.id === jid).apps.find((x) => x.name === NM[who]).id;
r = call('api_pmPick', [T.B, [appOf(JA, 'C')]]);
ok(r.ok === false && /내가 맡긴 일감만/.test(r.msg || ''), '11 남의 일감 지원자는 못 고름');
r = call('api_pmPick', [T.P, [appOf(JA, 'C'), appOf(JA, 'B')]]);
ok(r.ok === false && /두 기사님/.test(r.msg || '') && JOB(JA).st === '모집 중', '12 한 코드에 두 사람을 고르면 막히고 아무것도 안 바뀜');
r = call('api_pmPick', [T.P, [appOf(JA, 'C'), appOf(JB, 'B'), appOf(JC, 'B')]]);
ok(r.ok && r.count === 3, '13 A는 C · B와 C는 B로 한 번에 확정');
ok(JOB(JA).acc === '기사C' && JOB(JB).acc === '기사B' && JOB(JC).acc === '기사B' && JOB(JA).st === '배차 확정', '14 코드마다 맡은 사람이 맞음');
a = AL('B').filter((x) => x.startsWith('accept|'));
ok(a.length === 1 && /210BC/.test(a[0]), '15 B 에게 확정 알림 한 번 (210BC · S202 코드 합침) ' + (a[0] || '').slice(0, 50));
ok(AL('B').some((x) => x.startsWith('lost|') && /210A/.test(x)), '16 B 는 A 미선정 알림');
ok(APPS('B').includes(g2.ids[0] + '|지원 취소'), '17 B 가 Q 일감에 넣은 지원은 자동 취소');
ok(AL('B').some((x) => x.startsWith('withdrawn|')) && AL('Q').some((x) => x.startsWith('cancel|') && /기사B/.test(x)), '18 B 와 Q 에게 자동 취소 알림');
r = call('api_pmPick', [T.P, [appOf(JA, 'B')]]);
ok(r.ok === false && /이미 .*확정/.test(r.msg || ''), '19 이미 확정된 코드는 다시 못 고름');
const cell = J("schCellsOf_('PM" + D.B + "', ['2026-11-27'])");
const pmRow = J("(function(){ var h = schHeader_(), sh = schSheet_(), ids = sh.getRange(2, h.fixed['행ID'] + 1, sh.getLastRow() - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === 'PM" + D.B + "') return String(sh.getRange(i + 2, h.dates['2026-11-27'] + 1).getValue()); return ''; })()");
ok(/210B/.test(pmRow) && /210C/.test(pmRow), '20 B 의 품앗이 줄에 210B · 210C (' + pmRow.replace(/\n/g, ' / ') + ')');
// 같은 기사(P)의 다른 코드를 C 도 맡을 수 있음 → 이미 A 확정, B 에 지원은 확정된 사람 있으니 불가. 대신 Q 일감: C 는 P 일감이 확정됐으므로 Q 확정 시 막힘
r = call('api_pmApplyMany', [T.C, [g2.ids[0]], '']);
ok(r.ok === false && /이미 배차 확정/.test(r.msg || ''), '21 C 는 그날 P 일감이 확정돼 다른 기사 일감 지원 불가');
// 취소 묶음
const P0 = AL('P').length;
r = call('api_pmCancelMany', [T.B, [JB, JC]]);
ok(r.ok && JOB(JB).st === '모집 중' && JOB(JC).st === '모집 중', '22 B 가 두 코드 한 번에 취소 → 모집 중');
a = AL('P').slice(P0);
ok(a.length === 1 && /210BC/.test(a[0]) && /기사B 기사님/.test(a[0]), '23 P 에게 취소 알림 한 번 ' + (a[0] || '').slice(0, 50));
const pmRow2 = J("(function(){ var h = schHeader_(), sh = schSheet_(), ids = sh.getRange(2, h.fixed['행ID'] + 1, sh.getLastRow() - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === 'PM" + D.B + "') return String(sh.getRange(i + 2, h.dates['2026-11-27'] + 1).getValue()); return ''; })()");
ok(!/210B|210C/.test(pmRow2), '24 B 품앗이 줄에서 지워짐');
// 기사 제안 막기
r = call('api_pmSave', [T.P, { kind: '야간', date: '2026-11-28', campId: CAMP, route: '210D', price: 1100, offerToId: D.B, okLow: true }]);
ok(r.ok === false && /제안은 없어졌/.test(r.msg || ''), '25 기사끼리 제안은 막힘');
// 사무실 겹침
r = call('adm_pmCreate', [tok, { posterId: D.P, kind: '야간', date: '2026-11-27', campId: CAMP, route: '210AB', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'open', okLow: true }]);
ok(r.ok === false && /이미 품앗이로 맡겼/.test(r.msg || ''), '26 사무실이 겹치는 코드로 등록하면 막힘 (' + (r.msg || '').slice(0, 40) + ')');
r = call('adm_pmCreate', [tok, { posterId: D.P, kind: '야간', date: '2026-11-27', campId: CAMP, route: '210D', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'open', okLow: true }]);
ok(r.ok, '27 안 겹치는 코드는 사무실 등록 됨 ' + (r.msg || ''));
// 사무실 모집 일감은 선착순 그대로 · (S183) 그날 출근하는 기사는 신청 불가 → R 은 그날 휴무로
const offId = r.id; call('adm_schSave', [tok, [{ row: D.R, date: '2026-11-27', value: '휴무', old: '212B' }]]);
r = call('api_pmApplyMany', [T.R, [offId], '']);
ok(r.ok && r.confirmed, '28 사무실 일감은 지원하면 바로 확정 (선착순) ' + (r.msg || ''));
// 사무실 제안은 그대로
call('adm_schSave', [tok, [{ row: D.Q, date: '2026-11-29', value: '212A', old: '' }]]);
r = call('adm_pmCreate', [tok, { posterId: D.Q, kind: '야간', date: '2026-11-29', campId: CAMP, route: '212A', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'offer', toId: D.C, okLow: true }]);
const or = call('api_pmOfferReply', [T.C, r.id, true]);
ok(r.ok && or.ok && JOB(r.id).st === '배차 확정', '29 사무실 제안 → 기사 수락 → 확정');
// 다시 알림: 11/25 18시 → 11/27 배차(내일 밤 입차)에 고르지 않은 지원
call('api_pmApplyMany', [T.C, [JB], '']).ok;
KDate.__setClock(() => Date.parse('2026-11-25T18:05:00+09:00'));
const before = AL('P').length;
ev("firstRunNotify(); 1");
a = AL('P').slice(before).filter((x) => x.startsWith('remind|'));
ok(a.length === 1 && /내일 밤 입차/.test(a[0]) && /210B/.test(a[0]), '30 저녁 다시 알림 (내일 밤 입차) ' + (a[0] || '').slice(0, 60));
ok(!AL('R').some((x) => x.startsWith('remind|')), '31 지원자 없는 일감 · 사무실 일감은 알림 없음');
KDate.__setClock(() => Date.parse('2026-11-26T07:01:00+09:00'));
const b2 = AL('P').length;
ev("pushQuietFlush(); 1");
a = AL('P').slice(b2).filter((x) => x.startsWith('remind|'));
ok(a.length === 1 && /오늘 밤 입차/.test(a[0]), '32 아침 다시 알림 (오늘 밤 입차)');
const AD = call('adm_pmList', [tok, {}]);
ok(AD.jobs.find((j) => j.id === JB).unpicked === true && AD.jobs.find((j) => j.id === JA).unpicked === false, '33 관리자 목록에 고르지 않음 표시 (확정된 코드는 아님)');
// 사무실 대행 고르기
const capp = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + JB + "' && a.status === '지원'; })[0].id");
r = call('adm_pmAction', [tok, JB, 'accept', capp]);
ok(r.ok && JOB(JB).st === '배차 확정' && JOB(JB).acc === '기사C', '34 사무실이 대신 골라 확정 (관리자앱)');
ok(AL('P').some((x) => x.startsWith('admin|')), '35 맡긴 기사에게 사무실 처리 알림');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
