// (S199) 코드별 품앗이 일감을 한 사람이 다 맡으면 「212ABC」 한 줄로 (쿠팡 어드민 수정 목록 · 관리자 알림 · 기사스케줄 표시) · 나눠 맡으면 사람마다
//  사용: node sbtest/ts199.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-23T11:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '212C'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { G: '맡긴G', O: '받는O', P: '받는P', S: '관리S' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'abc01', driverType: '고정', phone: '010-4800-10' + (10 + i), schCampId: CAMP, baseRoute: k === 'G' ? '212ABC' : '' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { if (o.name === '관리S') writeFields_(SH.DRIVERS, o._row, { title: '관리자' }); }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const APP = (jobId, who) => J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
ok(J("pmCodesJoin_(['212A','212B','212C'])") === '212ABC' && J("pmCodesJoin_(['212C','212A'])") === '212AC' && J("pmCodesJoin_(['212A','301B'])") === '212A,301B', '1 코드 합치기');
const sched = (dt) => call('adm_schSave', [tok, [{ row: D.G, date: dt, value: '212ABC', old: '' }, { row: D.O, date: dt, value: '휴무', old: '' }, { row: D.P, date: dt, value: '휴무', old: '' }]]);
const pushN = () => J("JSON.parse(props_()[PUSH_Q.PROP] || '[]').filter(function (a) { return a.kind === 'cpfix' && a.name === '관리S'; }).length + readAll_(SH.PLOG).filter(function (o) { return o.kind === 'cpfix' && o.name === '관리S'; }).length");
// 한 사람이 다 맡음 (11/27)
sched('2026-11-27');
const ids = call('api_pmGive', [T.G, { date: '2026-11-27', codes: ['212A', '212B', '212C'] }]).ids || [];
call('api_pmApplyMany', [T.O, ids, '']);
const p0 = pushN();
let r = call('api_pmPick', [T.G, ids.map((j) => APP(j, 'O'))]);
let FX = call('adm_cpFixList', [tok]).list || [];
ok(r.ok && FX.length === 1 && FX[0].route === '212ABC' && FX[0].ids.length === 3 && / 212ABC · /.test(FX[0].text), '2 쿠팡 어드민 수정 목록: 한 줄 「212ABC」 (' + FX.map((x) => x.route + ':' + x.ids.length).join(',') + ')');
ok(pushN() - p0 === 1, '3 관리자 알림도 한 건 (' + (pushN() - p0) + ')');
r = call('adm_cpFixDone', [tok, FX[0].ids]);
ok(r.ok && !(call('adm_cpFixList', [tok]).list || []).length, '4 [반영했어요] 한 번에 세 건 모두');
// 나눠 맡음 (11/28): O = 212A · 212B , P = 212C
sched('2026-11-28');
const ids2 = call('api_pmGive', [T.G, { date: '2026-11-28', codes: ['212A', '212B', '212C'] }]).ids || [];
call('api_pmApplyMany', [T.O, ids2.slice(0, 2), '']); call('api_pmApplyMany', [T.P, ids2.slice(2), '']);
r = call('api_pmPick', [T.G, ids2.slice(0, 2).map((j) => APP(j, 'O')).concat([APP(ids2[2], 'P')])]);
FX = (call('adm_cpFixList', [tok]).list || []).filter((x) => x.date === '2026-11-28');
const rs = FX.map((x) => x.route + '→' + x.inn).sort().join(',');
ok(r.ok && rs === '212AB→받는O,212C→받는P', '5 나눠 맡으면 사람마다 따로 (' + rs + ')');
const A = require('fs').readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), I = require('fs').readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/return pmGroupTips\(list, me\)\.map\(\(g\) => g\.who \+ \(g\.route \? ' ' \+ g\.route : ''\) \+ '\\n품앗이 ' \+ \(g\.give \? '맡김' : '받음'\)\)/.test(A), '6 관리자 기사스케줄 칸: 사람별 한 줄 + 합친 코드');
ok(/html: pmGroupDay\(ok\)\.map/.test(I), '7 기사앱 달력 칩도 합침');
ok(/data-cpf-done="' \+ esc\(\(x\.ids \|\| \[x\.id\]\)\.join\(','\)\)/.test(A), '8 관리자 [반영했어요]가 합친 건 모두 처리');
// 화면 코드가 문법 오류 없이 읽히는지 (S199 중간에 한 줄 주석으로 관리자앱이 하얗게 된 적 있음)
{ const vm = require('vm'); let se = '';
  [['Admin.html', A], ['Index.html', I]].forEach(([f, h]) => { const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(h))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += f + ': ' + e.message + ' '; } } });
  ok(!se, '9 관리자앱 · 기사앱 화면 코드 문법 ' + se); }
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
