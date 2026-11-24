// (S200) 「출근」 칸 기사가 코드별 일감(204A·204B·204C)을 맡기면 칸에서 맡긴 코드를 뺌 (다 맡기면 휴무) · [반영했어요] → 품앗이 두 기사에게 반영 완료 알림
//  사용: node sbtest/ts200.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-25T08:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: 'F_삼성1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['204A', '204B', '204C'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { G: '김기화X', O: '김도윤X', H: '맡긴H' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'cx01', driverType: k === 'O' ? '백업' : '고정', phone: '010-4900-10' + (10 + i), schCampId: CAMP, baseRoute: k === 'O' ? '' : '204ABC' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const APP = (jobId, who) => J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id");
const cell = (who, dt) => J("schCellsOf_('" + D[who] + "', ['" + dt + "'])['" + dt + "'] || ''");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.G, date: '2026-11-30', value: '출근', old: '' }, { row: D.O, date: '2026-11-30', value: '휴무', old: '' }, { row: D.H, date: '2026-12-01', value: '출근', old: '' }, { row: D.O, date: '2026-12-01', value: '휴무', old: '' }]]);
// 다 맡김
const ids = call('api_pmGive', [T.G, { date: '2026-11-30', codes: ['204A', '204B', '204C'] }]).ids || [];
call('api_pmApplyMany', [T.O, ids, '']);
let r = call('api_pmPick', [T.G, ids.map((j) => APP(j, 'O'))]);
ok(r.ok && /휴무/.test(cell('G', '2026-11-30')), '1 「출근」 칸에서 204A·204B·204C 를 다 맡기면 휴무 (' + cell('G', '2026-11-30') + ')');
const up = JSON.stringify(call('adm_schUploadTable', [tok, '2026-11-30', '4w']));
ok(!/gcx01/.test(up) && /ocx01/.test(up), '2 업로드 테이블: 맡긴 기사 빠지고 받은 기사만');
// 일부만 맡김
const ids2 = call('api_pmGive', [T.H, { date: '2026-12-01', codes: ['204A', '204B'] }]).ids || [];
call('api_pmApplyMany', [T.O, ids2, '']);
r = call('api_pmPick', [T.H, ids2.map((j) => APP(j, 'O'))]);
const ch = cell('H', '2026-12-01');
ok(r.ok && /204C/.test(ch) && !/204A|204B|출근/.test(ch), '3 일부만 맡기면 남은 코드만 (' + ch + ')');
// [반영했어요] → 두 기사에게 알림 한 건씩
const FX = call('adm_cpFixList', [tok]).list || [];
const n0 = J("readAll_(SH.PALERT).filter(function (a) { return a.kind === 'cpdone'; }).length + JSON.parse(props_()[PUSH_Q.PROP] || '[]').filter(function (a) { return a.kind === 'cpdone'; }).length");
r = call('adm_cpFixDone', [tok, FX.filter((x) => x.date === '2026-11-30').reduce((a, x) => a.concat(x.ids), [])]);
const al = J("readAll_(SH.PALERT).filter(function (a) { return a.kind === 'cpdone'; }).map(function (a) { return a.name + '|' + a.text; }).concat(JSON.parse(props_()[PUSH_Q.PROP] || '[]').filter(function (a) { return a.kind === 'cpdone'; }).map(function (a) { return a.name + '|' + a.text; }))");
ok(r.ok && al.length - n0 >= 2 && al.some((x) => /^김기화X\|/.test(x)) && al.some((x) => /^김도윤X\|.*204ABC.*반영/.test(x)) && al.filter((x) => /^김도윤X/.test(x)).length === 1, '4 [반영했어요] → 맡긴 · 받은 기사에게 「반영 완료」 한 건씩 (' + al.join(' / ').slice(0, 200) + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
