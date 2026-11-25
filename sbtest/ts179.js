// (S179) 품앗이: 같은 날 같은 기사 이름의 사무실 일감(선착순)과 기사가 맡긴 일감(고르기)은 다른 카드 · 섞어서 지원하면 막힘
//  사용: node sbtest/ts179.js <runner-allinone 폴더>
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
const JOB = (id) => J("(function () { var j = readAll_(SH.PJOB).filter(function (x) { return x.id === '" + id + "'; })[0]; return { st: j.status, acc: j.accepted || '' }; })()");
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-27', value: '210ABC', old: '' }]]);
const off = call('adm_pmCreate', [tok, { posterId: D.P, kind: '야간', date: '2026-11-27', campId: CAMP, route: '210B', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'open', okLow: true }]);
const g = call('api_pmGive', [T.P, { date: '2026-11-27' }]); // (S205) 노선 통째로 → 사무실이 먼저 등록한 210B 를 뺀 210AC
const L = call('api_pmList', [T.B, {}]).jobs;
const ga = L.find((j) => j.id === g.ids[0]), gb = L.find((j) => j.id === off.id);
ok(ga && gb && ga.route === '210AC' && ga.grp !== gb.grp, '1 기사가 맡긴 210AC 와 사무실이 등록한 210B 는 다른 카드 (' + (ga && ga.grp) + ' / ' + (gb && gb.grp) + ')');
let r = call('api_pmApplyMany', [T.B, [g.ids[0], off.id], '']);
ok(r.ok === false && /같은 일감 카드/.test(r.msg || ''), '2 섞어서 한 번에 지원하면 막힘');
r = call('api_pmApplyMany', [T.B, [g.ids[0]], '']);
ok(r.ok && !r.confirmed && JOB(g.ids[0]).st === '모집 중', '3 기사가 맡긴 210A 는 신청만 (맡긴 기사가 고름)');
r = call('api_pmApplyMany', [T.C, [off.id], '']);
ok(r.ok && r.confirmed && JOB(off.id).st === '배차 확정', '4 사무실 210B 는 지원하면 바로 확정');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
