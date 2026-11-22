// (S165) 품앗이 내부용 코드별 맡기기: 내 스케줄 라우트 자동 · 코드마다 일감 · 받는 기사가 코드 골라 선착순 · 같은 기사 코드 여러 개 · 야간만 · 자격증 조건 없음 · 탑은 차명으로
//  사용: node sbtest/ts165.js <runner-allinone 폴더>
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


let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-24', value: '212AB', old: '' }]]);
let q = call('api_pmQuick', [T.P]);
const day = q.ok && q.days.find((x) => x.date === '2026-11-24');
ok(day && day.codes.map((c) => c.code).join(',') === '212A,212B', '1 내 스케줄 라우트가 코드별로 (' + JSON.stringify(day && day.codes.map((c) => c.code)) + ')');
ok(q.days.length === 1, '1b 스케줄 칸이 빈 날은 안 나옴 (' + q.days.length + '일)');
ok(q.top === '하이탑' && q.car === '봉고3 하이탑', '2 탑은 차명으로 추정 (' + q.top + ')');
let r = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A', '212B'], time: '21:30', memo: '잘 부탁' }]);
ok(r.ok && r.count === 2, '3 코드마다 일감 하나씩 (' + (r.count || r.msg) + ')');
const jobs = r.ok ? r.ids.map((id) => J("pmJobById_('" + id + "')")) : [];
ok(jobs.length === 2 && jobs.every((j) => j.kind === '야간' && j.time === '21:30' && j.top === '하이탑' && j.pay === '러너 정산서' && j.useId === '받는 기사 아이디' && j.desc === '잘 부탁') && jobs.map((j) => j.route).join(',') === '212A,212B', '4 야간 · 입차시간 · 탑 · 러너 정산서 · 받는 기사 아이디 · 한마디');
r = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A'] }]);
ok(r.ok === false, '5 이미 맡긴 코드는 다시 못 맡김 (' + (r.msg || '') + ')');
r = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['213A'] }]);
ok(r.ok === false, '6 내 스케줄에 없는 코드는 못 맡김 (' + (r.msg || '') + ')');
r = call('api_pmApply', [T.B, jobs[0].id, '']);
ok(r.ok && r.confirmed, '7 자격증 번호 없어도 맡음 · 선착순 바로 확정 (' + (r.msg || '') + ')');
r = call('api_pmApply', [T.B, jobs[1].id, '']);
ok(r.ok && r.confirmed, '8 같은 기사가 맡긴 그날 다른 코드도 맡을 수 있음 (' + (r.msg || '') + ')');
r = call('api_pmApply', [T.C, jobs[1].id, '']);
ok(r.ok === false, '9 이미 맡은 코드는 다른 기사가 못 맡음');
q = call('api_pmQuick', [T.P]);
const d2 = q.days.find((x) => x.date === '2026-11-24');
ok(d2 && d2.codes.every((c) => c.given === '배차 확정'), '10 맡기기 화면에 이미 맡김 · 배차 확정 표시 ' + JSON.stringify(d2 || q.days.map((x) => x.date)) + ' 칸=' + J("schCellsOf_('" + D.P + "', ['2026-11-24'])")['2026-11-24']);
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-26', value: '212AB', old: '' }]]);
r = call('api_pmGive', [T.P, { date: '2026-11-26', codes: ['212A'], price: '1300' }]);
ok(r.ok && J("pmJobById_('" + r.ids[0] + "')").price == 1300, '10b 단가는 맡기는 기사가 정함 (1,300원)');
r = call('api_pmGive', [T.P, { date: '2026-11-26', codes: ['212B'], price: '0' }]);
ok(r.ok === false, '10c 단가 0 은 막힘 (' + (r.msg || '') + ')');
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-27', value: '212A', old: '' }]]);
r = call('api_pmGive', [T.P, { date: '2026-11-27', codes: ['212A'], price: '1000' }]);
ok(r.ok === false && r.code === 'LOW' && /1,100원보다 낮습니다/.test(r.msg), '10d (S168) 1,100원보다 낮으면 먼저 확인 (' + (r.msg || '') + ')');
r = call('api_pmGive', [T.P, { date: '2026-11-27', codes: ['212A'], price: '1000', okLow: true }]);
ok(r.ok && J("pmJobById_('" + r.ids[0] + "')").price == 1000, '10e 확인하면 그 단가로 올라감');
// 운영자(직함)도 같은 방식
ev("writeFields_(SH.DRIVERS, findRow_(SH.DRIVERS, 'id', '" + D.C + "'), { title: '운영자' }); 1");
call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-25', value: '212B', old: '' }]]);
q = call('api_pmQuick', [T.C]);
ok(q.ok && q.days.some((x) => x.date === '2026-11-25' && x.codes[0].code === '212B'), '11 운영자도 내 스케줄 라우트로 맡기기');
// 근무 가능일도 자격증 없이
r = call('api_pmAvailSave', [T.B, [{ date: '2026-11-28', kind: '야간' }], '', {}]);
ok(r.ok && r.count === 1, '12 자격증 번호 없어도 근무 가능일 저장 (' + (r.msg || '') + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
